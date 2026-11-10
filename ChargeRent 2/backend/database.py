import os
import sys
import sqlite3
import hashlib
import datetime

# Vendored paketlerin (bcrypt, pyjwt) öncelikli yüklenmesi
VENDOR_CANDIDATES = [
    os.path.join(os.path.dirname(__file__), "vendor"),
]
for v in VENDOR_CANDIDATES:
    if os.path.isdir(v) and v not in sys.path:
        sys.path.insert(0, v)

import bcrypt
from config import DATABASE_PATH

def get_db_path():
    return os.environ.get("DATABASE_PATH", DATABASE_PATH)

def get_connection():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def hash_password(password: str) -> str:
    """Parolayı bcrypt (tuzlu ve yavaş) algoritması ile şifreler."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_and_migrate_password(conn, user_id: int, password: str, stored_hash: str) -> bool:
    """
    Kullanıcı şifresini doğrular.
    Eğer şifre eski SHA-256 biçimindeyse ve doğrulama başarılı olursa,
    şeffaf bir şekilde bcrypt algoritmasıyla yeniden hash'leyip veritabanına kaydeder.
    """
    if not password or not stored_hash:
        return False

    # 1. bcrypt hash kontrolü ($2b$ veya $2a$)
    if stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$"):
        try:
            return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
        except Exception:
            return False

    # 2. Eski SHA-256 hash kontrolü (64 onaltılık karakter)
    if len(stored_hash) == 64:
        legacy_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
        if legacy_hash.lower() == stored_hash.lower():
            # Başarılı doğrulama: bcrypt'e yükselt
            new_hash = hash_password(password)
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user_id))
            conn.commit()
            return True

    return False

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Kullanıcılar tablosu
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('driver', 'host')),
        full_name TEXT NOT NULL,
        phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Sürücü profili
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS driver_profiles (
        user_id INTEGER PRIMARY KEY,
        car_model TEXT DEFAULT 'TOGG T10X',
        battery_capacity REAL DEFAULT 88.5,
        points_balance REAL DEFAULT 45.0,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)

    # 3. Ev Sahibi profili
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS host_profiles (
        user_id INTEGER PRIMARY KEY,
        bank_name TEXT DEFAULT 'Örnek Banka',
        iban TEXT DEFAULT 'TR00 0000 0000 0000 0000 0000 00',
        withdrawable_balance REAL DEFAULT 1650.00,
        is_superhost INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)

    # 4. İstasyonlar tablosu
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        address TEXT NOT NULL,
        district TEXT NOT NULL,
        power_kw REAL DEFAULT 22.0,
        socket_type TEXT DEFAULT 'Type 2',
        price_kwh REAL DEFAULT 7.50,
        is_available INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (host_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)

    # 5. Rezervasyonlar tablosu
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL,
        station_id INTEGER NOT NULL,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration_hours REAL DEFAULT 2.0,
        total_price REAL DEFAULT 150.00,
        status TEXT DEFAULT 'confirmed' CHECK(status IN ('pending', 'confirmed', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (station_id) REFERENCES stations (id) ON DELETE CASCADE
    )
    """)

    # 6. Para transferleri / çekim talepleri tablosu
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        transfer_type TEXT DEFAULT 'withdrawal' CHECK(transfer_type IN ('deposit', 'withdrawal', 'payout')),
        status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed')),
        iban TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)

    # 7. Kara listeye alınan belirteçler (Token Revocation / Logout)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS revoked_tokens (
        token TEXT PRIMARY KEY,
        revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
    )
    """)

    # Süresi dolmuş iptal kayıtlarını açılışta temizle
    cursor.execute("DELETE FROM revoked_tokens WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP")


    # --- ÖRNEK DEMO KULLANICILARI (example.com alan adı, bcrypt ile şifreli) ---
    # Demo 1: Örnek Ev Sahibi
    cursor.execute("SELECT id FROM users WHERE email = 'ornek.evsahibi@example.com'")
    row_host = cursor.fetchone()
    if not row_host:
        host_pass_hash = hash_password("OrnekEvSahibi!2026")
        cursor.execute("""
        INSERT INTO users (email, password_hash, role, full_name, phone)
        VALUES ('ornek.evsahibi@example.com', ?, 'host', 'Örnek Ev Sahibi', '+90 (555) 000-0001')
        """, (host_pass_hash,))
        host_id = cursor.lastrowid

        cursor.execute("""
        INSERT INTO host_profiles (user_id, bank_name, iban, withdrawable_balance, is_superhost)
        VALUES (?, 'Örnek Banka', 'TR00 0000 0000 0000 0000 0000 00', 1650.00, 1)
        """, (host_id,))

        cursor.execute("""
        INSERT INTO stations (host_id, title, address, district, power_kw, socket_type, price_kwh, is_available)
        VALUES (?, 'Kadıköy İstasyonu', 'Örnek Sk. No:1, Garaj kodu: #0000, Kadıköy / İstanbul', 'Kadıköy', 22.0, 'Type 2', 7.50, 1)
        """, (host_id,))

        cursor.execute("""
        INSERT INTO transfers (user_id, amount, transfer_type, status, iban)
        VALUES (?, 1650.00, 'withdrawal', 'completed', 'TR00 0000 0000 0000 0000 0000 00')
        """, (host_id,))
    else:
        host_id = row_host["id"]

    # Demo 2: Örnek Sürücü
    cursor.execute("SELECT id FROM users WHERE email = 'ornek.surucu@example.com'")
    row_driver = cursor.fetchone()
    if not row_driver:
        driver_pass_hash = hash_password("OrnekSurucu!2026")
        cursor.execute("""
        INSERT INTO users (email, password_hash, role, full_name, phone)
        VALUES ('ornek.surucu@example.com', ?, 'driver', 'Örnek Sürücü', '+90 (555) 000-0002')
        """, (driver_pass_hash,))
        driver_id = cursor.lastrowid

        cursor.execute("""
        INSERT INTO driver_profiles (user_id, car_model, battery_capacity, points_balance)
        VALUES (?, 'TOGG T10X', 88.5, 45.0)
        """, (driver_id,))

        # Örnek ev sahibinin istasyonuna rezervasyon
        cursor.execute("SELECT id FROM stations WHERE host_id = ?", (host_id,))
        demo_station = cursor.fetchone()
        if demo_station:
            cursor.execute("""
            INSERT INTO reservations (driver_id, station_id, start_time, duration_hours, total_price, status)
            VALUES (?, ?, CURRENT_TIMESTAMP, 2.0, 150.00, 'confirmed')
            """, (driver_id, demo_station["id"]))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Veritabanı şeması ve demo kullanıcıları başarıyla hazırlandı.")

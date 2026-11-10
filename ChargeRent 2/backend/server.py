import os
import sys
import json
import time
import re
import uuid
import datetime
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Vendored paketlerin (bcrypt, pyjwt) öncelikli yüklenmesi
VENDOR_CANDIDATES = [
    os.path.join(os.path.dirname(__file__), "vendor"),
]
for v in VENDOR_CANDIDATES:
    if os.path.isdir(v) and v not in sys.path:
        sys.path.insert(0, v)

import jwt
from config import (
    SECRET_KEY,
    API_PORT,
    CORS_ALLOWED_ORIGINS,
    API_BASE_URL,
    DEMO_MODE,
    TRUSTED_PROXY,
    COOKIE_SECURE,
    TEST_MODE
)
from database import (
    get_connection,
    hash_password,
    verify_and_migrate_password,
    init_db
)

# --- HIZ SINIRLANDIRICI (RATE LIMITER) ---
# IP başına dakikada maksimum 10 deneme
RATE_LIMIT_STORE = {}
RATE_LIMIT_LOCK = threading.Lock()
RATE_LIMIT_MAX = 10
RATE_LIMIT_WINDOW = 60  # saniye

def check_rate_limit(client_ip: str) -> bool:
    now = time.time()
    with RATE_LIMIT_LOCK:
        timestamps = RATE_LIMIT_STORE.get(client_ip, [])
        # Son 60 saniye içindeki denemeleri filtrele
        valid_timestamps = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]
        if len(valid_timestamps) >= RATE_LIMIT_MAX:
            RATE_LIMIT_STORE[client_ip] = valid_timestamps
            return False
        valid_timestamps.append(now)
        RATE_LIMIT_STORE[client_ip] = valid_timestamps
        return True

# --- IP + E-POSTA BİRLEŞİK HESAP KİLİTLEME (ACCOUNT LOCKOUT & EXPONENTIAL BACKOFF) ---
# Anahtar: f"{client_ip}:{email.lower()}"
# 5 başarısız denemeden sonra aynı IP'den o e-postaya kilit uygulanır; başka IP'den kilit sahibini dışarıda bırakmaz.
# Kilit süresi katlanarak artar: 60s -> 120s -> 240s -> 480s -> maks 900s (15 dk).
ACCOUNT_LOCKOUT_STORE = {}
ACCOUNT_LOCKOUT_LOCK = threading.Lock()
MAX_FAILED_ATTEMPTS = 5
MAX_LOCKOUT_DURATION = 15 * 60  # Üst sınır 15 dakika (900 saniye)
BASE_LOCKOUT_DURATION = 60      # Taban kilit süresi 60 saniye (1 dakika)

def _lockout_key(client_ip: str, email: str) -> str:
    return f"{client_ip.strip()}:{email.strip().lower()}"

def is_account_locked(client_ip: str, email: str) -> bool:
    now = time.time()
    key = _lockout_key(client_ip, email)
    with ACCOUNT_LOCKOUT_LOCK:
        record = ACCOUNT_LOCKOUT_STORE.get(key)
        if not record:
            return False
        locked_until = record.get("locked_until", 0)
        if locked_until > now:
            return True
        return False

def record_failed_attempt(client_ip: str, email: str):
    now = time.time()
    key = _lockout_key(client_ip, email)
    with ACCOUNT_LOCKOUT_LOCK:
        record = ACCOUNT_LOCKOUT_STORE.get(key, {"count": 0, "locked_until": 0})
        record["count"] += 1
        if record["count"] >= MAX_FAILED_ATTEMPTS:
            exponent = record["count"] - MAX_FAILED_ATTEMPTS
            duration = min(BASE_LOCKOUT_DURATION * (2 ** exponent), MAX_LOCKOUT_DURATION)
            record["locked_until"] = now + duration
        ACCOUNT_LOCKOUT_STORE[key] = record

def reset_account_lockout(client_ip_or_email: str, email: str = None):
    with ACCOUNT_LOCKOUT_LOCK:
        if email is None:
            arg = client_ip_or_email.strip().lower()
            if ":" in arg:
                ACCOUNT_LOCKOUT_STORE.pop(arg, None)
            else:
                keys_to_del = [k for k in ACCOUNT_LOCKOUT_STORE if k.endswith(f":{arg}") or k.startswith(f"{arg}:")]
                for k in keys_to_del:
                    ACCOUNT_LOCKOUT_STORE.pop(k, None)
                reset_email_throttle(arg)
        else:
            key = _lockout_key(client_ip_or_email, email)
            ACCOUNT_LOCKOUT_STORE.pop(key, None)
            reset_email_throttle(email)

# --- HESAP BAŞINA IP'DEN BAĞIMSIZ BAŞARISIZ GİRİŞ YAVAŞLATICI (GLOBAL PER-EMAIL THROTTLE) ---
# Kural: Bir e-posta için 1 saat içinde 20 başarısız deneme olursa,
# tüm IP'ler için o hesapta her deneme arasına 30 saniye bekleme koy (hesabı tamamen kilitleme).
# Mesajlar genel kalır ("E-posta veya şifre hatalı.").
EMAIL_THROTTLE_STORE = {}
EMAIL_THROTTLE_LOCK = threading.Lock()
EMAIL_THROTTLE_WINDOW = 3600    # 1 saat (3600 saniye)
EMAIL_THROTTLE_THRESHOLD = 20   # 20 başarısız deneme
EMAIL_THROTTLE_COOLDOWN = 30    # Denemeler arası 30 saniye bekleme süresi

def is_email_throttled(email: str) -> bool:
    now = time.time()
    norm_email = email.strip().lower()
    with EMAIL_THROTTLE_LOCK:
        record = EMAIL_THROTTLE_STORE.get(norm_email)
        if not record:
            return False
        # Son 1 saatteki başarısız denemeleri filtrele
        valid_ts = [t for t in record.get("timestamps", []) if now - t < EMAIL_THROTTLE_WINDOW]
        record["timestamps"] = valid_ts
        if len(valid_ts) >= EMAIL_THROTTLE_THRESHOLD:
            last_attempt = record.get("last_attempt", 0)
            if now - last_attempt < EMAIL_THROTTLE_COOLDOWN:
                return True
        return False

def record_email_failed_attempt(email: str):
    now = time.time()
    norm_email = email.strip().lower()
    with EMAIL_THROTTLE_LOCK:
        record = EMAIL_THROTTLE_STORE.get(norm_email, {"timestamps": [], "last_attempt": 0})
        valid_ts = [t for t in record.get("timestamps", []) if now - t < EMAIL_THROTTLE_WINDOW]
        valid_ts.append(now)
        record["timestamps"] = valid_ts
        record["last_attempt"] = now
        EMAIL_THROTTLE_STORE[norm_email] = record

def reset_email_throttle(email: str):
    norm_email = email.strip().lower()
    with EMAIL_THROTTLE_LOCK:
        EMAIL_THROTTLE_STORE.pop(norm_email, None)

# --- ÇEREZ BAŞLIĞI YARDIMCILARI ---
def build_auth_cookie(token: str, max_age: int = 86400) -> str:
    cookie = f"chargerent_token={token}; Path=/; Max-Age={max_age}; HttpOnly; SameSite=Lax"
    if COOKIE_SECURE:
        cookie += "; Secure"
    return cookie

def build_clear_cookie() -> str:
    cookie = "chargerent_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
    if COOKIE_SECURE:
        cookie += "; Secure"
    return cookie

# --- DOĞRULAMA REGEX VE KURALLARI ---
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def validate_email(email: str) -> bool:
    return bool(email and EMAIL_REGEX.match(email))

def validate_password(password: str) -> bool:
    return bool(password and len(password) >= 8)

def validate_full_name(full_name: str) -> bool:
    return bool(full_name and len(full_name.strip()) >= 2)

# --- JWT YARDIMCILARI ---
def create_jwt_token(user_id: int, email: str, role: str) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": str(user_id),
        "user_id": user_id,
        "email": email,
        "role": role,
        "iat": now,
        "jti": uuid.uuid4().hex,  # Her oturum belirteci için benzersiz tanımlayıcı
        "exp": now + datetime.timedelta(hours=24)  # 24 saat geçerli
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def decode_and_verify_token(token: str, conn) -> dict:
    # 1. Kara liste kontrolü
    cursor = conn.cursor()
    cursor.execute("SELECT token FROM revoked_tokens WHERE token = ?", (token,))
    if cursor.fetchone():
        raise jwt.InvalidTokenError("Belirteç geçersiz kılınmış (çıkış yapılmış).")

    # 2. İmza ve süre kontrolü
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    return payload


class ChargeRentAPIHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Düz metin şifrelerin veya hassas gövdelerin loglanmasını engelle
        # Yalnızca istemci IP, zaman damgası ve istek satırını standart biçimde logla
        sys.stderr.write(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {self.address_string()} - {format % args}\n")

    def _get_client_ip(self):
        # Güvenilir ters vekil sunucu desteği: Yalnızca TRUSTED_PROXY=true iken X-Forwarded-For okunur
        if TRUSTED_PROXY:
            forwarded = self.headers.get("X-Forwarded-For")
            if forwarded:
                return forwarded.split(",")[0].strip()
        return self.client_address[0]

    def _set_cors_headers(self, status=200, set_cookie=None):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")

        if set_cookie:
            self.send_header("Set-Cookie", set_cookie)

        origin = self.headers.get("Origin")
        if origin and origin in CORS_ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Credentials", "true")
        # CORS yalnızca izinli origin'e açıktır, joker (*) kesinlikle kullanılmaz.

        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.end_headers()

    def _check_csrf_protection(self) -> bool:
        """
        Durum değiştiren tüm isteklerde (POST/PUT/PATCH/DELETE) özel başlık kontrolü:
        X-Requested-With: chargerent
        Başlık eksik veya hatalıysa HTTP 403 Forbidden döner.
        """
        req_with = self.headers.get("X-Requested-With", "").strip()
        if req_with != "chargerent":
            self._send_json({"error": "CSRF koruması: Geçersiz veya eksik X-Requested-With başlığı."}, 403)
            return False
        return True

    def do_OPTIONS(self):
        self._set_cors_headers(204)

    def _read_json_body(self):
        content_len = int(self.headers.get("Content-Length", 0))
        if content_len == 0:
            return {}
        try:
            body_bytes = self.rfile.read(content_len)
            return json.loads(body_bytes.decode("utf-8"))
        except Exception:
            return {}

    def _send_json(self, data, status=200, set_cookie=None):
        self._set_cors_headers(status, set_cookie=set_cookie)
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def _get_auth_user(self, conn):
        """
        httpOnly cookie (chargerent_token) değerini doğrular.
        Authorization: Bearer desteği yalnızca DEMO_MODE=true veya TEST_MODE=true iken kabul edilir.
        Başarılıysa token payload sözlüğünü döner; başarısızsa HTTP 401 yanıtı gönderip None döner.
        """
        token = None
        cookie_header = self.headers.get("Cookie", "")
        if cookie_header:
            for part in cookie_header.split(";"):
                part = part.strip()
                if part.startswith("chargerent_token="):
                    token = part.split("=", 1)[1].strip()
                    break

        auth_header = self.headers.get("Authorization", "")
        if not token and auth_header.startswith("Bearer "):
            if DEMO_MODE or TEST_MODE:
                token = auth_header[7:].strip()
            else:
                self._send_json({"error": "Yetkisiz erişim. Güvenlik politikası gereği yalnızca httpOnly çerez ile oturum kabul edilir."}, 401)
                return None

        if not token:
            self._send_json({"error": "Yetkisiz erişim. Geçerli bir oturum belirteci gereklidir."}, 401)
            return None

        try:
            payload = decode_and_verify_token(token, conn)
            # Token metnini de ileride logout'ta kullanabilmek için ekle
            payload["_raw_token"] = token
            return payload
        except jwt.ExpiredSignatureError:
            self._send_json({"error": "Oturum süresi dolmuş. Lütfen tekrar giriş yapın."}, 401)
            return None
        except jwt.InvalidTokenError as e:
            self._send_json({"error": f"Geçersiz oturum belirteci: {str(e)}"}, 401)
            return None
        except Exception:
            self._send_json({"error": "Oturum doğrulanamadı."}, 401)
            return None

    # ==========================================
    # GET İSTEKLERİ
    # ==========================================
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # 1. Health check (Açık)
        if path == "/api/health":
            self._send_json({"status": "ok", "service": "ChargeRent Backend API", "port": API_PORT})
            return

        conn = get_connection()
        try:
            # 2. Oturumdaki kullanıcının kendi profil bilgisi: /api/me (Korumalı)
            if path == "/api/me":
                auth_user = self._get_auth_user(conn)
                if not auth_user:
                    return

                user_id = auth_user["user_id"]
                user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
                if not user:
                    self._send_json({"error": "Kullanıcı bulunamadı."}, 404)
                    return

                profile = {}
                if user["role"] == "driver":
                    dp = conn.execute("SELECT * FROM driver_profiles WHERE user_id = ?", (user_id,)).fetchone()
                    if dp:
                        profile = {"car_model": dp["car_model"], "battery_capacity": dp["battery_capacity"], "points": dp["points_balance"]}
                else:
                    hp = conn.execute("SELECT * FROM host_profiles WHERE user_id = ?", (user_id,)).fetchone()
                    if hp:
                        profile = {"bank_name": hp["bank_name"], "iban": hp["iban"], "withdrawable": hp["withdrawable_balance"], "is_superhost": bool(hp["is_superhost"])}

                self._send_json({
                    "user": {
                        "id": user["id"],
                        "email": user["email"],
                        "full_name": user["full_name"],
                        "role": user["role"],
                        "phone": user["phone"],
                        "profile": profile
                    }
                })
                return

            # 3. Belirli bir kullanıcının profili: /api/profiles/<id> (Korumalı - Yalnızca Kendi Kaydı)
            m_prof = re.match(r"^/api/profiles/(\d+)$", path)
            if m_prof:
                auth_user = self._get_auth_user(conn)
                if not auth_user:
                    return

                target_user_id = int(m_prof.group(1))
                # Yetki kontrolü: Başkasının profiline erişim engeli (403 Forbidden)
                if auth_user["user_id"] != target_user_id:
                    self._send_json({"error": "Bu kullanıcı kaydına erişim yetkiniz yok."}, 403)
                    return

                user = conn.execute("SELECT * FROM users WHERE id = ?", (target_user_id,)).fetchone()
                if not user:
                    self._send_json({"error": "Kullanıcı bulunamadı."}, 404)
                    return

                profile = {}
                if user["role"] == "driver":
                    dp = conn.execute("SELECT * FROM driver_profiles WHERE user_id = ?", (target_user_id,)).fetchone()
                    if dp:
                        profile = {"car_model": dp["car_model"], "battery_capacity": dp["battery_capacity"], "points": dp["points_balance"]}
                else:
                    hp = conn.execute("SELECT * FROM host_profiles WHERE user_id = ?", (target_user_id,)).fetchone()
                    if hp:
                        profile = {"bank_name": hp["bank_name"], "iban": hp["iban"], "withdrawable": hp["withdrawable_balance"], "is_superhost": bool(hp["is_superhost"])}

                self._send_json({
                    "user": {
                        "id": user["id"],
                        "email": user["email"],
                        "full_name": user["full_name"],
                        "role": user["role"],
                        "phone": user["phone"],
                        "profile": profile
                    }
                })
                return

            # 4. İstasyonlar: /api/stations (Genel liste veya ev sahibinin kendi istasyonları)
            if path == "/api/stations":
                auth_user = self._get_auth_user(conn)
                if not auth_user:
                    return

                # Sadece kendi istasyonlarımı listele
                if query.get("mine", ["0"])[0] in ("1", "true"):
                    rows = conn.execute("SELECT * FROM stations WHERE host_id = ?", (auth_user["user_id"],)).fetchall()
                else:
                    rows = conn.execute("SELECT * FROM stations").fetchall()

                stations = [dict(r) for r in rows]
                self._send_json({"stations": stations})
                return

            # 5. Belirli istasyon detayı: /api/stations/<id>
            m_stat = re.match(r"^/api/stations/(\d+)$", path)
            if m_stat:
                station_id = int(m_stat.group(1))
                row = conn.execute("SELECT * FROM stations WHERE id = ?", (station_id,)).fetchone()
                if not row:
                    self._send_json({"error": "İstasyon bulunamadı."}, 404)
                    return
                self._send_json({"station": dict(row)})
                return

            # 6. Rezervasyonlar: /api/reservations (Korumalı - Sadece kendi rezervasyonları)
            if path == "/api/reservations":
                auth_user = self._get_auth_user(conn)
                if not auth_user:
                    return

                user_id = auth_user["user_id"]
                # Sürücü ise kendi yaptıklarını, ev sahibi ise kendi istasyonlarına yapılanları görür
                rows = conn.execute("""
                SELECT r.*, s.title AS station_title, s.address AS station_address, s.host_id
                FROM reservations r
                JOIN stations s ON r.station_id = s.id
                WHERE r.driver_id = ? OR s.host_id = ?
                ORDER BY r.created_at DESC
                """, (user_id, user_id)).fetchall()

                self._send_json({"reservations": [dict(r) for r in rows]})
                return

            # 7. Belirli rezervasyon detayı: /api/reservations/<id> (Korumalı - Sadece Sahibi veya Ev Sahibi)
            m_res = re.match(r"^/api/reservations/(\d+)$", path)
            if m_res:
                auth_user = self._get_auth_user(conn)
                if not auth_user:
                    return

                reservation_id = int(m_res.group(1))
                row = conn.execute("""
                SELECT r.*, s.title AS station_title, s.host_id
                FROM reservations r
                JOIN stations s ON r.station_id = s.id
                WHERE r.id = ?
                """, (reservation_id,)).fetchone()

                if not row:
                    self._send_json({"error": "Rezervasyon bulunamadı."}, 404)
                    return

                # Yetki kontrolü: Yalnızca sürücü veya istasyonun ev sahibi erişebilir
                if row["driver_id"] != auth_user["user_id"] and row["host_id"] != auth_user["user_id"]:
                    self._send_json({"error": "Bu rezervasyon kaydına erişim yetkiniz yok."}, 403)
                    return

                self._send_json({"reservation": dict(row)})
                return

            # 8. Para transferleri: /api/transfers (Korumalı - Yalnızca kullanıcının kendi transferleri)
            if path == "/api/transfers":
                auth_user = self._get_auth_user(conn)
                if not auth_user:
                    return

                rows = conn.execute("SELECT * FROM transfers WHERE user_id = ? ORDER BY created_at DESC", (auth_user["user_id"],)).fetchall()
                self._send_json({"transfers": [dict(r) for r in rows]})
                return

            # 9. Belirli transfer detayı: /api/transfers/<id> (Korumalı - Yalnızca Kendi Transferi)
            m_trans = re.match(r"^/api/transfers/(\d+)$", path)
            if m_trans:
                auth_user = self._get_auth_user(conn)
                if not auth_user:
                    return

                transfer_id = int(m_trans.group(1))
                row = conn.execute("SELECT * FROM transfers WHERE id = ?", (transfer_id,)).fetchone()
                if not row:
                    self._send_json({"error": "Transfer kaydı bulunamadı."}, 404)
                    return

                # Yetki kontrolü
                if row["user_id"] != auth_user["user_id"]:
                    self._send_json({"error": "Bu transfer kaydına erişim yetkiniz yok."}, 403)
                    return

                self._send_json({"transfer": dict(row)})
                return

            self._send_json({"error": "Kaynak bulunamadı."}, 404)
        finally:
            conn.close()

    # ==========================================
    # POST İSTEKLERİ
    # ==========================================
    def do_POST(self):
        # Durum değiştiren tüm isteklerde CSRF koruması (X-Requested-With: chargerent)
        if not self._check_csrf_protection():
            return

        parsed = urlparse(self.path)
        path = parsed.path
        client_ip = self._get_client_ip()

        # 1. GİRİŞ: /api/login
        if path == "/api/login":
            # Hız sınırı kontrolü (dakikada 10 istek)
            if not check_rate_limit(client_ip):
                self._send_json({"error": "Çok fazla deneme yaptınız. Lütfen bir dakika sonra tekrar deneyin."}, 429)
                return

            body = self._read_json_body()
            email = str(body.get("email", "")).strip().lower()
            password = str(body.get("password", "")).strip()

            # Temel format doğrulaması
            if not validate_email(email) or not validate_password(password):
                # Bilgi sızdırmayan genel hata mesajı
                self._send_json({"error": "E-posta veya şifre hatalı."}, 401)
                return

            # IP + E-posta birleşik kilit kontrolü: 5 başarısız denemeden sonra kilit
            if is_account_locked(client_ip, email):
                self._send_json({"error": "E-posta veya şifre hatalı."}, 401)
                return

            # Hesap başına IP'den bağımsız yavaşlatma kontrolü: 1 saatte 20 başarısız denemeden sonra 30 sn bekleme
            if is_email_throttled(email):
                self._send_json({"error": "E-posta veya şifre hatalı."}, 401)
                return

            conn = get_connection()
            try:
                user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
                if not user:
                    record_failed_attempt(client_ip, email)
                    record_email_failed_attempt(email)
                    # Kullanıcının var olup olmadığını belli etmemek için genel mesaj
                    self._send_json({"error": "E-posta veya şifre hatalı."}, 401)
                    return

                # Şifre doğrulama ve gerekirse eski SHA-256'dan bcrypt'e otomatik yükseltme
                is_valid = verify_and_migrate_password(conn, user["id"], password, user["password_hash"])
                if not is_valid:
                    record_failed_attempt(client_ip, email)
                    record_email_failed_attempt(email)
                    self._send_json({"error": "E-posta veya şifre hatalı."}, 401)
                    return

                # Başarılı girişte kilit ve yavaşlatma sayacını sıfırla
                reset_account_lockout(client_ip, email)
                reset_email_throttle(email)

                # 24 saat geçerli JWT belirteci üretimi ve httpOnly Cookie
                token = create_jwt_token(user["id"], user["email"], user["role"])
                cookie_header = build_auth_cookie(token)
                self._send_json({
                    "message": "Giriş başarılı.",
                    "user": {
                        "id": user["id"],
                        "email": user["email"],
                        "full_name": user["full_name"],
                        "role": user["role"]
                    }
                }, 200, set_cookie=cookie_header)
            finally:
                conn.close()
            return

        # 2. HIZLI DEMO GİRİŞİ: /api/demo-login
        if path == "/api/demo-login":
            # 1. DEMO_MODE kontrolü (yalnızca DEMO_MODE=true ortam değişkeniyle çalışır, varsayılan false)
            if not DEMO_MODE:
                self._send_json({"error": "Demo girişi bu ortamda devre dışı bırakılmıştır."}, 403)
                return

            # 2. Hız sınırına tabidir
            if not check_rate_limit(client_ip):
                self._send_json({"error": "Çok fazla deneme yaptınız. Lütfen bir dakika sonra tekrar deneyin."}, 429)
                return

            body = self._read_json_body()
            role = str(body.get("role", "host")).strip()

            # 3. Yalnızca iki örnek hesap için çalışır
            if role not in ("host", "driver"):
                self._send_json({"error": "Geçersiz demo rolü."}, 400)
                return

            demo_email = "ornek.evsahibi@example.com" if role == "host" else "ornek.surucu@example.com"

            conn = get_connection()
            try:
                user = conn.execute("SELECT * FROM users WHERE email = ?", (demo_email,)).fetchone()
                if not user:
                    self._send_json({"error": "Demo kullanıcısı hazır değil."}, 500)
                    return

                token = create_jwt_token(user["id"], user["email"], user["role"])
                cookie_header = build_auth_cookie(token)
                self._send_json({
                    "message": "Demo girişi başarılı.",
                    "user": {
                        "id": user["id"],
                        "email": user["email"],
                        "full_name": user["full_name"],
                        "role": user["role"]
                    }
                }, 200, set_cookie=cookie_header)
            finally:
                conn.close()
            return

        # 3. KAYIT: /api/register
        if path == "/api/register":
            # Hız sınırı kontrolü (dakikada 10 istek)
            if not check_rate_limit(client_ip):
                self._send_json({"error": "Çok fazla deneme yaptınız. Lütfen bir dakika sonra tekrar deneyin."}, 429)
                return

            body = self._read_json_body()
            email = str(body.get("email", "")).strip().lower()
            password = str(body.get("password", "")).strip()
            full_name = str(body.get("full_name", "")).strip()
            role = str(body.get("role", "driver")).strip()
            phone = str(body.get("phone", "")).strip()

            # Sunucu tarafı doğrulama kuralları
            if not validate_full_name(full_name):
                self._send_json({"error": "Ad soyad en az 2 karakter olmalıdır."}, 400)
                return

            if not validate_email(email):
                self._send_json({"error": "Lütfen geçerli bir e-posta adresi giriniz."}, 400)
                return

            if not validate_password(password):
                self._send_json({"error": "Şifre en az 8 karakter uzunluğunda olmalıdır."}, 400)
                return

            if role not in ("driver", "host"):
                self._send_json({"error": "Geçersiz rol. 'driver' veya 'host' olmalıdır."}, 400)
                return

            conn = get_connection()
            try:
                # Çift kayıt kontrolü
                existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
                if existing:
                    self._send_json({"error": "Bu e-posta adresiyle kayıtlı bir hesap zaten bulunmaktadır."}, 409)
                    return

                # bcrypt ile tuzlu ve yavaş şifreleme
                hashed = hash_password(password)

                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO users (email, password_hash, role, full_name, phone)
                VALUES (?, ?, ?, ?, ?)
                """, (email, hashed, role, full_name, phone))
                user_id = cursor.lastrowid

                if role == "driver":
                    cursor.execute("INSERT INTO driver_profiles (user_id) VALUES (?)", (user_id,))
                else:
                    cursor.execute("INSERT INTO host_profiles (user_id) VALUES (?)", (user_id,))

                conn.commit()

                token = create_jwt_token(user_id, email, role)
                cookie_header = build_auth_cookie(token)
                self._send_json({
                    "message": "Hesap başarıyla oluşturuldu.",
                    "user": {
                        "id": user_id,
                        "email": email,
                        "full_name": full_name,
                        "role": role
                    }
                }, 201, set_cookie=cookie_header)
            finally:
                conn.close()
            return

        # 4. ÇIKIŞ: /api/logout (Belirteci kara listeye ekler)
        if path == "/api/logout":
            conn = get_connection()
            try:
                auth_user = self._get_auth_user(conn)
                if not auth_user:
                    return

                raw_token = auth_user.get("_raw_token")
                exp_ts = auth_user.get("exp")
                exp_date = datetime.datetime.fromtimestamp(exp_ts, tz=datetime.timezone.utc) if exp_ts else None

                cursor = conn.cursor()
                cursor.execute("""
                INSERT OR IGNORE INTO revoked_tokens (token, expires_at)
                VALUES (?, ?)
                """, (raw_token, exp_date))
                conn.commit()

                cookie_clear = build_clear_cookie()
                self._send_json({"message": "Başarıyla çıkış yapıldı. Oturum belirteci sonlandırıldı."}, 200, set_cookie=cookie_clear)
            finally:
                conn.close()
            return

        # 5. YENİ İSTASYON EKLE: /api/stations
        if path == "/api/stations":
            conn = get_connection()
            try:
                auth_user = self._get_auth_user(conn)
                if not auth_user:
                    return

                body = self._read_json_body()
                title = str(body.get("title", "")).strip()
                address = str(body.get("address", "")).strip()
                district = str(body.get("district", "Kadıköy")).strip()
                power_kw = float(body.get("power_kw", 22.0))
                socket_type = str(body.get("socket_type", "Type 2")).strip()
                price_kwh = float(body.get("price_kwh", 7.50))

                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO stations (host_id, title, address, district, power_kw, socket_type, price_kwh)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (auth_user["user_id"], title, address, district, power_kw, socket_type, price_kwh))
                conn.commit()

                self._send_json({"message": "İstasyon başarıyla kaydedildi.", "station_id": cursor.lastrowid}, 201)
            finally:
                conn.close()
            return

        # 6. YENİ REZERVASYON YAP: /api/reservations
        if path == "/api/reservations":
            conn = get_connection()
            try:
                auth_user = self._get_auth_user(conn)
                if not auth_user:
                    return

                body = self._read_json_body()
                station_id = int(body.get("station_id", 0))
                duration_hours = float(body.get("duration_hours", 2.0))
                total_price = float(body.get("total_price", 150.0))

                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO reservations (driver_id, station_id, duration_hours, total_price, status)
                VALUES (?, ?, ?, ?, 'confirmed')
                """, (auth_user["user_id"], station_id, duration_hours, total_price))
                conn.commit()

                self._send_json({"message": "Rezervasyon onaylandı.", "reservation_id": cursor.lastrowid}, 201)
            finally:
                conn.close()
            return

        # 7. YENİ TRANSFER / PARA ÇEKİM TALEBİ: /api/transfers
        if path == "/api/transfers":
            conn = get_connection()
            try:
                auth_user = self._get_auth_user(conn)
                if not auth_user:
                    return

                body = self._read_json_body()
                amount = float(body.get("amount", 0))
                iban = str(body.get("iban", "")).strip()

                if amount <= 0:
                    self._send_json({"error": "Geçerli bir tutar giriniz."}, 400)
                    return

                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO transfers (user_id, amount, transfer_type, status, iban)
                VALUES (?, ?, 'withdrawal', 'completed', ?)
                """, (auth_user["user_id"], amount, iban))
                conn.commit()

                self._send_json({"message": "Transfer talebi tamamlandı.", "transfer_id": cursor.lastrowid}, 201)
            finally:
                conn.close()
            return

        self._send_json({"error": "Bilinmeyen istek."}, 404)

    # ==========================================
    # PUT İSTEKLERİ
    # ==========================================
    def do_PUT(self):
        # Durum değiştiren tüm isteklerde CSRF koruması (X-Requested-With: chargerent)
        if not self._check_csrf_protection():
            return

        parsed = urlparse(self.path)
        path = parsed.path
        conn = get_connection()
        try:
            # 1. Profil Güncelleme: /api/profiles/<id> (Korumalı - Yalnızca Kendi Kaydı)
            m_prof = re.match(r"^/api/profiles/(\d+)$", path)
            if m_prof:
                auth_user = self._get_auth_user(conn)
                if not auth_user:
                    return

                target_user_id = int(m_prof.group(1))
                if auth_user["user_id"] != target_user_id:
                    self._send_json({"error": "Başka bir kullanıcının profilini değiştirme yetkiniz yok."}, 403)
                    return

                body = self._read_json_body()
                full_name = body.get("full_name")
                phone = body.get("phone")

                cursor = conn.cursor()
                if full_name:
                    cursor.execute("UPDATE users SET full_name = ? WHERE id = ?", (full_name, target_user_id))
                if phone:
                    cursor.execute("UPDATE users SET phone = ? WHERE id = ?", (phone, target_user_id))
                conn.commit()

                self._send_json({"message": "Profil başarıyla güncellendi."})
                return

            # 2. İstasyon Güncelleme: /api/stations/<id> (Korumalı - Yalnızca İstasyonun Ev Sahibi)
            m_stat = re.match(r"^/api/stations/(\d+)$", path)
            if m_stat:
                auth_user = self._get_auth_user(conn)
                if not auth_user:
                    return

                station_id = int(m_stat.group(1))
                station = conn.execute("SELECT * FROM stations WHERE id = ?", (station_id,)).fetchone()
                if not station:
                    self._send_json({"error": "İstasyon bulunamadı."}, 404)
                    return

                if station["host_id"] != auth_user["user_id"]:
                    self._send_json({"error": "Bu istasyonu değiştirme yetkiniz yok."}, 403)
                    return

                body = self._read_json_body()
                cursor = conn.cursor()
                if "is_available" in body:
                    cursor.execute("UPDATE stations SET is_available = ? WHERE id = ?", (int(body["is_available"]), station_id))
                if "price_kwh" in body:
                    cursor.execute("UPDATE stations SET price_kwh = ? WHERE id = ?", (float(body["price_kwh"]), station_id))
                conn.commit()

                self._send_json({"message": "İstasyon güncellendi."})
                return

            self._send_json({"error": "Kaynak bulunamadı."}, 404)
        finally:
            conn.close()

    # ==========================================
    # DELETE İSTEKLERİ
    # ==========================================
    def do_DELETE(self):
        # Durum değiştiren tüm isteklerde CSRF koruması (X-Requested-With: chargerent)
        if not self._check_csrf_protection():
            return

        parsed = urlparse(self.path)
        path = parsed.path
        conn = get_connection()
        try:
            # İstasyon Silme: /api/stations/<id> (Korumalı - Yalnızca İstasyonun Ev Sahibi)
            m_stat = re.match(r"^/api/stations/(\d+)$", path)
            if m_stat:
                auth_user = self._get_auth_user(conn)
                if not auth_user:
                    return

                station_id = int(m_stat.group(1))
                station = conn.execute("SELECT * FROM stations WHERE id = ?", (station_id,)).fetchone()
                if not station:
                    self._send_json({"error": "İstasyon bulunamadı."}, 404)
                    return

                if station["host_id"] != auth_user["user_id"]:
                    self._send_json({"error": "Bu istasyonu silme yetkiniz yok."}, 403)
                    return

                cursor = conn.cursor()
                cursor.execute("DELETE FROM stations WHERE id = ?", (station_id,))
                conn.commit()
                self._send_json({"message": "İstasyon başarıyla silindi."})
                return

            self._send_json({"error": "Kaynak bulunamadı."}, 404)
        finally:
            conn.close()


def run_server():
    init_db()
    server_address = ("", API_PORT)
    httpd = HTTPServer(server_address, ChargeRentAPIHandler)
    print(f"ChargeRent Güvenli Backend API çalışıyor: http://localhost:{API_PORT}")
    print(f"İzin verilen CORS adresleri: {CORS_ALLOWED_ORIGINS}")
    httpd.serve_forever()

if __name__ == "__main__":
    run_server()

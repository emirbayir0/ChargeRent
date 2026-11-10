import os
import sys

def load_env():
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.getcwd(), ".env")
    ]
    for env_path in candidates:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("'\"")
                            if k not in os.environ:
                                os.environ[k] = v
                break
            except Exception:
                pass

load_env()

# --- 1. JWT GİZLİ ANAHTARI KONTROLÜ (EN AZ 32 KARAKTER, YER TUTUCU YASAK) ---
FORBIDDEN_SECRET_KEYS = {
    "BURAYA_EN_AZ_32_KARAKTERLIK_RASTGELE_GIZLI_ANAHTAR_GIRIN",
    "buraya-en-az-32-karakterlik-guclu-gizli-anahtar-yazin",
    "your-super-secret-jwt-key-min-32-chars",
    "chargerent-super-secret-jwt-key-2026-production-ready",
    "CHANGE_ME"
}

raw_secret = os.environ.get("SECRET_KEY", "").strip()
if not raw_secret or len(raw_secret) < 32 or raw_secret in FORBIDDEN_SECRET_KEYS:
    raise SystemExit(
        "GÜVENLİK HATASI: JWT SECRET_KEY yalnızca .env dosyasından gelmeli, "
        "en az 32 karakter uzunluğunda olmalı ve varsayılan/yer tutucu değer olamaz! "
        "Sunucu başlatılmadı."
    )

SECRET_KEY = raw_secret

# --- 2. DEMO MODU (VARSAYILAN: FALSE) ---
DEMO_MODE = os.environ.get("DEMO_MODE", "false").strip().lower() in ("true", "1", "yes")

# --- 3. GÜVENİLİR VEKİL (TRUSTED_PROXY) KONTROLÜ (VARSAYILAN: FALSE) ---
TRUSTED_PROXY = os.environ.get("TRUSTED_PROXY", "false").strip().lower() in ("true", "1", "yes")

# --- 4. VERİTABANI YOLU ---
DATABASE_PATH = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "chargerent.db"))

# --- 5. AĞ VE CORS YAPILANDIRMASI ---
API_PORT = int(os.environ.get("API_PORT", 8000))
raw_cors = os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
CORS_ALLOWED_ORIGINS = [orig.strip() for orig in raw_cors.split(",") if orig.strip()]
API_BASE_URL = os.environ.get("API_BASE_URL", f"http://localhost:{API_PORT}")

# --- 6. ÇEREZ GÜVENLİK YAPILANDIRMASI (HTTPS İÇİN SECURE) ---
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").strip().lower() in ("true", "1", "yes")

# --- 7. TEST MODU (BEARER TOKEN İZNİ VE TEST PROTOKOLLERİ İÇİN) ---
TEST_MODE = os.environ.get("TEST_MODE", "false").strip().lower() in ("true", "1", "yes")

import os
import sys
import json
import time
import sqlite3
import hashlib
import datetime
from io import BytesIO
from http.client import HTTPMessage

sys.path.insert(0, os.path.dirname(__file__))

VENDOR_CANDIDATES = [
    os.path.join(os.path.dirname(__file__), "vendor"),
]
for v in VENDOR_CANDIDATES:
    if os.path.isdir(v) and v not in sys.path:
        sys.path.insert(0, v)

# Testlerin ayrı test.db üzerinde çalışması için DATABASE_PATH ortam değişkenini ayarla
TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "test.db")
os.environ["DATABASE_PATH"] = TEST_DB_PATH

# Test ortamı için başlangıç yapılandırması
os.environ["DEMO_MODE"] = "false"
os.environ["TRUSTED_PROXY"] = "false"
os.environ["COOKIE_SECURE"] = "false"
os.environ["TEST_MODE"] = "false"

import jwt
import bcrypt
import config
from config import SECRET_KEY, API_PORT
import database
from database import init_db
import server
from server import (
    ChargeRentAPIHandler,
    RATE_LIMIT_STORE,
    ACCOUNT_LOCKOUT_STORE,
    EMAIL_THROTTLE_STORE,
    reset_account_lockout,
    is_account_locked,
    is_email_throttled,
    record_failed_attempt,
    record_email_failed_attempt,
    reset_email_throttle
)

class TestDirectClient(ChargeRentAPIHandler):
    def __init__(self, method, path, headers=None, body=None, client_ip="127.0.0.1"):
        self.command = method
        self.path = path
        self.requestline = f"{method} {path} HTTP/1.1"
        self.request_version = "HTTP/1.1"
        self.close_connection = True
        self.client_address = (client_ip, 12345)

        body_bytes = json.dumps(body).encode("utf-8") if body is not None else b""
        self.rfile = BytesIO(body_bytes)
        self.wfile = BytesIO()

        self.headers = HTTPMessage()
        if headers:
            for k, v in headers.items():
                self.headers[k] = v
        if body_bytes:
            self.headers["Content-Length"] = str(len(body_bytes))
        if "Content-Type" not in self.headers and body_bytes:
            self.headers["Content-Type"] = "application/json"

        if method == "GET":
            self.do_GET()
        elif method == "POST":
            self.do_POST()
        elif method == "PUT":
            self.do_PUT()
        elif method == "DELETE":
            self.do_DELETE()
        elif method == "OPTIONS":
            self.do_OPTIONS()

    def get_result(self):
        self.wfile.seek(0)
        raw = self.wfile.read().decode("utf-8")
        parts = raw.split("\r\n\r\n", 1)
        header_text = parts[0]
        body_text = parts[1] if len(parts) > 1 else ""
        status_line = header_text.splitlines()[0]
        status_code = int(status_line.split()[1])

        # Başlıkları ayrıştır
        res_headers = {}
        for line in header_text.splitlines()[1:]:
            if ":" in line:
                hk, hv = line.split(":", 1)
                res_headers[hk.strip()] = hv.strip()

        try:
            parsed_body = json.loads(body_text)
        except Exception:
            parsed_body = body_text
        return status_code, parsed_body, res_headers


def direct_request(path, method="GET", body=None, token=None, cookie=None, origin="http://localhost:3000", client_ip="127.0.0.1", extra_headers=None, with_csrf=True):
    headers = {}
    # CSRF koruması: Durum değiştiren isteklerde otomatik X-Requested-With eklenir (with_csrf=False verilmedikçe)
    if with_csrf and method in ("POST", "PUT", "PATCH", "DELETE"):
        headers["X-Requested-With"] = "chargerent"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if cookie:
        headers["Cookie"] = cookie
    if origin:
        headers["Origin"] = origin
    if extra_headers:
        headers.update(extra_headers)
    client = TestDirectClient(method, path, headers=headers, body=body, client_ip=client_ip)
    return client.get_result()


def run_full_security_test_suite():
    print("=" * 80)
    print("       CHARGERENT GÜVENLİK, ÇEREZ, CSRF VE HESAP KİLİT TEST PROTOKOLÜ")
    print("       (İzole Test Veritabanı: test.db üzerinde çalıştırılmaktadır)")
    print("=" * 80)

    # 1. chargerent.db'nin değişmediğini teyit etmek için mtime kaydı alalım
    prod_db_path = os.path.join(os.path.dirname(__file__), "chargerent.db")
    prod_mtime_before = os.path.getmtime(prod_db_path) if os.path.exists(prod_db_path) else None

    # 2. test.db'yi taze olarak sıfırla ve hazırla
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

    init_db()

    # Rate limiter ve lockout store'ları sıfırla
    RATE_LIMIT_STORE.clear()
    ACCOUNT_LOCKOUT_STORE.clear()
    EMAIL_THROTTLE_STORE.clear()

    results = {}

    # -------------------------------------------------------------
    # TEST 1: CSRF Koruması - Başlıksız POST İsteğinin 403 Alması (ÖZEL TALEP TESTİ)
    # -------------------------------------------------------------
    st_csrf_post, b_csrf_post, _ = direct_request("/api/login", "POST", {"email": "test@example.com", "password": "123"}, with_csrf=False)
    test1_pass = (st_csrf_post == 403 and "CSRF" in str(b_csrf_post.get("error", "")))
    results["1_csrf_basliksiz_post_403"] = {
        "test": "CSRF Koruması: Başlıksız POST İsteğinin 403 Forbidden Alması",
        "status_code": st_csrf_post,
        "sonuc": "BAŞARILI" if test1_pass else "YAPILAMADI",
        "detay": f"Başlıksız POST isteği HTTP 403 ile reddedildi: '{b_csrf_post.get('error')}'"
    }
    print(f"[TEST 1] Başlıksız POST 403 Reddi: {results['1_csrf_basliksiz_post_403']['sonuc']} (HTTP {st_csrf_post})")

    # -------------------------------------------------------------
    # TEST 2: CSRF Koruması - Başlıksız PUT ve DELETE İsteklerinin 403 Alması
    # -------------------------------------------------------------
    st_csrf_put, b_csrf_put, _ = direct_request("/api/profiles/1", "PUT", {"full_name": "Test"}, with_csrf=False)
    st_csrf_del, b_csrf_del, _ = direct_request("/api/stations/1", "DELETE", with_csrf=False)
    test2_pass = (
        st_csrf_put == 403 and "CSRF" in str(b_csrf_put.get("error", "")) and
        st_csrf_del == 403 and "CSRF" in str(b_csrf_del.get("error", ""))
    )
    results["2_csrf_basliksiz_put_delete_403"] = {
        "test": "CSRF Koruması: Başlıksız PUT ve DELETE İsteklerinin 403 Alması",
        "status_code": f"PUT: {st_csrf_put}, DELETE: {st_csrf_del}",
        "sonuc": "BAŞARILI" if test2_pass else "YAPILAMADI",
        "detay": "X-Requested-With başlığı olmayan durum değiştiren istekler 403 aldı."
    }
    print(f"[TEST 2] Başlıksız PUT & DELETE 403 Reddi: {results['2_csrf_basliksiz_put_delete_403']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 3: Kayıt Yanıt Gövdesinde Token Alanı Bulunmaması & httpOnly Cookie Üretimi
    # -------------------------------------------------------------
    reg_payload = {
        "email": "test.surucu1@example.com",
        "password": "GucluSifre2026!",
        "full_name": "Test Sürücü Bir",
        "role": "driver",
        "phone": "+90 (555) 111-2233"
    }
    status_reg, body_reg, hdrs_reg = direct_request("/api/register", "POST", reg_payload)
    no_token_in_reg_body = ("token" not in body_reg)
    user1_id = body_reg.get("user", {}).get("id")
    has_cookie_reg = "Set-Cookie" in hdrs_reg and "HttpOnly" in hdrs_reg["Set-Cookie"] and "SameSite=Lax" in hdrs_reg["Set-Cookie"]
    test3_pass = (status_reg == 201 and no_token_in_reg_body and has_cookie_reg and user1_id is not None)
    results["3_kayit_token_bulunmamasi"] = {
        "test": "Kayıt Yanıt Gövdesinde Token Alanı Bulunmaması & httpOnly Cookie",
        "status_code": status_reg,
        "sonuc": "BAŞARILI" if test3_pass else "YAPILAMADI",
        "detay": f"HTTP {status_reg} - 'token' gövdede yok ({no_token_in_reg_body}), Set-Cookie: '{hdrs_reg.get('Set-Cookie', 'YOK')}'"
    }
    print(f"[TEST 3] Kayıt Yanıtında Token Yok & Cookie Var: {results['3_kayit_token_bulunmamasi']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 4: Giriş Yanıt Gövdesinde Token Alanı Bulunmaması (ÖZEL TALEP TESTİ)
    # -------------------------------------------------------------
    login_payload = {
        "email": "test.surucu1@example.com",
        "password": "GucluSifre2026!"
    }
    status_log, body_log, hdrs_log = direct_request("/api/login", "POST", login_payload)
    no_token_in_log_body = ("token" not in body_log)
    raw_cookie_hdr = hdrs_log.get("Set-Cookie", "")
    cookie_str = raw_cookie_hdr.split(";")[0] if raw_cookie_hdr else "" # chargerent_token=...

    # Bearer header olmadan, yalnızca cookie ile korumalı /api/me çağrılarak oturum test edilir
    st_cookie_me, b_cookie_me, _ = direct_request("/api/me", "GET", cookie=cookie_str)
    test4_pass = (
        status_log == 200 and
        no_token_in_log_body and
        st_cookie_me == 200 and
        b_cookie_me.get("user", {}).get("email") == "test.surucu1@example.com"
    )
    results["4_giris_token_alani_bulunmamasi"] = {
        "test": "Giriş Yanıt Gövdesinde Token Alanı Bulunmaması & Yalnızca Cookie ile Oturum",
        "status_code": f"Giriş: {status_log}, Cookie /api/me: {st_cookie_me}",
        "sonuc": "BAŞARILI" if test4_pass else "YAPILAMADI",
        "detay": f"Gövdede 'token' alanı YOK; oturum başarıyla httpOnly cookie ('{cookie_str[:25]}...') ile doğrulandı."
    }
    print(f"[TEST 4] Giriş Yanıtında Token Yok & Cookie Doğrulandı: {results['4_giris_token_alani_bulunmamasi']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 5: Çerez Güvenlik Nitelikleri (HttpOnly, SameSite=Lax, Ortama Göre Secure)
    # -------------------------------------------------------------
    # 1. COOKIE_SECURE=False iken (Yerel Geliştirme)
    server.COOKIE_SECURE = False
    _, _, hdrs_insecure = direct_request("/api/login", "POST", login_payload)
    cookie_dev = hdrs_insecure.get("Set-Cookie", "")
    dev_cookie_ok = ("HttpOnly" in cookie_dev and "SameSite=Lax" in cookie_dev and "Secure" not in cookie_dev)

    # 2. COOKIE_SECURE=True iken (HTTPS Üretim Ortamı)
    server.COOKIE_SECURE = True
    _, _, hdrs_secure = direct_request("/api/login", "POST", login_payload)
    cookie_prod = hdrs_secure.get("Set-Cookie", "")
    prod_cookie_ok = ("HttpOnly" in cookie_prod and "SameSite=Lax" in cookie_prod and "Secure" in cookie_prod)

    # Geriye dönük yerel moda alalım
    server.COOKIE_SECURE = False

    test5_pass = (dev_cookie_ok and prod_cookie_ok)
    results["5_cerez_guvenlik_nitelikleri"] = {
        "test": "Set-Cookie Güvenliği (HttpOnly, SameSite=Lax ve Ortama Göre Secure)",
        "status_code": 200,
        "sonuc": "BAŞARILI" if test5_pass else "YAPILAMADI",
        "detay": f"COOKIE_SECURE=true iken: '{cookie_prod[:60]}... ; Secure'"
    }
    print(f"[TEST 5] Çerez Nitelikleri (HttpOnly, SameSite=Lax, Secure): {results['5_cerez_guvenlik_nitelikleri']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 6: Authorization: Bearer Kısıtlaması (Normal Modda Red, DEMO_MODE/TEST_MODE'da İzin)
    # -------------------------------------------------------------
    now = datetime.datetime.now(datetime.timezone.utc)
    token_test = jwt.encode({"sub": str(user1_id), "user_id": user1_id, "email": "test.surucu1@example.com", "role": "driver", "exp": now + datetime.timedelta(hours=1)}, SECRET_KEY, algorithm="HS256")

    # 1. Normal mod (DEMO_MODE=False, TEST_MODE=False): Bearer reddedilmeli (401)
    server.DEMO_MODE = False
    server.TEST_MODE = False
    st_bearer_denied, b_bearer_denied, _ = direct_request("/api/me", "GET", token=token_test)

    # 2. DEMO_MODE=True veya TEST_MODE=True iken: Bearer kabul edilmeli (200)
    server.TEST_MODE = True
    st_bearer_allowed, b_bearer_allowed, _ = direct_request("/api/me", "GET", token=token_test)
    server.TEST_MODE = False

    test6_pass = (st_bearer_denied == 401 and "yalnızca httpOnly çerez" in b_bearer_denied.get("error", "") and st_bearer_allowed == 200)
    results["6_bearer_kisitlamasi"] = {
        "test": "Authorization: Bearer Belirtecinin Normal Modda Reddi & Yalnızca Test/Demo Modunda İzni",
        "status_code": f"Normal: {st_bearer_denied}, TestMode: {st_bearer_allowed}",
        "sonuc": "BAŞARILI" if test6_pass else "YAPILAMADI",
        "detay": f"Normal modda Bearer HTTP 401 ile engellendi ('{b_bearer_denied.get('error')}'); TEST_MODE=true iken kabul edildi."
    }
    print(f"[TEST 6] Bearer Kısıtlaması (Normal Modda Red, Test Modunda İzin): {results['6_bearer_kisitlamasi']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 7: CORS Güvenliği (Joker '*' Olmaması, Yalnızca İzinli Origin & Credentials)
    # -------------------------------------------------------------
    # 1. İzinli origin
    _, _, hdrs_allowed_cors = direct_request("/api/health", "GET", origin="http://localhost:3000")
    cors_allowed_ok = (hdrs_allowed_cors.get("Access-Control-Allow-Origin") == "http://localhost:3000" and hdrs_allowed_cors.get("Access-Control-Allow-Credentials") == "true")

    # 2. İzin verilmeyen origin
    _, _, hdrs_evil_cors = direct_request("/api/health", "GET", origin="http://evil-attacker.com")
    cors_evil_blocked = ("Access-Control-Allow-Origin" not in hdrs_evil_cors)

    # 3. Origin belirtilmeyen istekte joker '*' OLMAMASI
    _, _, hdrs_no_origin = direct_request("/api/health", "GET", origin=None)
    no_wildcard = (hdrs_no_origin.get("Access-Control-Allow-Origin") != "*")

    test7_pass = (cors_allowed_ok and cors_evil_blocked and no_wildcard)
    results["7_cors_guvenligi"] = {
        "test": "CORS Güvenliği: Joker (*) Yasağı & Yalnızca İzinli Origin ve Credentials",
        "status_code": 200,
        "sonuc": "BAŞARILI" if test7_pass else "YAPILAMADI",
        "detay": f"İzinli origin Allow-Origin aldı, kötü niyetli origin engellendi, joker '*' bulunmadı."
    }
    print(f"[TEST 7] CORS Güvenliği (Joker * Yok, İzinli Origin): {results['7_cors_guvenligi']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 8: IP + E-posta Birleşik Hesap Kilit Sınırı (5 Deneme -> Katlanarak Artan Kilit)
    # (Başka IP'den kilit hesabın sahibini dışarıda bırakmaz)
    # -------------------------------------------------------------
    target_lockout_email = "lockout.target@example.com"
    direct_request("/api/register", "POST", {
        "email": target_lockout_email,
        "password": "DogruSifre2026!",
        "full_name": "Kilit Test Kullanıcısı",
        "role": "driver"
    })

    attacker_ip = "198.51.100.5"
    legit_ip = "203.0.113.88"

    # Attacker IP'den 5 başarısız deneme yapalım
    for i in range(5):
        direct_request("/api/login", "POST", {
            "email": target_lockout_email,
            "password": f"YanlisDeneme_{i}!"
        }, client_ip=attacker_ip)

    # 6. denemede Attacker IP kilitli olmalı (401 ve genel mesaj)
    st_attacker_blocked, b_attacker_blocked, _ = direct_request("/api/login", "POST", {
        "email": target_lockout_email,
        "password": "DogruSifre2026!"
    }, client_ip=attacker_ip)

    # ANCAK meşru kullanıcı farklı bir IP'den doğru şifre ile girdiğinde KİLİTLENMEMELİ (Başarılı olmalı)
    st_legit_user, b_legit_user, _ = direct_request("/api/login", "POST", {
        "email": target_lockout_email,
        "password": "DogruSifre2026!"
    }, client_ip=legit_ip)

    record = ACCOUNT_LOCKOUT_STORE.get(f"{attacker_ip}:{target_lockout_email}")
    has_lockout_record = record is not None and record.get("locked_until", 0) > time.time()

    test8_pass = (
        st_attacker_blocked == 401 and
        b_attacker_blocked.get("error") == "E-posta veya şifre hatalı." and
        st_legit_user == 200 and
        has_lockout_record
    )
    results["8_birlesik_hesap_kilitleme"] = {
        "test": "IP + E-posta Birleşik Kilit (DoS Önleme & Meşru Kullanıcıyı Dışarıda Bırakmama)",
        "status_code": f"Saldırgan IP: {st_attacker_blocked}, Meşru Kullanıcı IP: {st_legit_user}",
        "sonuc": "BAŞARILI" if test8_pass else "YAPILAMADI",
        "detay": f"5 başarısız denemeden sonra {attacker_ip} kilitlendi; {legit_ip} doğru şifreyle 200 OK ile giriş yapabildi."
    }
    print(f"[TEST 8] Birleşik Kilit (IP + Email, Meşru Kullanıcı Korundu): {results['8_birlesik_hesap_kilitleme']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 9: Hesap Başına IP'den Bağımsız 30 Saniye Bekleme (YENİ KURAL 1)
    # (1 Saatte 20 Hatalı Deneme -> Tüm IP'ler İçin 30 sn Bekleme, Hesabı Tam Kilitlememe)
    # -------------------------------------------------------------
    throttle_target_email = "throttle.target@example.com"
    direct_request("/api/register", "POST", {
        "email": throttle_target_email,
        "password": "DogruSifre2026!",
        "full_name": "Yavaşlatma Test Kullanıcısı",
        "role": "driver"
    })

    # 20 farklı IP'den 1'er hatalı deneme simüle edelim (Hiçbir IP tek başına 5'e ulaşmaz)
    for i in range(20):
        fake_ip = f"10.200.{i//250}.{i%250 + 1}"
        direct_request("/api/login", "POST", {
            "email": throttle_target_email,
            "password": f"Yanlis_{i}!"
        }, client_ip=fake_ip)

    # 21. deneme: 30 saniye geçmeden hemen yeni bir IP'den denendiğinde 30 sn bekleme kuralı devreye girmeli
    probe_ip = "192.0.2.77"
    st_throttled, b_throttled, _ = direct_request("/api/login", "POST", {
        "email": throttle_target_email,
        "password": "DogruSifre2026!"
    }, client_ip=probe_ip)

    # Şimdi 30 saniyenin geçtiğini simüle edelim: last_attempt zamanını 31 saniye geriye alalım
    with server.EMAIL_THROTTLE_LOCK:
        if throttle_target_email in server.EMAIL_THROTTLE_STORE:
            server.EMAIL_THROTTLE_STORE[throttle_target_email]["last_attempt"] -= 31

    # 30 saniye geçtikten sonra hesap TAMAMEN KİLİTLENMEMİŞ olmalı; doğru şifreyle başarılı giriş yapılabilmeli
    st_allowed_after_wait, b_allowed_after_wait, _ = direct_request("/api/login", "POST", {
        "email": throttle_target_email,
        "password": "DogruSifre2026!"
    }, client_ip=probe_ip)

    test9_pass = (
        st_throttled == 401 and
        b_throttled.get("error") == "E-posta veya şifre hatalı." and
        st_allowed_after_wait == 200 and
        b_allowed_after_wait.get("user", {}).get("email") == throttle_target_email
    )
    results["9_hesap_basina_20_deneme_30sn_bekleme"] = {
        "test": "Hesap Başına IP'den Bağımsız Yavaşlatma (1 Saatte 20 Hatalı -> 30 sn Bekleme, Tam Kilitlememe)",
        "status_code": f"30sn Öncesi: {st_throttled}, 30sn Sonrası: {st_allowed_after_wait}",
        "sonuc": "BAŞARILI" if test9_pass else "YAPILAMADI",
        "detay": "1 saatte 20 başarısız denemeden sonra 30 sn aralık zorunlu kılındı; süre dolunca doğru şifreyle 200 OK alındı (hesap kilitlenmedi)."
    }
    print(f"[TEST 9] Hesap Başına 20 Deneme Sonrası 30 sn Bekleme: {results['9_hesap_basina_20_deneme_30sn_bekleme']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 10: Yanlış Şifre ve Bilgi Sızdırmazlık (GERİ EKLENEN ESKİ TEST 3)
    # -------------------------------------------------------------
    st_wp, b_wp, _ = direct_request("/api/login", "POST", {
        "email": "test.surucu1@example.com",
        "password": "YanlisSifre999!"
    }, client_ip="10.50.50.1")
    st_we, b_we, _ = direct_request("/api/login", "POST", {
        "email": "olmayan.biri@example.com",
        "password": "RastgeleSifre123!"
    }, client_ip="10.50.50.2")
    test10_pass = (
        st_wp == 401 and st_we == 401 and
        b_wp.get("error") == "E-posta veya şifre hatalı." and
        b_we.get("error") == "E-posta veya şifre hatalı."
    )
    results["10_yanlis_sifre_ve_sizdirmazlik"] = {
        "test": "Yanlış Şifre & Kullanıcı Varlığını Sızdırmayan Genel Hata Mesajı",
        "status_code": f"Yanlış Şifre: {st_wp}, Olmayan E-posta: {st_we}",
        "sonuc": "BAŞARILI" if test10_pass else "YAPILAMADI",
        "detay": f"Dönen hata mesajı: '{b_wp.get('error')}'"
    }
    print(f"[TEST 10] Yanlış Şifre & Sızdırmazlık: {results['10_yanlis_sifre_ve_sizdirmazlik']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 11: Aynı E-posta ile Çift Kayıt Engeli (GERİ EKLENEN ESKİ TEST 4)
    # -------------------------------------------------------------
    st_dup, b_dup, _ = direct_request("/api/register", "POST", reg_payload)
    test11_pass = (st_dup == 409 and "zaten bulunmaktadır" in b_dup.get("error", ""))
    results["11_cift_kayit_engeli"] = {
        "test": "Aynı E-posta ile Çift Kayıt Engeli (409 Conflict & Anlaşılır Türkçe Mesaj)",
        "status_code": st_dup,
        "sonuc": "BAŞARILI" if test11_pass else "YAPILAMADI",
        "detay": f"HTTP {st_dup} - Mesaj: '{b_dup.get('error')}'"
    }
    print(f"[TEST 11] Çift Kayıt Engeli (409 Conflict): {results['11_cift_kayit_engeli']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 12: Çıkış ve Belirteç İptali (Logout & Revoked Token & Cookie Temizleme)
    # -------------------------------------------------------------
    st_logout, b_logout, hdrs_logout = direct_request("/api/logout", "POST", cookie=cookie_str)
    st_after_logout, b_after_logout, _ = direct_request("/api/me", "GET", cookie=cookie_str)
    cookie_cleared = "Max-Age=0" in hdrs_logout.get("Set-Cookie", "")
    test12_pass = (st_logout == 200 and st_after_logout == 401 and cookie_cleared)
    results["12_cikis_ve_iptal"] = {
        "test": "Çıkış Yapma, Belirteç İptali & Cookie Sıfırlama (Max-Age=0)",
        "status_code": f"Logout: {st_logout}, İptal Sonrası: {st_after_logout}",
        "sonuc": "BAŞARILI" if test12_pass else "YAPILAMADI",
        "detay": f"Kara listeye alınan token 401 ile engellendi, Set-Cookie: '{hdrs_logout.get('Set-Cookie')}'"
    }
    print(f"[TEST 12] Çıkış & Belirteç İptali: {results['12_cikis_ve_iptal']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 13: Süresi Dolmuş Belirteç Denetimi (GERİ EKLENEN ESKİ TEST 6)
    # -------------------------------------------------------------
    now_exp = datetime.datetime.now(datetime.timezone.utc)
    expired_payload = {
        "sub": str(user1_id),
        "user_id": user1_id,
        "email": "test.surucu1@example.com",
        "role": "driver",
        "iat": now_exp - datetime.timedelta(hours=48),
        "exp": now_exp - datetime.timedelta(hours=24)
    }
    expired_token = jwt.encode(expired_payload, SECRET_KEY, algorithm="HS256")
    st_exp, b_exp, _ = direct_request("/api/me", "GET", cookie=f"chargerent_token={expired_token}")
    test13_pass = (st_exp == 401 and "dolmuş" in b_exp.get("error", ""))
    results["13_suresi_dolmus_belirtec"] = {
        "test": "Süresi Dolmuş Belirteç Denetimi (ExpiredSignatureError & 401)",
        "status_code": st_exp,
        "sonuc": "BAŞARILI" if test13_pass else "YAPILAMADI",
        "detay": f"HTTP {st_exp} - Mesaj: '{b_exp.get('error')}'"
    }
    print(f"[TEST 13] Süresi Dolmuş Belirteç: {results['13_suresi_dolmus_belirtec']['sonuc']} (HTTP {st_exp})")

    # -------------------------------------------------------------
    # TEST 14: Çapraz Kullanıcı Veri İzolasyonu (403 Forbidden)
    # -------------------------------------------------------------
    # Kullanıcı A (Sürücü) taze cookie
    _, _, hdrs_a = direct_request("/api/login", "POST", login_payload)
    cookie_a = hdrs_a.get("Set-Cookie", "").split(";")[0]

    # Kullanıcı B (Ev Sahibi)
    reg_b = {
        "email": "test.evsahibi2@example.com",
        "password": "GucluSifre2026!",
        "full_name": "Test Ev Sahibi İki",
        "role": "host",
        "phone": "+90 (555) 444-5566"
    }
    direct_request("/api/register", "POST", reg_b)
    _, log_b, hdrs_b = direct_request("/api/login", "POST", {"email": "test.evsahibi2@example.com", "password": "GucluSifre2026!"})
    cookie_b = hdrs_b.get("Set-Cookie", "").split(";")[0]
    user_b_id = log_b.get("user", {}).get("id")

    # Kullanıcı B adına istasyon ve transfer ekle
    _, b_station_res, _ = direct_request("/api/stations", "POST", {
        "title": "B İstasyonu",
        "address": "Örnek Sk. No:1, Garaj kodu: #0000, Kadıköy / İstanbul",
        "district": "Kadıköy",
        "power_kw": 22.0,
        "socket_type": "Type 2",
        "price_kwh": 7.50
    }, cookie=cookie_b)
    station_b_id = b_station_res.get("station_id")

    _, b_trans_res, _ = direct_request("/api/transfers", "POST", {
        "amount": 500.0,
        "iban": "TR99 0001 0002 0003 0004 0005 06"
    }, cookie=cookie_b)
    trans_b_id = b_trans_res.get("transfer_id")

    # Kullanıcı A, Kullanıcı B'nin verilerine saldırsın
    st_hack_prof, _, _ = direct_request(f"/api/profiles/{user_b_id}", "GET", cookie=cookie_a)
    st_hack_stat, _, _ = direct_request(f"/api/stations/{station_b_id}", "PUT", {"price_kwh": 1.00}, cookie=cookie_a)
    st_hack_trans, _, _ = direct_request(f"/api/transfers/{trans_b_id}", "GET", cookie=cookie_a)

    test14_pass = (st_hack_prof == 403 and st_hack_stat == 403 and st_hack_trans == 403)
    results["14_yetki_izolasyonu"] = {
        "test": "Kullanıcı İzolasyonu & 403 Forbidden Denetimi (Başkasının Profili, İstasyonu, Transferi)",
        "status_code": f"Profil: {st_hack_prof}, İstasyon: {st_hack_stat}, Transfer: {st_hack_trans}",
        "sonuc": "BAŞARILI" if test14_pass else "YAPILAMADI",
        "detay": "Başkasının profiline, istasyonuna veya para transferine erişim 403 Forbidden ile engellendi."
    }
    print(f"[TEST 14] Çapraz Veri İzolasyonu (403): {results['14_yetki_izolasyonu']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 15: IP Başına Hız Sınırı (GERİ EKLENEN ESKİ TEST 8)
    # -------------------------------------------------------------
    RATE_LIMIT_STORE.clear()
    attack_ip_rate = "198.51.100.99"
    statuses_rate = []
    for i in range(12):
        s_code, _, _ = direct_request("/api/login", "POST", {
            "email": "rate.limit@test.com",
            "password": "Password123!"
        }, client_ip=attack_ip_rate)
        statuses_rate.append(s_code)

    first_10_ok = all(s != 429 for s in statuses_rate[:10])
    eleventh_blocked = (statuses_rate[10] == 429 and statuses_rate[11] == 429)
    test15_pass = (first_10_ok and eleventh_blocked)
    results["15_ip_hiz_siniri"] = {
        "test": "IP Başına Hız Sınırı (10 istek/dakika -> 11. İstek 429 Too Many Requests)",
        "status_code": f"10. İstek: {statuses_rate[9]}, 11. İstek: {statuses_rate[10]}, 12. İstek: {statuses_rate[11]}",
        "sonuc": "BAŞARILI" if test15_pass else "YAPILAMADI",
        "detay": "İlk 10 istek işlendi, 11. ve 12. istekler HTTP 429 Too Many Requests aldı."
    }
    print(f"[TEST 15] IP Başına Hız Sınırı (429): {results['15_ip_hiz_siniri']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 16: TRUSTED_PROXY Kontrolü (GERİ EKLENEN ESKİ TEST 10)
    # -------------------------------------------------------------
    # 1. TRUSTED_PROXY = False iken X-Forwarded-For yoksayılmalı
    server.TRUSTED_PROXY = False
    handler_fake_ip = TestDirectClient("GET", "/api/health", headers={"X-Forwarded-For": "203.0.113.195"}, client_ip="127.0.0.1")
    ip_ignored = (handler_fake_ip._get_client_ip() == "127.0.0.1")

    # 2. TRUSTED_PROXY = True iken X-Forwarded-For okunmalı
    server.TRUSTED_PROXY = True
    handler_trusted = TestDirectClient("GET", "/api/health", headers={"X-Forwarded-For": "203.0.113.195, 10.0.0.1"}, client_ip="127.0.0.1")
    ip_read = (handler_trusted._get_client_ip() == "203.0.113.195")
    server.TRUSTED_PROXY = False

    test16_pass = (ip_ignored and ip_read)
    results["16_trusted_proxy"] = {
        "test": "TRUSTED_PROXY Kontrolü (X-Forwarded-For Yalnızca TRUSTED_PROXY=true İken Okunur)",
        "status_code": 200,
        "sonuc": "BAŞARILI" if test16_pass else "YAPILAMADI",
        "detay": f"TRUSTED_PROXY=False iken başlık yok sayıldı ({handler_fake_ip._get_client_ip()}), True iken okundu ({handler_trusted._get_client_ip()})."
    }
    print(f"[TEST 16] TRUSTED_PROXY Güvenliği: {results['16_trusted_proxy']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 17: DEMO_MODE Kontrolü (GERİ EKLENEN ESKİ TEST 11)
    # -------------------------------------------------------------
    # 1. DEMO_MODE=False iken çağrı engellenmeli (HTTP 403)
    server.DEMO_MODE = False
    st_dm_off, b_dm_off, _ = direct_request("/api/demo-login", "POST", {"role": "host"})

    # 2. DEMO_MODE=True iken örnek hesaplarla başarılı olmalı
    server.DEMO_MODE = True
    st_dm_on_host, b_dm_on_host, _ = direct_request("/api/demo-login", "POST", {"role": "host"})
    st_dm_on_driver, b_dm_on_driver, _ = direct_request("/api/demo-login", "POST", {"role": "driver"})

    # 3. Yalnızca iki örnek hesap için çalışmalı (geçersiz rolde 400 dönmeli)
    st_dm_invalid, b_dm_invalid, _ = direct_request("/api/demo-login", "POST", {"role": "admin"})
    server.DEMO_MODE = False

    test17_pass = (
        st_dm_off == 403 and
        st_dm_on_host == 200 and
        st_dm_on_driver == 200 and
        st_dm_invalid == 400 and
        b_dm_on_host.get("user", {}).get("email") == "ornek.evsahibi@example.com"
    )
    results["17_demo_login_modu"] = {
        "test": "DEMO_MODE Kontrolü (/api/demo-login DEMO_MODE=true Şartı & 2 Örnek Hesap Kısıtlaması)",
        "status_code": f"Kapalı: {st_dm_off}, Açık Ev Sahibi: {st_dm_on_host}, Sürücü: {st_dm_on_driver}, Geçersiz: {st_dm_invalid}",
        "sonuc": "BAŞARILI" if test17_pass else "YAPILAMADI",
        "detay": "DEMO_MODE=false iken 403 Forbidden; DEMO_MODE=true iken yalnızca örnek hesaplarla çalıştı."
    }
    print(f"[TEST 17] DEMO_MODE Kısıtlaması: {results['17_demo_login_modu']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 18: SHA-256'dan bcrypt'e Şeffaf Yükseltme (GERİ EKLENEN ESKİ TEST 12)
    # -------------------------------------------------------------
    conn = sqlite3.connect(TEST_DB_PATH)
    c = conn.cursor()
    legacy_pass = "EskiSifre123!"
    legacy_sha256 = hashlib.sha256(legacy_pass.encode("utf-8")).hexdigest()
    c.execute("""
    INSERT INTO users (email, password_hash, role, full_name, phone)
    VALUES ('legacy.user@example.com', ?, 'driver', 'Eski Sistem Kullanıcısı', '+90 (555) 999-0000')
    """, (legacy_sha256,))
    legacy_user_id = c.lastrowid
    conn.commit()

    st_leg, b_leg, _ = direct_request("/api/login", "POST", {
        "email": "legacy.user@example.com",
        "password": legacy_pass
    })

    c.execute("SELECT password_hash FROM users WHERE id = ?", (legacy_user_id,))
    migrated_hash = c.fetchone()[0]
    conn.close()

    is_bcrypt = migrated_hash.startswith("$2b$") or migrated_hash.startswith("$2a$")
    test18_pass = (st_leg == 200 and is_bcrypt)
    results["18_legacy_rehash"] = {
        "test": "SHA-256'dan bcrypt'e Şeffaf Yükseltme ($2b$ Formatına Otomatik Dönüşüm)",
        "status_code": st_leg,
        "sonuc": "BAŞARILI" if test18_pass else "YAPILAMADI",
        "detay": f"Eski Hash: {legacy_sha256[:12]}... -> Yeni Hash: {migrated_hash[:15]}... ($2b$ biçimi)"
    }
    print(f"[TEST 18] SHA-256 -> bcrypt Yükseltme: {results['18_legacy_rehash']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 19: Süresi Dolmuş revoked_tokens Kayıtlarının Açılışta Temizlenmesi (GERİ EKLENEN ESKİ TEST 13)
    # -------------------------------------------------------------
    conn = sqlite3.connect(TEST_DB_PATH)
    c = conn.cursor()
    old_date = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=10)).isoformat()
    future_date = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)).isoformat()
    c.execute("INSERT OR REPLACE INTO revoked_tokens (token, expires_at) VALUES ('old_expired_tok', ?)", (old_date,))
    c.execute("INSERT OR REPLACE INTO revoked_tokens (token, expires_at) VALUES ('valid_future_tok', ?)", (future_date,))
    conn.commit()
    conn.close()

    # init_db çağrısı (açılışta süresi dolmuş token kayıtlarını temizler)
    init_db()

    conn = sqlite3.connect(TEST_DB_PATH)
    c = conn.cursor()
    c.execute("SELECT token FROM revoked_tokens WHERE token = 'old_expired_tok'")
    row_expired = c.fetchone()
    c.execute("SELECT token FROM revoked_tokens WHERE token = 'valid_future_tok'")
    row_future = c.fetchone()
    conn.close()

    test19_pass = (row_expired is None and row_future is not None)
    results["19_expired_revoked_tokens_temizligi"] = {
        "test": "Süresi Dolmuş revoked_tokens Kayıtlarının Açılışta Otomatik Temizlenmesi",
        "status_code": 200,
        "sonuc": "BAŞARILI" if test19_pass else "YAPILAMADI",
        "detay": f"Süresi dolmuş belirteç silindi: {row_expired is None}, Geçerli iptal kaydı korundu: {row_future is not None}."
    }
    print(f"[TEST 19] Süresi Dolmuş Token Temizliği: {results['19_expired_revoked_tokens_temizligi']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 20: Adres Sanitizasyonu ("Örnek Sk. No:1, Garaj kodu: #0000, Kadıköy / İstanbul")
    # -------------------------------------------------------------
    conn = sqlite3.connect(TEST_DB_PATH)
    c = conn.cursor()
    c.execute("SELECT address FROM stations WHERE id = 1")
    row_st1 = c.fetchone()
    conn.close()

    expected_addr = "Örnek Sk. No:1, Garaj kodu: #0000, Kadıköy / İstanbul"
    db_addr = row_st1[0] if row_st1 else ""
    addr_clean = (db_addr == expected_addr)

    test20_pass = addr_clean
    results["20_adres_temizleme"] = {
        "test": "Adres Sanitizasyonu: 'Örnek Sk. No:1, Garaj kodu: #0000, Kadıköy / İstanbul'",
        "status_code": 200,
        "sonuc": "BAŞARILI" if test20_pass else "YAPILAMADI",
        "detay": f"Veritabanı istasyon adresi: '{db_addr}'"
    }
    print(f"[TEST 20] Adres Sanitizasyonu: {results['20_adres_temizleme']['sonuc']}")

    # -------------------------------------------------------------
    # TEST 21: Ana Veritabanına (chargerent.db) Dokunulmadığının Teyidi
    # -------------------------------------------------------------
    prod_mtime_after = os.path.getmtime(prod_db_path) if os.path.exists(prod_db_path) else None
    db_untouched = (prod_mtime_before == prod_mtime_after)
    test21_pass = db_untouched
    results["21_prod_db_izolasyonu"] = {
        "test": "chargerent.db Dosyasının Korunması & test.db İzolasyonu",
        "status_code": 200,
        "sonuc": "BAŞARILI" if test21_pass else "YAPILAMADI",
        "detay": f"chargerent.db mtime öncesi: {prod_mtime_before}, sonrası: {prod_mtime_after} (Hiç dokunulmadı)."
    }
    print(f"[TEST 21] chargerent.db İzolasyonu: {results['21_prod_db_izolasyonu']['sonuc']}")

    print("=" * 80)
    print("                    TÜM GÜVENLİK TESTLERİ TAMAMLANDI")
    print("=" * 80)
    return results

if __name__ == "__main__":
    run_full_security_test_suite()

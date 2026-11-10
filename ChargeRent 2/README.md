# ChargeRent - Güvenli EV Şarj Paylaşım Platformu

ChargeRent, bireysel duvar tipi şarj istasyonu sahipleri ile elektrikli araç sürücülerini buluşturan, yüksek güvenlikli, uçtan uca şifreli ve modern bir eşler arası (P2P) şarj paylaşım platformudur.

---

## 1. Güvenlik ve Kimlik Doğrulama Mimarisi

ChargeRent, modern web güvenliği standartlarını temel alarak tasarlanmıştır:

- **Şifreleme:** Düz metin veya SHA-256 şifreler veritabanında veya loglarda asla tutulmaz. bcrypt algoritması (12 round tuzlu ve yavaş) ile geri döndürülemez biçimde özetlenerek saklanır.
- **Oturum Yönetimi:** Oturum belirteçleri (JWT) hiçbir koşulda tarayıcının `localStorage` veya `sessionStorage` alanlarına yazılmaz (XSS ile çalınma riskine karşı). Oturum, sunucu tarafından belirlenen `httpOnly` çerez (`chargerent_token`) ile yönetilir.
- **CSRF Koruması:** Durum değiştiren tüm API isteklerinde (`POST`, `PUT`, `DELETE`) istemciden özel `X-Requested-With: chargerent` başlığı zorunlu tutulur. Başlık eksik veya uyumsuz olduğunda sunucu `403 Forbidden` yanıtı döner.
- **IP + E-posta Birleşik Hız ve Kilit Sınırı:** Giriş denemelerinde DoS saldırılarını engellemek ve hesap sahibini dışarıda bırakmamak için `(IP, e-posta)` ikilisi bazında kilit uygulanır. 5 başarısız denemeden sonra ilgili IP için o hesaba katlanarak artan kilit süresi (60s -> 120s -> 240s -> 480s -> maks 900s / 15 dk) uygulanır.

---

## 2. Çerez Güvenliği ve Alan Adı (Domain) Mimarisi

Tarayıcıların çerez politikaları, frontend ve backend servislerinin nerede barındırıldığına göre farklı davranışlar gösterir.

### A. Farklı Alan Adları (Cross-Domain) Durumu
Eğer frontend uygulamanız ile backend API sunucunuz farklı etki alanlarında veya farklı alt etki alanlarında barındırılıyorsa (örneğin Frontend: `https://app.chargerent.example.com`, API: `https://api.chargerent.example.com`):

1. **SameSite=None; Secure Zorunluluğu:**
   - Tarayıcılar cross-site isteklerde çerezin gönderilmesine yalnızca `SameSite=None` ve `Secure` nitelikleri birlikte tanımlandığında izin verir.
   - `Secure` niteliği HTTPS bağlantısını zorunlu kılar; yerel HTTP üzerinde `SameSite=None` çalışmaz ve modern tarayıcılar (Chrome, Safari, Firefox) tarafından doğrudan engellenir.
2. **Üçüncü Taraf Çerez Kısıtlamaları:**
   - Safari (ITP - Intelligent Tracking Prevention) ve güncel Chromium tabanlı tarayıcılar, cross-site çerezleri varsayılan olarak engelleyebilir veya kullanım ömrünü sınırlandırabilir.

### B. Ters Vekil (Reverse Proxy) ile Tek Alan Adı Çözümü (Önerilen Mimari)

Üretim ortamında cross-domain çerez karmaşasını ve tarayıcı engellemelerini tamamen ortadan kaldıran en güvenli ve endüstri standardı mimari **Ters Vekil (Reverse Proxy)** ile tek alan adı kullanımıdır.

Bu mimaride Nginx, Caddy veya Cloudflare gibi bir ters vekil sunucu yapılandırılarak tek bir alan adı üzerinden hem statik frontend hem de backend API sunulur:

- **Frontend Arayüzü:** `https://chargerent.example.com/`
- **Backend API:** `https://chargerent.example.com/api/`

#### Tek Alan Adı Çözümünün Avantajları:
1. **Birinci Taraf (First-Party) Çerez:**
   - Çerezler aynı alan adı altında işlem gördüğü için `SameSite=Lax` (veya `SameSite=Strict`) niteliğiyle kusursuz çalışır.
   - Tarayıcıların üçüncü taraf çerez engellemelerinden (Safari ITP, Brave Shields vb.) kesinlikle etkilenmez.
2. **CORS İhtiyacını Ortadan Kaldırır:**
   - İstekler aynı origin (`https://chargerent.example.com`) üzerinden gerçekleştiği için tarayıcı preflight (`OPTIONS`) gecikmeleri ve karmaşık CORS başlıkları gerekmez.
3. **Maksimum CSRF Koruması:**
   - `SameSite=Lax` + `X-Requested-With: chargerent` ikilisi ile siteler arası sahtecilik saldırıları tam anlamıyla engellenir.

#### Örnek Nginx Yapılandırması:
```nginx
server {
    listen 443 ssl http2;
    server_name chargerent.example.com;

    ssl_certificate /etc/letsencrypt/live/chargerent.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chargerent.example.com/privkey.pem;

    # Statik React / Vite Frontend
    location / {
        root /var/www/chargerent/dist;
        try_files $uri $uri/ /index.html;
    }

    # Python Güvenli Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 3. Ortam Değişkenleri (.env)

Sunucuyu başlatmadan önce `.env` dosyasını `.env.example` şablonuna göre oluşturunuz:

```env
# En az 32 karakterlik güçlü JWT gizli anahtarı
SECRET_KEY=buraya-en-az-32-karakterlik-guclu-ve-rastgele-anahtar-yazin

# Demo mod kontrolü (Üretimde daima false)
DEMO_MODE=false

# Güvenilir ters vekil (Nginx arkasındaysa true)
TRUSTED_PROXY=true

# HTTPS üzerinde çerezlere Secure bayrağı eklenmesi (Yerelde false)
COOKIE_SECURE=true

# API Port ve CORS Yapılandırması
API_PORT=8000
CORS_ALLOWED_ORIGINS=https://chargerent.example.com,http://localhost:3000
```

---

## 4. Testlerin Çalıştırılması

Güvenlik, kimlik doğrulama, çerez, CORS ve CSRF testlerini izole test veritabanı (`test.db`) üzerinde çalıştırmak için:

```bash
cd backend
python3 test_auth_security.py
```


## Yerel kurulum

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r backend/requirements.txt
cp .env.example .env
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Üretilen değeri yerel `.env` dosyasındaki `SECRET_KEY` alanına yazın.
`.env` ve veritabanını paylaşmayın. Backend: `python3 backend/server.py`.
Frontend için ayrı terminalde proje kökünden `ruby server.rb` çalıştırıp
`http://127.0.0.1:3034` adresini açın. CORS ayarlarına bu adresi ekleyin.
Testler: `python3 backend/test_auth_security.py`.

Ekranlardaki kişi, iletişim, banka ve istasyon verileri örnek amaçlıdır;
harita konumları demo noktalarıdır. Gerçek ödeme yapılmaz.

# ChargeRent — Proje Devir Notları

Son güncelleme: 13 Ekim 2026. Bu dosya, projeyi başka bir bilgisayarda (veya yeni bir yapay zekâ oturumunda) kaldığımız yerden sürdürmek için hazırlandı.

---

## 1. Proje nedir?

**ChargeRent**: Ev sahiplerinin (garaj, otopark) elektrikli araç şarj soketlerini sürücülere saatlik/kWh bazında kiraladığı bir P2P platformun **demo/prototipi**. Her şey mock veri ve simülasyonla çalışıyor; gerçek ödeme, ölçüm veya bildirim yok.

Roller:
- **Sürücü**: Keşfet (harita + doğal dil arama), Şimdi lazım, Rezervasyon sihirbazı, Şarj takibi (telemetri), Rota planlayıcı.
- **Ev sahibi**: Genel bakış (gelir paneli), İstasyonlarım / Müsaitlik takvimi, Rezervasyonlar.

---

## 2. Dosya yapısı ve çalıştırma

```
volt-share-ev/
├── index.html              # CDN'ler (React 18, Babel, Tailwind CDN, Lucide, Leaflet) + App.jsx yükler
├── src/
│   ├── App.jsx             # TÜM uygulama tek dosyada (~3.900 satır)
│   └── index.css           # Global stiller (hero-title vb.)
└── PROJE_DEVIR_NOTLARI.md  # Bu dosya
```

- Build aracı yok. `index.html` şu satırla yükler: `<script type="text/babel" src="./src/App.jsx?v=7"></script>`
- **App.jsx her değiştiğinde `?v=` numarasını artırın** (tarayıcı önbelleği için). Şu an `v=7`.
- Tüm bileşenler tek Babel script'inde; yardımcı fonksiyonlar kullanıldıkları yerden **önce** tanımlanmalı.

Çalıştırma (proje klasöründe):
```bash
python3 -m http.server 3034 --bind 127.0.0.1
# Tarayıcıda: http://127.0.0.1:3034/
```
(Dosyayı doğrudan `file://` ile açmak çalışmaz; Babel harici script'i yükleyemez.)

Taşırken: `volt-share-ev` klasörünün tamamını kopyalamanız yeterli. İnternet gerekiyor (CDN'ler).

---

## 3. Tasarım dili (KESİN KURALLAR)

Koyu, Apple/Tesla sadeliği:
- Zemin `#000000`; yüzeyler (kart, arama, çip) `#1C1C1E`; ayırıcı `#2C2C2E`; kenarlık `#3A3A3C`.
- Ana metin `#F5F5F7`; ikincil metin `#A1A1A6`.
- Tek vurgu rengi `#30C27C`, yalnızca "müsait" gibi durum noktalarında.
- Birincil buton: açık renk pill (`#F5F5F7` zemin, siyah yazı). İkincil: koyu yüzey + ince kenarlık.
- Font: sistem fontu (-apple-system, SF Pro, Helvetica Neue). **Monospace yok. Emoji yok.** Gerekirse Lucide çizgi ikon.
- Sayılarda `tabular-nums`. Para/sayı tr-TR: `₺36.650`, `5.090 kWh`.
- Büyük başlıklar (52–60px, letter-spacing -0.03em) `hero-title` sınıfı; başlıklar nokta ile biter ("Müsaitlik.", "Şimdi lazım.").
- Kart kutuları yerine ince ayırıcı çizgiler; yalnızca harita ve özet kartları yuvarlak köşeli (20–28px).
- Her sayfada **tek ince demo şeridi** (en üstte).
- Ekranda tek ana eylem.

---

## 4. Tamamlanan özellikler (kronolojik)

### 4.1 İş kuralları (erken aşama)
- **Sadakat kademeleri**: Bronz 0–5, Gümüş 6–15, Altın 16–39, Platin 40+ şarj; her kademenin ayrı avantajı (`getDriverTier`).
- **Süper Ev Sahibi**: Tek sabit tanım (40+ başarılı şarj, %2 altı iptal, 4.9 üstü puan, 10 dk altı yanıt) — rozet ve komisyon avantajı aynı sabitten okur.
- **Dinamik fiyat**: Ev sahibi baz kWh fiyatını belirler; platform yalnızca çarpan uygular (Peak 17–21 ×1,20; Off-peak 00–07 ×0,75). Sürücü nihai fiyatı ve çarpanı rezervasyondan önce görür; ödemede fiyat değişmez (`getDynamicPriceInfo`).
- **Acil durdurma**: Onay adımı ("Şarjı durdurmak istediğine emin misin?"), her kullanım kayda alınır, tekrarlayan kötüye kullanım işaretlenebilir.
- Akıllı bildirimlerde indirim oranı sabit yazılmaz, hesaplanır.

### 4.2 Yeni tasarıma geçiş
- Keşfet ve Ev sahibi paneli hedef ekran görüntülerine birebir uyarlandı.
- Ev sahibi paneli sırası: "Genel bakış" + "İstasyon ekle" → 3 metrik (kutusuz) → solda Süper ev sahibi ölçütleri (2x2), sağda Komisyon farkı kartı → Fiyatlandırma tablosu (3 satır) → İstasyonların listesi.
- Menü: Sürücü = Keşfet / Nasıl çalışır? / Ev sahibi ol. Ev sahibi = Genel bakış / İstasyonlarım / Rezervasyonlar.

### 4.3 Üç özellik
- **Doğal dilde arama** (Keşfet): Tek büyük pill arama, placeholder "Yarın akşam Kadıköy'de en ucuz 11 kW". Kural tabanlı çözümleyici (konum, zaman, güç, sıralama, soket) + "Anladığımız:" çipleri.
- **Şimdi lazım** (`SimdiLazimView`, `activeTab === 'simdi'`): En iyi eşleşme kartı (fotoğraf alanı, 3 metrik: Tahmini süre / Birim fiyat / Tahmini tutar, tarife notu, "Rezervasyon yap" + "Haritada gör"), altında "Diğer yakın seçenekler" listesi.
- **Ev sahibi ol** akışı.

### 4.4 Müsaitlik takvimi (`HostAvailabilitySchedule`, `activeTab === 'host-schedule'`) — TAMAMLANDI
- Başlık "Müsaitlik.", İstasyon açık/kapalı switch, "Varsayılana sıfırla" bağlantısı.
- Haftalık ızgara: 4 dilim (Sabah 06–12, Öğle 12–17, Akşam 17–22, Gece 22–06) × 7 gün; "Haftada X saat müsait".
- Sessiz saatler kartı: **varsayılan KAPALI**; açıkken başlangıç/bitiş saati düzenlenebilir.
- Bloke edilen günler, Rezervasyon onayı (Ben onaylarım / Otomatik kabul).
- Demo şeridi: "Demo sürüm. Ayarlar yalnızca bu tarayıcıda saklanır."

Kurallar (App.jsx ~1710–1960 satırları):
- `INITIAL_AVAILABILITY` — varsayılan veri (tek tanım).
- `getStoredAvailability()` — localStorage (`chargerent_host_availability`) okur; try/catch; bozuk/eksik veride varsayılana döner (grid'in 4 satırı ve her biri 7 elemanlı olmalı).
- `App()` içinde `useEffect` ile her değişiklik try/catch içinde localStorage'a yazılır.
- `getNightConflictWarning(availability)` — Yalnızca sessiz saatler AÇIK ve en az bir Gece hücresi AÇIK ise; gece diliminde sessiz saat dışında kalan başlangıç aralıklarını dakika bazında hesaplar:
  - 23:00–07:00 → "…yalnızca 22:00–23:00 arası başlayabilir."
  - 23:00–05:00 → "…yalnızca 22:00–23:00 ve 05:00–06:00 arası başlayabilir."
  - Tamamen kapsıyorsa → "…Gece seansları başlayamaz."
  - Kesişim yoksa → uyarı yok.
- `checkStationAvailabilityAt(availability, dateStr, timeStr, durationMinutes = 120)`:
  1. İstasyon kapalıysa engeller.
  2. Sessiz saatler **yalnızca BAŞLANGIÇ saatini** kısıtlar (22:30'da başlayıp 23:30'a sarkan seans geçerli).
  3. Seansın **tamamı** açık hücrelere sığmalı: 15 dk adımlarla taranır; kapalı hücreye denk gelirse "Bu seans, ev sahibinin kapattığı saatlere taşıyor".
  4. 00:00–05:59 bir önceki günün Gece hücresine bakar (Cumartesi 02:00 → Cuma gecesi; Pazartesi 02:00 → Pazar gecesi).
  5. Tarih yerel saatle (`new Date(y, m-1, d, h, min)`) kurulur, UTC kayması yok.
- `BookingWizard`: tahmini süreyi hesaplayıp doğrulamaya geçirir; müsait değilse uyarı gösterir ve "Rezervasyonu onayla" butonu devre dışı ("Seçilen saatte müsait değil").
- `SimdiLazimView`: kapalı, o an sessiz saatte olan veya takvimde kapalı istasyonları listeden çıkarır (145 dk süreyle kontrol). Hiç eşleşme yoksa boş durum kartı.
- Not: Takvim kuralları şu an yalnızca demo istasyonu `st-01` (Moda, müstakil garaj) için uygulanıyor.

Python ile doğrulanan test senaryoları (hepsi geçti): 23–07, 23–05, 22–06, 14–18 uyarıları; Pazartesi 02:00 → Pazar gecesi; 16:30+90 dk akşama taşma; 22:30 başlangıç geçerli; 23:15 başlangıç engelli.

---

## 5. SIRADAKİ İŞLER (bu sırayla)

Hedef ekran görüntüleri kullanıcı tarafından verildi (yeni bilgisayarda gerekirse tekrar yükleyin). Her sayfada tek ince demo şeridi; ölçüm, ödeme ve bildirimler **ayrı bir servis katmanında** (mock) tutulmalı.

### 5.1 Şarj seansı — sürücü (`/seans` veya `activeTab === 'seans'`) — TAMAMLANDI
- Geri bağlantı "← Rezervasyonlarım", başlık "Şarj sürüyor.", alt satır "Moda, müstakil garaj · TOGG T10X".
- 4 adımlı ilerleme: Yoldayım, Vardım, Şarj, Bitti (tamamlananlar dolu daire + onay işareti, mevcut adım kalın, gelecekler soluk).
- Sol ana kart: "Batarya" + büyük yüzde (96px, %58), ilerleme çubuğu (%20 başlangıç → %80 hedef), 3 metrik: Geçen süre (91 dk), Enerji (tahmini) (33,6 kWh), Şimdiki tutar (₺171,36). Not: "Tahmini bitiş 01:45. Enerji ve tutar, araç bataryası ve cihaz gücünden hesaplanan tahmindir. Fiyat ₺5,10 / kWh ve rezervasyon boyunca sabit."
- Butonlar: açık renkli "Şarjı bitir", ikincil "Acil destek" (onay diyaloğu + dondurma + kayıt). Altında: "Acil destek şarjı durdurur ve tutarı dondurur. Basmadan önce onayını isteriz."
- Sağ kartlar: Ev sahibi ("Moda, müstakil garaj", "Bağımsız garaj · Kablo garaj girişinde", "Mesaj gönder", "Yol tarifi"); Bitiş hatırlatması ("Şarj bitmeden 10 dakika önce bildirim alırsın. Bitişten 15 dakika sonra işgal ücreti başlar; Altın üyeliğinle 30 dakika ücretsiz.").
- Demo şeridi: "Demo sürüm. Ölçüm, ödeme ve bildirimler simüle edilir."
- Canlı simülasyon: batarya, süre, enerji ve tutar zamanla otomatik ilerler; acil durumda veya bitişte durur.
- Kod konumu: `DriverChargingSessionView` bileşeni.

### 5.2 Seans özeti ve itiraz — ev sahibi (`/rezervasyonlar/:id` veya `activeTab === 'seans-ozeti'`) ve Rezervasyonlar Listesi (`activeTab === 'host-reservations'`) — TAMAMLANDI
- "← Rezervasyonlar", "Seans özeti.", "Moda, müstakil garaj · 12 Ekim, 23:20 – 01:45".
- Tek merkezli seans/rezervasyon modeli: süre, enerji, birim fiyat, ara tutar, komisyon oranı (%10 veya %15), komisyon tutarı, net ev sahibi kazancı, durum, bitiş nedeni, saat damgalı fotoğraflar.
- Sürücü "Şarjı bitir" dediğinde dinamik olarak bu kayda işlenir, sabit rakam kullanılmaz.
- Sol kart: "Sana yatacak tutar", döküm satırları (Süre, Enerji, Birim fiyat, Ara tutar, Platform komisyonu –₺...).
- Sağ üst: "Sürücünün çektiği fotoğraflar" (Gelişte, Çıkışta saat damgalı veya "Fotoğraf yüklenmedi" notu).
- Sağ alt: "Seansı onaylıyor musun?" (Onayla, İtiraz et, otomatik onay geri sayımı "47 sa 12 dk kaldı").
- İtiraz akışı: Süre yanlış / Hasar var / Diğer seçimi ve not alanı, gönderilince "İncelemede" durumu.
- Rezervasyonlar Listesi: Kutusuz, ince çizgili satırlar, 3 sekme (Onay bekleyen, Yaklaşan, Geçmiş), her sekmede boş durum metni.
- Düzeltmeler: Bitiş hatırlatması ücretsiz işgal süresi ve para puan iadesi dinamik olarak sürücü kademesinden okunur. 3 tip kapatılabilir seans toast bildirimi (10 dk, bitti, işgal ücreti başladı) eklendi.
- Demo şeridi: `activeTab === 'seans-ozeti'` iken "Demo sürüm. Rakamlar örnek veridir."

### 5.3 Bekleme listesi — sürücü (`/bekleme` veya sonuçsuz arama) — TAMAMLANDI
- "← Keşfet'e dön", başlık "Üsküdar'da henüz şarj noktası yok.", alt "İlk ev sahibi katılınca sana haber verelim."
- Sol kart "Bekleme listesi": Konum alanı ("Üsküdar, İstanbul"), Soket tipi çipleri (Type 2 / CCS2 / Fark etmez), e-posta ve bildirim sıklığı, "Bekleme listesine katıl" (tam genişlik açık buton), başarı rozeti ("Talebin alındı"), "Bildirimle haber veririz. İstediğin zaman listeden çıkabilirsin."
- Sağ kart: "Bir ev sahibi tanıyor musun?" — "Soketi olan bir komşunu ya da arkadaşını davet et. Katılırsa ikiniz de ilk ay komisyonsuz kazanırsınız." + "Komşunu davet et" modalı ve link kopyalama.
- Alt liste "Veya en yakın alternatife göz at": Moda, müstakil garaj (Type 2 · 22 kW · Kadıköy, 6,2 km, ₺6,80); Ataşehir, site garajı (Type 2 · 11 kW · Ataşehir, 7,9 km, ₺6,50) doğrudan randevuya geçiş.
- Keşfet haritasında bulunamayan aramalarda (örn. Üsküdar) otomatik "Bekleme Listesine Katıl" aksiyonu.
- Demo şeridi: "Demo sürüm. Bildirimler simüle edilir."

### 5.4 Hakedişler ve Cüzdan — ev sahibi (`activeTab === 'host-payouts'`) — TAMAMLANDI
- Ev sahibi paneline ("Genel bakış", "İstasyonlarım", "Rezervasyonlar", "Hakedişler") üst menü sekmesi ve Genel bakış ("Toplam kazanç" altından "Hakedişler →") bağlantısı eklendi.
- Kutusuz, ince çizgili 3 ana metrik: Çekilebilir bakiye (₺2.450,50 + onaylanan seanslar), Bekleyen bakiye (48 saatlik inceleme süresindeki seanslar, ₺243,73), Toplam aktarılan (₺33.815,40).
- Sol kolon 2 sekmeli yapı: "Banka Transferleri (4)" ve "Seans Hakediş Dökümü" (rezervasyonlardan net kazançlar, komisyon kesintisi -%10, durum etiketleri).
- Sağ kolon: "Kayıtlı Banka Hesabı" kartı (Örnek Banka, IBAN kopyalama, "Düzenle" modalı ile IBAN güncelleme), "Otomatik Haftalık Aktarım" switch'i (Her Pazartesi 09:00), sıfır komisyon bilgi kutusu.
- "Banka Hesabına Aktar" modalı: Özel tutar girişi veya "Tümünü Çek", FAST ile anında aktarım simülasyonu, başarılı işlem toast bildirimi ve dinamik bakiye düşüşü.
- Demo şeridi: "Demo sürüm. Ödeme ve banka transferleri simüle edilir."

---

## 6. Önemli kod konumları (App.jsx, yaklaşık satırlar)

| Öğe | Satır |
|---|---|
| `Navbar` | ~546 |
| `StationMap` (Keşfet, "Şimdi lazım" butonu) | ~809 |
| `INITIAL_AVAILABILITY`, `getStoredAvailability`, `getNightConflictWarning`, `checkStationAvailabilityAt` | ~1710–1960 |
| `BookingWizard` | ~1963 |
| `HostDashboard` | ~2400–2760 |
| `HostAvailabilitySchedule` | ~2766 |
| `SimdiLazimView` | ~3140 |
| `AiRoutePlanner`, `SystemArchitecture` | ~3370+ |
| `App()` (state, localStorage effect, demo şeridi, sekme yönlendirme) | ~3590+ |

Yönlendirme URL tabanlı değil, `activeTab` state'i ile yapılıyor (`map`, `simdi`, `booking`, `telemetry`, `host`, `host-schedule`, `host-reservations`, `route`, `arch`). Yeni sayfalar için yeni `activeTab` değerleri eklenmeli (örn. `seans`, `seans-ozeti`, `bekleme`).

---

## 7. Yeni oturumda yapay zekâya verilecek başlangıç mesajı (önerilen)

> Bu klasördeki `PROJE_DEVIR_NOTLARI.md` dosyasını oku. ChargeRent projesine kaldığımız yerden devam ediyoruz. Tasarım kurallarına kesinlikle uy. Sıradaki iş: 5.1 Şarj seansı ekranı.

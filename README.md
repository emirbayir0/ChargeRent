# ChargeRent ⚡

Elektrikli araç sürücülerini özel şarj noktası sahipleriyle buluşturan bir şarj paylaşım platformu prototipi.

ChargeRent, sürücülerin yakınlarındaki şarj noktalarını keşfetmesini ve rezervasyon oluşturmasını; ev sahiplerinin ise istasyonlarını, müsaitliklerini ve kazançlarını yönetmesini sağlar.

> Proje demo amaçlıdır. Şarj ölçümleri, ödemeler, banka transferleri ve bildirimler simüle edilir. Ekranlardaki kişi ve hesap bilgileri örnek verilerdir.

## Özellikler

### Sürücüler için

- Harita üzerinden şarj noktası keşfetme
- Konum, güç ve fiyat kriterleriyle arama
- Doğal dilde arama ifadelerini kural tabanlı çözümleme
- Yakındaki müsait istasyonları görüntüleme
- Rezervasyon oluşturma
- Şarj süresi, batarya ve tahmini maliyet takibi
- Ev sahibiyle mesajlaşma arayüzü
- Seans fotoğrafları ve seans özeti
- Sadakat kademeleri ve bekleme listesi

### Ev sahipleri için

- İstasyon ekleme ve yönetme
- Haftalık müsaitlik takvimi
- Sessiz saatler ve bloke edilen günler
- Rezervasyon ve seans yönetimi
- Seans onaylama ve itiraz akışı
- Gelir, komisyon ve hakediş ekranları
- Banka transferi simülasyonu

## Kullanılan Teknolojiler

| Katman | Teknolojiler |
| --- | --- |
| Arayüz | React 18, JavaScript, JSX |
| Stil | Tailwind CSS, CSS |
| Harita | Leaflet |
| İkonlar | Lucide |
| Backend | Python, standart HTTP sunucusu |
| Veritabanı | SQLite |
| Kimlik doğrulama | PyJWT, bcrypt |
| Yerel frontend sunucusu | Ruby, WEBrick |

Frontend, React ve diğer kütüphaneleri CDN üzerinden yükler. Node.js veya frontend derleme adımı gerektirmez. CDN kaynakları için internet bağlantısı gerekir.

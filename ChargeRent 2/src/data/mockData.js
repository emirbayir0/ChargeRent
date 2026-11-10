// VoltShare EV Platform Mock Data & Architecture Spec

export const EV_MODELS = [
  { id: 'togg-t10x', name: 'TOGG T10X Long Range', batteryCapacity: 88.5, maxChargeRateKw: 180, acKw: 11, image: '⚡ TOGG' },
  { id: 'hyundai-ioniq5', name: 'Hyundai Ioniq 5', batteryCapacity: 77.4, maxChargeRateKw: 232, acKw: 11, image: '⚡ Hyundai' },
  { id: 'porsche-taycan', name: 'Porsche Taycan GTS', batteryCapacity: 93.4, maxChargeRateKw: 270, acKw: 11, image: '🏎️ Porsche' },
  { id: 'bmw-i4', name: 'BMW i4 eDrive40', batteryCapacity: 80.7, maxChargeRateKw: 205, acKw: 11, image: '⚡ BMW' },
];

export const INITIAL_STATIONS = [
  {
    id: 'st-01',
    name: 'Moda, müstakil garaj',
    locationArea: 'Moda, Kadıköy',
    specs: 'Type 2 · 22 kW · Bağımsız garaj',
    statusText: 'Bugün 14:00 sonrası müsait',
    pricePerKwh: 6.80,
    hostRating: 4.95,
    isSuperHost: true,
    completedCharges: 48,
    cancellationRate: 0.00,
    avgResponseMinutes: 4,
    lat: 40.9856,
    lng: 29.0275,
    exactAddress: 'Örnek Sk. No:1, Garaj kodu: #0000, Kadıköy / İstanbul',
    approxAddress: 'Örnek Mahallesi Yakınları, Kadıköy / İstanbul',
    hostPhone: 'Telefon paylaşılmadı',
    hostName: 'Örnek Ev Sahibi',
    powerKw: 22,
    plugType: 'Type 2',
    isSolarPowered: true,
    totalEarned: 14250,
    stationImage: '/public/images/station-1.svg',
    description: 'Müstakil villamızın kapalı garajında 22 kW yüksek hızlı Type 2 şarj ünitesi. Kahve ikramımız mevcuttur.'
  },
  {
    id: 'st-02',
    name: 'Fenerbahçe, açık otopark',
    locationArea: 'Fenerbahçe, Kadıköy',
    specs: 'Type 2 · 11 kW · Ev sahibi eşliğinde',
    statusText: 'Yarın 09:00 sonrası müsait',
    pricePerKwh: 7.20,
    hostRating: 4.90,
    isSuperHost: false,
    completedCharges: 32,
    cancellationRate: 0.01,
    avgResponseMinutes: 6,
    lat: 40.9712,
    lng: 29.0435,
    exactAddress: 'Örnek Mah. Örnek Sk. No:2, Kadıköy / İstanbul',
    approxAddress: 'Örnek Mahallesi Yakınları, Kadıköy / İstanbul',
    hostPhone: 'Telefon paylaşılmadı',
    hostName: 'Örnek Ev Sahibi',
    powerKw: 11,
    plugType: 'Type 2',
    isSolarPowered: false,
    totalEarned: 11400,
    stationImage: '/public/images/station-2.svg',
    description: 'Fenerbahçe merkezde bina açık otoparkında 11 kW Type 2 şarj imkanı.'
  },
  {
    id: 'st-03',
    name: 'Ataşehir, site garajı',
    locationArea: 'Barbaros, Ataşehir',
    specs: 'Type 2 · 11 kW · Site girişli',
    statusText: 'Bugün 18:00 sonrası müsait',
    pricePerKwh: 6.50,
    hostRating: 4.88,
    isSuperHost: false,
    completedCharges: 28,
    cancellationRate: 0.01,
    avgResponseMinutes: 8,
    lat: 40.9924,
    lng: 29.1128,
    exactAddress: 'Örnek Mah. Örnek Sk. No:3, Ataşehir / İstanbul',
    approxAddress: 'Örnek Mahallesi Yakınları, Ataşehir / İstanbul',
    hostPhone: 'Telefon paylaşılmadı',
    hostName: 'Örnek Ev Sahibi',
    powerKw: 11,
    plugType: 'Type 2',
    isSolarPowered: false,
    totalEarned: 9800,
    stationImage: '/public/images/station-3.svg',
    description: 'Site kapalı garajında 11 kW şarj noktası. Güvenlikli giriş mevcuttur.'
  },
  {
    id: 'st-04',
    name: 'Çekmeköy, villa garajı',
    locationArea: 'Çekmeköy',
    specs: 'Type 2 · 7 kW · Bağımsız garaj',
    statusText: 'Bugün müsait',
    pricePerKwh: 5.90,
    hostRating: 4.92,
    isSuperHost: true,
    completedCharges: 42,
    cancellationRate: 0.00,
    avgResponseMinutes: 5,
    lat: 41.0352,
    lng: 29.1784,
    exactAddress: 'Örnek Mah. Örnek Sk. No:4, Çekmeköy / İstanbul',
    approxAddress: 'Örnek Mahallesi Yakınları, Çekmeköy / İstanbul',
    hostPhone: 'Telefon paylaşılmadı',
    hostName: 'Örnek Ev Sahibi',
    powerKw: 7,
    plugType: 'Type 2',
    isSolarPowered: true,
    totalEarned: 16700,
    stationImage: '/public/images/station-4.svg',
    description: 'Müstakil villa bahçesinde 7 kW monofaze/trifaze güvenli şarj noktası.'
  }
];

export const ARCHITECTURE_NODES = [
  {
    id: 'postgis',
    title: 'PostgreSQL + PostGIS',
    category: 'Spatial Database',
    icon: 'database',
    description: 'Sürücü lat/lng koordinatlarına göre 5 km yarıçapındaki en yakın şarj soketlerini ST_DWithin indeksli mekansal sorgu ile < 15ms sürede döndürür.',
    techDetails: 'Index: GIST(location) | Query: ST_DWithin(geom, ST_MakePoint(lng, lat), radius)'
  },
  {
    id: 'timescaledb',
    title: 'TimescaleDB / InfluxDB',
    category: 'Time-Series Telemetry',
    icon: 'activity',
    description: 'Şarj sırasındaki 1 saniyelik aralıklı voltaj, amper, güç (kW) ve batarya sıcaklık eğrilerini yüksek sıkıştırma oranıyla depolar.',
    techDetails: 'Chunk Interval: 1 hour | Hypertable compression enabled'
  },
  {
    id: 'redis',
    title: 'Redis (Geospatial & Pub/Sub)',
    category: 'In-Memory Caching',
    icon: 'zap',
    description: 'İstasyonların anlık canlı doluluk durumunu (Available/InUse) ve soket kilitlerini (Locking) milisaniyeler seviyesinde sunar.',
    techDetails: 'GEOADD / GEORADIUS & Distributed Locking (Redlock algorithm)'
  },
  {
    id: 'websocket',
    title: 'OCPP 2.0.1 WebSocket Gateway',
    category: 'IoT Gateway Protocol',
    icon: 'wifi',
    description: 'Bireysel akıllı şarj kutuları (Smart Wallbox) ile çift yönlü Open Charge Point Protocol iletişimi sağlar.',
    techDetails: 'Full-duplex WebSocket JSON-RPC 2.0 | Heartbeat interval: 10s'
  },
  {
    id: 'kafka',
    title: 'Apache Kafka Event Bus',
    category: 'Event Streaming',
    icon: 'cpu',
    description: 'ChargingStarted, MeterValuesUpdated, PaymentCompleted ve EmergencyStop olaylarını mikroservislere asenkron dağıtır.',
    techDetails: 'Topics: ev.telemetry.v1, ev.billing.v1 | Retention: 7 days'
  }
];

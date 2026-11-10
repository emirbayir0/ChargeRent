// Main ChargeRent Application (Phase 1: Reliability Badges, Single-Source Super Host Rule & Emergency Support Hotline)

// --- SÜPER EV SAHİBİ TEK MERKEZLİ İŞ KURALI (SINGLE SOURCE OF TRUTH) ---
const SUPER_HOST_RULES = {
  minCompletedCharges: 40,
  maxCancellationRate: 0.02, // %2'nin altında iptal
  minRating: 4.90,
  maxAvgResponseMinutes: 10
};

// Hem Rozet hem Komisyon Oranı (%10 vs %15) bu tek fonksiyondan okunur
const isSuperHost = (host) => {
  if (!host) return false;
  const completed = host.completedCharges ?? 45;
  const cancelRate = host.cancellationRate ?? 0.01;
  const rating = host.hostRating ?? 4.95;
  const respTime = host.avgResponseMinutes ?? 4;

  return (
    completed >= SUPER_HOST_RULES.minCompletedCharges &&
    cancelRate < SUPER_HOST_RULES.maxCancellationRate &&
    rating >= SUPER_HOST_RULES.minRating &&
    respTime <= SUPER_HOST_RULES.maxAvgResponseMinutes
  );
};

const getHostCommissionRate = (host) => {
  return isSuperHost(host) ? 0.10 : 0.15; // Süper Host %10, Standart %15
};

// --- SÜRÜCÜ KADEMELİ SADAKAT HESAPLAYICI ---
const getDriverTier = (completedCharges = 18) => {
  if (completedCharges >= 40) {
    return {
      id: 'platin',
      name: 'Platin sürücü',
      cashbackPercent: 5,
      freeIdleMinutes: 60,
      freeIdleText: 'en fazla 60 dakika',
      perks: 'En fazla 60 dakika işgal toleransı, %5 Para Puan iadesi, VIP 7/24 Öncelikli Destek & Esnek İptal',
      badgeBg: 'bg-[#1C1C1E] text-[#F5F5F7] border border-[#3A3A3C]'
    };
  }
  if (completedCharges >= 16) {
    return {
      id: 'altin',
      name: 'Altın sürücü',
      cashbackPercent: 3,
      freeIdleMinutes: 30,
      freeIdleText: '30 dakika',
      perks: '30 dk ücretsiz işgal süresi, %3 Para Puan iadesi, Yılda 1 ücretsiz iptal hakkı',
      badgeBg: 'bg-[#1C1C1E] text-[#F5F5F7] border border-[#3A3A3C]'
    };
  }
  if (completedCharges >= 6) {
    return {
      id: 'gumus',
      name: 'Gümüş sürücü',
      cashbackPercent: 2,
      freeIdleMinutes: 15,
      freeIdleText: '15 dakika',
      perks: '15 dk ücretsiz işgal süresi, %2 Para Puan iadesi',
      badgeBg: 'bg-[#1C1C1E] text-[#A1A1A6] border border-[#2C2C2E]'
    };
  }
  return {
    id: 'bronz',
    name: 'Bronz sürücü',
    cashbackPercent: 0,
    freeIdleMinutes: 0,
    freeIdleText: '0 dakika',
    perks: 'Standart üyelik, %0 Para Puan iadesi ve varsayılan tarife avantajları',
    badgeBg: 'bg-[#1C1C1E] text-[#A1A1A6] border border-[#2C2C2E]'
  };
};

// --- TEK MERKEZLİ TARİFE TABLOSU ---
const TARIFF_SCHEDULE = [
  { id: 'peak', name: 'Yoğun saat', hours: '17:00 – 21:00', multiplier: 1.20, samplePrice: 8.16, displayString: 'Yoğun saat 17:00–21:00 · ×1,20 · ₺8,16' },
  { id: 'standard', name: 'Standart', hours: '06:00 – 17:00', multiplier: 1.00, samplePrice: 6.80, displayString: 'Standart 06:00–17:00 · ×1,00 · ₺6,80' },
  { id: 'offpeak', name: 'Gece', hours: '21:00 – 06:00', multiplier: 0.75, samplePrice: 5.10, displayString: 'Gece 21:00–06:00 · ×0,75 · ₺5,10' }
];

// --- DİNAMİK FİYATLANDIRMA HESAPLAYICISI (Tek Tarife Tablosundan Okur) ---
const getDynamicPriceInfo = (basePricePerKwh = 6.80, hour = new Date().getHours()) => {
  let multiplier = 1.0;
  let label = 'Standart Tarife (06:00–17:00)';
  let type = 'normal';
  let hoursText = '06:00 – 17:00';

  if (hour >= 17 && hour < 21) {
    multiplier = 1.20;
    label = 'Yoğun Saat (17:00–21:00)';
    type = 'peak';
    hoursText = '17:00 – 21:00';
  } else if (hour >= 21 || hour < 6) {
    multiplier = 0.75;
    label = 'Gece Tasarruf (21:00–06:00)';
    type = 'offpeak';
    hoursText = '21:00 – 06:00';
  }

  const finalPrice = Math.round((basePricePerKwh * multiplier) * 100) / 100;
  return {
    basePrice: basePricePerKwh,
    multiplier,
    finalPrice,
    label,
    type,
    hoursText,
    discountRatePercent: type === 'offpeak' ? 25 : (type === 'peak' ? -20 : 0)
  };
};

// --- BİLGİ BUTONLARI & AÇILIR İPUCU TANIMLARI ---
const INFO_TOOLTIPS = {
  kwh: {
    term: 'kWh',
    text: 'Aracın çektiği enerji miktarı. Ücret, şarj ettiğin kWh kadar hesaplanır.'
  },
  peak: {
    term: 'Yoğun saat',
    text: '17:00–21:00 arası talep yüksektir, fiyat baz fiyatın %20 üstündedir.'
  },
  offpeak: {
    term: 'Gece tarifesi',
    text: '21:00–06:00 arası elektrik maliyeti düşüktür, indirimli fiyat uygulanır.'
  },
  multiplier: {
    term: 'Çarpan',
    text: 'Günün saatine göre baz fiyata uygulanan katsayı.'
  },
  superhost: {
    term: 'Süper ev sahibi',
    text: 'Başarılı şarj, düşük iptal, yüksek puan ve hızlı yanıtla kazanılan rozet. Komisyonu %15\'ten %10\'a düşürür.'
  },
  commission: {
    term: 'Komisyon',
    text: 'Platformun her başarılı şarj seansı üzerinden aldığı hizmet payı.'
  },
  pricelock: {
    term: 'Fiyat kilidi',
    text: 'Rezervasyon yaptığında gördüğün fiyat değişmez.'
  },
  rewardpoints: {
    term: 'Para puan',
    text: 'Her şarjda kazandığın ve sonraki şarjlarda nakit gibi harcayabileceğin bakiye.'
  },
  overstay: {
    term: 'İşgal süresi',
    text: 'Şarj tamamlandıktan sonra soketi boşaltmak için tanınan ek süre.'
  },
  approxlocation: {
    term: 'Yaklaşık konum',
    text: 'Güvenlik için kesin adres, rezervasyon onaylandıktan sonra paylaşılır.'
  }
};

// --- GÜVENLİ LUCIDE İKON BİLEŞENİ (REACT VIRTUAL DOM RECONCILIATION KORUMALI) ---
const LucideIcon = ({ name, className = "w-5 h-5", ...props }) => {
  const spanRef = React.useRef(null);
  React.useEffect(() => {
    if (!spanRef.current) return;
    try {
      spanRef.current.innerHTML = `<i data-lucide="${name}" class="${className}"></i>`;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons({ root: spanRef.current });
      }
    } catch (e) {
      console.warn('LucideIcon error:', e);
    }
  }, [name, className]);

  return <span ref={spanRef} className="inline-flex items-center justify-center shrink-0 pointer-events-none" {...props} />;
};

const InfoTip = ({ id }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const info = INFO_TOOLTIPS[id];
  if (!info) return null;

  return (
    <span className="relative inline-flex items-center ml-1 align-baseline select-none">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-3.5 h-3.5 rounded-full border border-[#3A3A3C] hover:border-[#A1A1A6] text-[#A1A1A6] hover:text-[#F5F5F7] inline-flex items-center justify-center text-[10px] font-normal leading-none transition-colors cursor-pointer"
        title={info.term}
        aria-label={info.term}
      >
        i
      </button>

      {isOpen && (
        <>
          <span 
            className="fixed inset-0 z-40" 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} 
          />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 p-2.5 rounded-xl bg-[#1C1C1E] border border-[#3A3A3C] text-[11px] text-[#F5F5F7] shadow-2xl leading-relaxed text-left font-normal normal-case">
            <span className="font-semibold block text-[#F5F5F7] mb-0.5">{info.term}</span>
            <span className="text-[#A1A1A6] block">{info.text}</span>
          </span>
        </>
      )}
    </span>
  );
};

// --- GÜVENİLİRLİK ROZETLERİ BİLEŞENİ ---
const ReliabilityBadges = ({ host, isVerifiedDriver = true }) => {
  const superHost = isSuperHost(host);
  const fastResponse = (host?.avgResponseMinutes ?? 4) <= 5;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      {superHost && (
        <span
          className="px-2.5 py-0.5 rounded-full bg-[#1C1C1E] text-[#F5F5F7] border border-[#3A3A3C] font-medium"
          title="Süper Ev Sahibi: 40+ başarılı şarj, <%2 iptal, >4,90 puan ve <10dk yanıt süresi. (Komisyon: %10)"
        >
          Süper ev sahibi
        </span>
      )}

      {isVerifiedDriver && (
        <span
          className="px-2.5 py-0.5 rounded-full bg-[#1C1C1E] text-[#A1A1A6] border border-[#2C2C2E] font-medium"
          title="T.C. Kimlik & Ehliyet doğrulaması onaylı kullanıcı"
        >
          Doğrulanmış
        </span>
      )}

      {fastResponse && (
        <span
          className="px-2.5 py-0.5 rounded-full bg-[#1C1C1E] text-[#A1A1A6] border border-[#2C2C2E]"
          title="Ortalama yanıt süresi 5 dakikanın altındadır"
        >
          Hızlı yanıt (&lt;5dk)
        </span>
      )}
    </div>
  );
};

// --- KADEMELİ SADAKAT & SÜPER HOST PROGRAMI MODALI ---
const LoyaltyModal = ({ isOpen, onClose, driverStats }) => {
  if (!isOpen) return null;

  const currentTier = getDriverTier(driverStats?.completedCharges || 18);
  const nextTarget = driverStats?.completedCharges >= 40 ? 40 : (driverStats?.completedCharges >= 16 ? 40 : 16);
  const progressPct = Math.min(100, Math.round((driverStats?.completedCharges / nextTarget) * 100));

  return (
    <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1C1C1E] p-7 max-w-xl w-full space-y-6 border border-[#3A3A3C] rounded-2xl relative max-h-[90vh] overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A1A1A6] hover:text-white font-bold text-sm"
        >
          ✕
        </button>

        <div>
          <h3 className="font-bold text-lg text-[#F5F5F7]">Sadakat ve seviye sistemi</h3>
          <p className="text-xs text-[#A1A1A6] mt-0.5">Şarj ettikçe artan Para Puan ve ev sahiplerine özel komisyon avantajları.</p>
        </div>

        {/* Current Driver Status Box */}
        <div className="bg-[#000000] p-4 rounded-2xl border border-[#2C2C2E] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-[#A1A1A6] block">Mevcut Seviyen</span>
              <span className="font-bold text-sm text-[#F5F5F7] mt-0.5 block">{currentTier.name}</span>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end text-xs text-[#A1A1A6]">
                <span>Kullanılabilir Bakiye</span>
                <InfoTip id="rewardpoints" />
              </div>
              <span className="font-bold text-sm text-[#30C27C] tabular-nums mt-0.5 block">
                ₺{driverStats?.rewardPointsBalance.toFixed(2).replace('.', ',')} Para Puan
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px] text-[#A1A1A6] tabular-nums">
              <span>İlerleme: {driverStats?.completedCharges} / {nextTarget} şarj</span>
              <span>%{progressPct}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#1C1C1E] overflow-hidden">
              <div
                className="h-full bg-[#F5F5F7] transition-all"
                style={{ width: `${progressPct}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Driver Tiers Table */}
        <div className="space-y-3">
          <span className="text-xs text-[#A1A1A6] font-medium block">
            Sürücü Sadakat Kademeleri
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${currentTier.id === 'bronz' ? 'bg-[#242426] border-[#3A3A3C]' : 'bg-[#000000] border-[#2C2C2E] opacity-75'}`}>
              <div className="flex items-center justify-between font-bold text-[#F5F5F7]">
                <span>Bronz Sürücü</span>
                <span className="text-[10px] text-[#A1A1A6] tabular-nums">0 – 5 Şarj</span>
              </div>
              <p className="text-[11px] text-[#A1A1A6]">Standart üyelik, %0 Para Puan.</p>
            </div>

            <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${currentTier.id === 'gumus' ? 'bg-[#242426] border-[#3A3A3C]' : 'bg-[#000000] border-[#2C2C2E] opacity-75'}`}>
              <div className="flex items-center justify-between font-bold text-[#F5F5F7]">
                <span>Gümüş Sürücü</span>
                <span className="text-[10px] text-[#A1A1A6] tabular-nums">6 – 15 Şarj</span>
              </div>
              <div className="text-[11px] text-[#A1A1A6] flex items-center flex-wrap gap-1">
                <span>%2 Para Puan, 15 dk ücretsiz</span>
                <span className="inline-flex items-center">
                  <span>işgal süresi</span>
                  <InfoTip id="overstay" />
                </span>
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${currentTier.id === 'altin' ? 'bg-[#242426] border-[#3A3A3C]' : 'bg-[#000000] border-[#2C2C2E] opacity-75'}`}>
              <div className="flex items-center justify-between font-bold text-[#F5F5F7]">
                <span>Altın sürücü (Siz)</span>
                <span className="text-[10px] text-[#A1A1A6] tabular-nums">16 – 39 Şarj</span>
              </div>
              <div className="text-[11px] text-[#A1A1A6] flex items-center flex-wrap gap-1">
                <span>%3 Para Puan, 30 dk ücretsiz</span>
                <span className="inline-flex items-center">
                  <span>işgal süresi</span>
                  <InfoTip id="overstay" />
                </span>
                <span>ve yılda 1 ücretsiz iptal.</span>
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${currentTier.id === 'platin' ? 'bg-[#242426] border-[#3A3A3C]' : 'bg-[#000000] border-[#2C2C2E] opacity-75'}`}>
              <div className="flex items-center justify-between font-bold text-[#F5F5F7]">
                <span>Platin Sürücü</span>
                <span className="text-[10px] text-[#A1A1A6] tabular-nums">40+ Şarj</span>
              </div>
              <div className="text-[11px] text-[#A1A1A6] flex items-center flex-wrap gap-1">
                <span>%5 Para Puan, 60 dk</span>
                <span className="inline-flex items-center">
                  <span>işgal süresi</span>
                  <InfoTip id="overstay" />
                </span>
                <span>toleransı ve 7/24 öncelikli destek.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Super Host Commission Benefit Box */}
        <div className="bg-[#000000] p-4 rounded-2xl border border-[#2C2C2E] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 font-bold text-xs text-[#F5F5F7]">
              <span>Süper Ev Sahibi</span>
              <InfoTip id="superhost" />
              <span>Komisyon Avantajı</span>
              <InfoTip id="commission" />
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#1C1C1E] border border-[#3A3A3C] text-[#F5F5F7] font-semibold tabular-nums">
              %10 Komisyon (Standart: %15)
            </span>
          </div>
          <p className="text-[11px] text-[#A1A1A6] leading-relaxed">
            40+ başarılı şarj, %2 altı iptal, 4,90 üzeri puan ve 10 dk altı ortalama yanıtla platform komisyonu %15 yerine %10 uygulanır.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-full bg-[#F5F5F7] text-black font-semibold text-xs hover:bg-white transition-all shadow-sm"
        >
          Kapat
        </button>
      </div>
    </div>
  );
};

// --- SİMÜLE EDİLEN ARAÇ MODELLERİ (AC KABUL GÜCÜ İLE) ---
const EV_MODELS = [
  {
    id: 'togg-t10x',
    name: 'TOGG T10X Uzun Menzil',
    batteryCapacity: 88.5,
    maxChargeRateKw: 180,
    acKw: 11,
    has22Option: true,
    label: 'TOGG T10X',
    targetEnergy60Pct: 53.1 // %20 -> %80 resmi batarya enerjisi (88.5 kWh * 0.60 = 53.1 kWh)
  },
  {
    id: 'hyundai-ioniq5',
    name: 'Hyundai Ioniq 5',
    batteryCapacity: 77.4,
    maxChargeRateKw: 232,
    acKw: 11,
    has22Option: false,
    label: 'Hyundai Ioniq 5',
    targetEnergy60Pct: 46.4
  },
  {
    id: 'porsche-taycan',
    name: 'Porsche Taycan GTS',
    batteryCapacity: 93.4,
    maxChargeRateKw: 270,
    acKw: 11, // Standart donanımda resmi 11 kW AC dahili şarj
    has22Option: true,
    label: 'Porsche Taycan',
    targetEnergy60Pct: 60.7
  },
  {
    id: 'bmw-i4',
    name: 'BMW i4 eDrive40',
    batteryCapacity: 80.7,
    maxChargeRateKw: 205,
    acKw: 11,
    has22Option: false,
    label: 'BMW i4',
    targetEnergy60Pct: 52.5
  },
  {
    id: 'renault-zoe',
    name: 'Renault Zoe E-Tech',
    batteryCapacity: 52.0,
    maxChargeRateKw: 50,
    acKw: 22,
    has22Option: true,
    label: 'Renault Zoe',
    targetEnergy60Pct: 33.8
  }
];

// Sayı ve Birim Formatlayıcılar (Gereksiz ondalık yok, para alanları 2 ondalıklı)
const formatKwh = (val) => {
  const num = Number(val) || 0;
  if (Math.round(num) === num || num % 1 === 0) {
    return `${Math.round(num).toLocaleString('tr-TR')} kWh`;
  }
  return `${num.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh`;
};

const formatPrice = (val) => {
  const num = Number(val) || 0;
  return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const DEFAULT_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' width='100%25' height='100%25'%3E%3Crect width='400' height='300' fill='%231C1C1E'/%3E%3Ccircle cx='200' cy='120' r='44' fill='%232C2C2E'/%3E%3Cpath d='M195 92 L212 92 L200 116 L216 116 L187 154 L197 126 L185 126 Z' fill='%2330C27C'/%3E%3Ctext x='200' y='200' text-anchor='middle' fill='%23A1A1A6' font-family='-apple-system, BlinkMacSystemFont, sans-serif' font-size='13' font-weight='500'%3EChargeRent İstasyonu%3C/text%3E%3C/svg%3E";

// Şarj Gücü & Süre Hesaplama Kuralı:
// Efektif güç = min(istasyon kW, araç AC kW)
// Süre = enerji / efektif güç × 1,1 verimlilik payı
// TOGG T10X Long Range resmi batarya kapasitesi: 88.5 kWh (%20→%80 = 53.1 kWh)
const calculateChargingSession = (stationKw = 22, carAcKw = 11, energyKwh = 53.1) => {
  const stKw = Number(stationKw) || 11;
  const cAcKw = Number(carAcKw) || 11;
  const effectiveKw = Math.min(stKw, cAcKw);
  const durationHours = (energyKwh / effectiveKw) * 1.1;
  const durationMinutes = Math.round(durationHours * 60);
  const isLimitedByCar = stKw > cAcKw;
  const limitNote = isLimitedByCar ? `İstasyon ${stKw} kW; aracınız en fazla ${cAcKw} kW kabul eder.` : null;

  return {
    effectiveKw,
    durationHours,
    durationMinutes,
    isLimitedByCar,
    limitNote
  };
};

// --- 5 ADET İSTANBUL ANADOLU YAKASI İSTASYONU (HER BİRİ FARKLI VE ÖZGÜN FOTOĞRAFLI) ---
const INITIAL_STATIONS = [
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
    topPct: 45,
    leftPct: 22,
    circleRadius: 62,
    exactAddress: 'Örnek Sk. No:1, Garaj kodu: #0000, Kadıköy / İstanbul',
    approxAddress: 'Örnek Mahallesi Yakınları, Kadıköy / İstanbul',
    hostPhone: 'Telefon paylaşılmadı',
    hostName: 'Örnek Ev Sahibi',
    powerKw: 22,
    plugType: 'Type 2',
    isSolarPowered: true,
    totalEarned: 14250,
    distanceKm: 1.4,
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
    isSuperHost: true,
    completedCharges: 32,
    cancellationRate: 0.01,
    avgResponseMinutes: 6,
    lat: 40.9712,
    lng: 29.0435,
    topPct: 62,
    leftPct: 78,
    circleRadius: 58,
    exactAddress: 'Örnek Mah. Örnek Sk. No:2, Kadıköy / İstanbul',
    approxAddress: 'Örnek Mahallesi Yakınları, Kadıköy / İstanbul',
    hostPhone: 'Telefon paylaşılmadı',
    hostName: 'Örnek Ev Sahibi',
    powerKw: 11,
    plugType: 'Type 2',
    isSolarPowered: false,
    totalEarned: 11400,
    distanceKm: 2.3,
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
    isSuperHost: true,
    completedCharges: 28,
    cancellationRate: 0.01,
    avgResponseMinutes: 8,
    lat: 40.9924,
    lng: 29.1128,
    topPct: 79,
    leftPct: 53,
    circleRadius: 66,
    exactAddress: 'Örnek Mah. Örnek Sk. No:3, Ataşehir / İstanbul',
    approxAddress: 'Örnek Mahallesi Yakınları, Ataşehir / İstanbul',
    hostPhone: 'Telefon paylaşılmadı',
    hostName: 'Örnek Ev Sahibi',
    powerKw: 11,
    plugType: 'Type 2',
    isSolarPowered: false,
    totalEarned: 9800,
    distanceKm: 6.1,
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
    topPct: 27,
    leftPct: 79,
    circleRadius: 55,
    exactAddress: 'Örnek Mah. Örnek Sk. No:4, Çekmeköy / İstanbul',
    approxAddress: 'Örnek Mahallesi Yakınları, Çekmeköy / İstanbul',
    hostPhone: 'Telefon paylaşılmadı',
    hostName: 'Örnek Ev Sahibi',
    powerKw: 7,
    plugType: 'Type 2',
    isSolarPowered: true,
    totalEarned: 16700,
    distanceKm: 8.5,
    stationImage: '/public/images/station-4.svg',
    description: 'Müstakil villa bahçesinde 7 kW monofaze/trifaze güvenli şarj noktası.'
  },
  {
    id: 'st-05',
    name: 'Ümraniye, kapalı otopark',
    locationArea: 'Yamanevler, Ümraniye',
    specs: 'Type 2 · 22 kW · Kapalı otopark',
    statusText: 'Bugün 15:00 sonrası müsait',
    pricePerKwh: 6.20,
    hostRating: 4.86,
    isSuperHost: true,
    completedCharges: 44,
    cancellationRate: 0.01,
    avgResponseMinutes: 5,
    lat: 41.0285,
    lng: 29.1170,
    topPct: 38,
    leftPct: 54,
    circleRadius: 60,
    exactAddress: 'Örnek Mah. Örnek Sk. No:5, Ümraniye / İstanbul',
    approxAddress: 'Örnek Mahallesi Yakınları, Ümraniye / İstanbul',
    hostPhone: 'Telefon paylaşılmadı',
    hostName: 'Örnek Ev Sahibi',
    powerKw: 22,
    plugType: 'Type 2',
    isSolarPowered: false,
    totalEarned: 13200,
    distanceKm: 4.8,
    stationImage: '/public/images/station-5.svg',
    description: 'Ümraniye merkezde rezidans kapalı otoparkında 22 kW hızlı şarj noktası.'
  }
];

const DISTRICT_COORDS = {
  'Kadıköy': { lat: 40.9856, lng: 29.0275, topPct: 52, leftPct: 35 },
  'Üsküdar': { lat: 41.0260, lng: 29.0160, topPct: 32, leftPct: 30 },
  'Ataşehir': { lat: 40.9924, lng: 29.1128, topPct: 75, leftPct: 55 },
  'Beşiktaş': { lat: 41.0428, lng: 29.0077, topPct: 25, leftPct: 20 },
  'Şişli': { lat: 41.0600, lng: 28.9870, topPct: 18, leftPct: 18 },
  'Maltepe': { lat: 40.9250, lng: 29.1300, topPct: 85, leftPct: 65 },
  'Çekmeköy': { lat: 41.0352, lng: 29.1738, topPct: 28, leftPct: 80 },
  'Sarıyer': { lat: 41.1664, lng: 29.0498, topPct: 12, leftPct: 25 }
};

const ARCHITECTURE_NODES = [
  {
    id: 'postgis',
    title: 'PostgreSQL + PostGIS',
    category: 'Mekansal Veritabanı',
    icon: 'database',
    description: 'Sürücünün konumuna göre en yakın şarj soketlerini ST_DWithin indeksli mekansal sorgu ile anında hesaplar.',
    techDetails: 'Index: GIST(location) | Query: ST_DWithin(geom, ST_MakePoint(lng, lat), radius)'
  },
  {
    id: 'timescaledb',
    title: 'TimescaleDB / InfluxDB',
    category: 'Zaman Serisi Telemetrisi',
    icon: 'activity',
    description: 'Şarj sırasındaki 1 saniyelik aralıklı voltaj, amper, güç (kW) ve batarya sıcaklık verilerini depolar.',
    techDetails: 'Chunk Interval: 1 hour | Sıkıştırma Aktif'
  },
  {
    id: 'redis',
    title: 'Redis (Mekansal Önbellek)',
    category: 'Önbellek Sistemleri',
    icon: 'zap',
    description: 'İstasyonların canlı doluluk durumunu (Müsait/Kullanımda) milisaniyeler seviyesinde sunar.',
    techDetails: 'GEOADD / GEORADIUS & Dağıtık Kilitleme (Redlock)'
  },
  {
    id: 'websocket',
    title: 'OCPP 2.0.1 İletişim Ağ Geçidi',
    category: 'IoT İletişim Protokolü',
    icon: 'wifi',
    description: 'Akıllı şarj kutuları (Wallbox) ile çift yönlü Open Charge Point Protocol iletişimi sağlar.',
    techDetails: 'Full-duplex WebSocket JSON-RPC 2.0 | Kalp Atışı: 10s'
  },
  {
    id: 'kafka',
    title: 'Apache Kafka Olay Akışı',
    category: 'Olay Akış Veriyolu',
    icon: 'cpu',
    description: 'ŞarjBaşladı, SayaçGüncellendi, ÖdemeTamamlandı ve AcilDurdurma olaylarını servisler arasında dağıtır.',
    techDetails: 'Konular: ev.telemetry.v1, ev.billing.v1 | Saklama: 7 Gün'
  }
];

// --- GEZİNME BARI (NAVBAR) ---
const Navbar = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  onOpenHowItWorks,
  onOpenLoginModal,
  activeSession,
  onStartTour,
  onLogoClick,
  currentUser,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#000000]/90 backdrop-blur-md border-b border-[#2C2C2E]/50">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-12 h-[88px] flex items-center justify-between">
        
        {/* 1. Logo (Yalnızca "ChargeRent" Yazısı, İçerik Kolonuyla Tam Hizalı) */}
        <div 
          role="button"
          tabIndex={0}
          aria-label="ChargeRent ana sayfa"
          className="cursor-pointer select-none group flex items-center outline-none" 
          onClick={onLogoClick || (() => setActiveTab(userRole === 'driver' ? 'map' : 'host'))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (onLogoClick) onLogoClick();
              else setActiveTab(userRole === 'driver' ? 'map' : 'host');
            }
          }}
        >
          <span 
            className="font-bold text-[26px] sm:text-[32px] text-[#F5F5F7] group-hover:text-white transition-colors leading-none"
            style={{ letterSpacing: '-0.03em' }}
          >
            ChargeRent
          </span>
        </div>

        {/* 2. Orta Menü (Masaüstü) */}
        <nav className="hidden lg:flex items-center space-x-7 text-sm">
          {userRole === 'driver' ? (
            <>
              <button
                onClick={() => setActiveTab('map')}
                className={`transition-colors font-medium text-xs sm:text-sm cursor-pointer ${
                  activeTab === 'map' ? 'text-[#F5F5F7]' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
                }`}
              >
                Keşfet
              </button>
              <button
                onClick={() => setActiveTab('seans')}
                className={`transition-colors font-medium text-xs sm:text-sm flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'seans' ? 'text-[#30C27C] font-semibold' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
                }`}
              >
                {activeSession ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C] animate-pulse"></span>
                    <span>Canlı seans</span>
                  </>
                ) : (
                  <span>Şarj seansım</span>
                )}
              </button>
              <button
                onClick={onOpenHowItWorks}
                className="text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors font-medium text-xs sm:text-sm cursor-pointer"
              >
                Nasıl çalışır?
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('host')}
                className={`transition-colors font-medium text-xs sm:text-sm cursor-pointer ${
                  activeTab === 'host' ? 'text-[#F5F5F7] font-semibold' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
                }`}
              >
                Genel bakış
              </button>
              <button
                onClick={() => setActiveTab('host-stations')}
                className={`transition-colors font-medium text-xs sm:text-sm cursor-pointer ${
                  activeTab === 'host-stations' || activeTab === 'host-schedule' || activeTab === 'host-add-station'
                    ? 'text-[#F5F5F7] font-semibold'
                    : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
                }`}
              >
                İstasyonlarım
              </button>
              <button
                onClick={() => setActiveTab('host-reservations')}
                className={`transition-colors font-medium text-xs sm:text-sm cursor-pointer ${
                  activeTab === 'host-reservations' || activeTab === 'seans-ozeti' ? 'text-[#F5F5F7] font-semibold' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
                }`}
              >
                Rezervasyonlar
              </button>
              <button
                onClick={() => setActiveTab('host-payouts')}
                className={`transition-colors font-medium text-xs sm:text-sm cursor-pointer ${
                  activeTab === 'host-payouts' ? 'text-[#F5F5F7] font-semibold' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
                }`}
              >
                Kazançlar
              </button>
            </>
          )}
        </nav>

        {/* 3. Sağ Menü: Demoyu Gez + Sürücü | Ev sahibi Anahtarı + Avatar */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 text-sm">
          {onStartTour && (
            <button
              onClick={onStartTour}
              className="hidden md:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-[#2C2C2E] hover:border-[#3A3A3C] text-xs font-medium text-[#F5F5F7] transition-all cursor-pointer shadow-sm"
              title="5 adımlı rehberli demo turunu başlat"
            >
              <LucideIcon name="compass" className="w-3.5 h-3.5 text-[#30C27C]" />
              <span>Demoyu gez</span>
            </button>
          )}

          {/* İki Seçenekli Anahtar: Sürücü | Ev sahibi */}
          <div className="bg-[#1C1C1E] p-1 rounded-full border border-[#2C2C2E] flex items-center shadow-inner">
            <button
              onClick={() => {
                if (userRole !== 'driver') {
                  if (window.location.hash && window.location.hash.includes('host')) {
                    history.replaceState(null, '', window.location.pathname + window.location.search);
                  }
                  setUserRole('driver');
                  setActiveTab('map');
                }
              }}
              className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                userRole === 'driver'
                  ? 'bg-[#F5F5F7] text-black font-semibold shadow-sm'
                  : 'text-[#A1A1A6] hover:text-[#F5F5F7] font-medium'
              }`}
            >
              Sürücü
            </button>
            <button
              onClick={() => {
                if (userRole !== 'host') {
                  setUserRole('host');
                  setActiveTab('host');
                }
              }}
              className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                userRole === 'host'
                  ? 'bg-[#F5F5F7] text-black font-semibold shadow-sm'
                  : 'text-[#A1A1A6] hover:text-[#F5F5F7] font-medium'
              }`}
            >
              Ev sahibi
            </button>
          </div>

          {/* Avatar / Kullanıcı Profili */}
          {currentUser ? (
            <div className="flex items-center space-x-2 bg-[#1C1C1E] pl-2.5 pr-1.5 py-1 rounded-full border border-[#2C2C2E]">
              <span className="w-2 h-2 rounded-full bg-[#30C27C]"></span>
              <span className="text-xs font-semibold text-[#F5F5F7] max-w-[110px] truncate">
                {currentUser.full_name}
              </span>
              <button
                onClick={onLogout}
                className="text-[11px] text-[#A1A1A6] hover:text-[#FF453A] px-2 py-0.5 rounded-full hover:bg-[#2C2C2E] transition-colors cursor-pointer"
                title="Çıkış yap"
              >
                Çıkış
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLoginModal}
              className="px-3 sm:px-3.5 py-1.5 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] hover:border-[#3A3A3C] text-xs font-medium text-[#F5F5F7] hover:text-white transition-all cursor-pointer flex items-center space-x-1.5"
              title="Profil / Giriş"
            >
              <LucideIcon name="user" className="w-3.5 h-3.5 text-[#30C27C]" />
              <span>Giriş</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

// --- MOBİL ALT GEZİNME DOCK'U (IOS STYLE BOTTOM TAB BAR) ---
const MobileBottomNav = ({ activeTab, setActiveTab, userRole, setUserRole, onOpenLoginModal }) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-[#000000]/95 backdrop-blur-2xl border-t border-[#2C2C2E]/80 px-3 sm:px-6 py-2 flex items-center justify-around text-[10px] select-none shadow-[0_-8px_24px_rgba(0,0,0,0.7)]">
      {userRole === 'driver' ? (
        <>
          <button
            key="mob-driver-map"
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center space-y-1 transition-all px-2.5 py-1 rounded-xl ${
              activeTab === 'map' ? 'text-[#30C27C] font-semibold scale-105' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
            }`}
          >
            <LucideIcon name="compass" className="w-5 h-5" />
            <span>Keşfet</span>
          </button>

          <button
            key="mob-driver-simdi"
            onClick={() => setActiveTab('simdi')}
            className={`flex flex-col items-center space-y-1 transition-all px-2.5 py-1 rounded-xl ${
              activeTab === 'simdi' ? 'text-[#30C27C] font-semibold scale-105' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
            }`}
          >
            <LucideIcon name="zap" className="w-5 h-5" />
            <span>Şimdi</span>
          </button>

          <button
            key="mob-driver-seans"
            onClick={() => setActiveTab('seans')}
            className={`flex flex-col items-center space-y-1 transition-all px-2.5 py-1 rounded-xl relative ${
              activeTab === 'seans' ? 'text-[#30C27C] font-semibold scale-105' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
            }`}
          >
            <div className="relative">
              <LucideIcon name="battery-charging" className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#30C27C] animate-pulse"></span>
            </div>
            <span>Seans</span>
          </button>

          <button
            key="mob-driver-host"
            onClick={() => {
              setUserRole('host');
              setActiveTab('host');
            }}
            className="flex flex-col items-center space-y-1 text-[#A1A1A6] hover:text-[#F5F5F7] transition-all px-2.5 py-1 rounded-xl"
          >
            <LucideIcon name="home" className="w-5 h-5" />
            <span>Ev sahibi</span>
          </button>

          <button
            key="mob-driver-login"
            onClick={onOpenLoginModal}
            className="flex flex-col items-center space-y-1 text-[#A1A1A6] hover:text-[#F5F5F7] transition-all px-2.5 py-1 rounded-xl"
          >
            <LucideIcon name="user" className="w-5 h-5" />
            <span>Giriş</span>
          </button>
        </>
      ) : (
        <>
          <button
            key="mob-host-panel"
            onClick={() => setActiveTab('host')}
            className={`flex flex-col items-center space-y-1 transition-all px-2 py-1 rounded-xl ${
              activeTab === 'host' ? 'text-[#30C27C] font-semibold scale-105' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
            }`}
          >
            <LucideIcon name="layout-dashboard" className="w-5 h-5" />
            <span>Panel</span>
          </button>

          <button
            key="mob-host-stations"
            onClick={() => setActiveTab('host-stations')}
            className={`flex flex-col items-center space-y-1 transition-all px-2 py-1 rounded-xl ${
              activeTab === 'host-stations' || activeTab === 'host-schedule' || activeTab === 'host-add-station' ? 'text-[#30C27C] font-semibold scale-105' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
            }`}
          >
            <LucideIcon name="plug" className="w-5 h-5" />
            <span>İstasyon</span>
          </button>

          <button
            key="mob-host-reservations"
            onClick={() => setActiveTab('host-reservations')}
            className={`flex flex-col items-center space-y-1 transition-all px-2 py-1 rounded-xl ${
              activeTab === 'host-reservations' ? 'text-[#30C27C] font-semibold scale-105' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
            }`}
          >
            <LucideIcon name="calendar" className="w-5 h-5" />
            <span>Randevu</span>
          </button>

          <button
            key="mob-host-payouts"
            onClick={() => setActiveTab('host-payouts')}
            className={`flex flex-col items-center space-y-1 transition-all px-2 py-1 rounded-xl ${
              activeTab === 'host-payouts' ? 'text-[#30C27C] font-semibold scale-105' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
            }`}
          >
            <LucideIcon name="wallet" className="w-5 h-5" />
            <span>Kazançlar</span>
          </button>

          <button
            key="mob-host-driver"
            onClick={() => {
              if (window.location.hash && window.location.hash.includes('host')) {
                history.replaceState(null, '', window.location.pathname + window.location.search);
              }
              setUserRole('driver');
              setActiveTab('map');
            }}
            className="flex flex-col items-center space-y-1 text-[#A1A1A6] hover:text-[#F5F5F7] transition-all px-2 py-1 rounded-xl"
          >
            <LucideIcon name="compass" className="w-5 h-5" />
            <span>Sürücü</span>
          </button>
        </>
      )}
    </nav>
  );
};

// --- DOĞAL DİLDE ARAMA SERVİS KATMANI (SIMULATION / AI QUERY PARSER SERVICE) ---
// İleride gerçek bir LLM / NLP servisi (OpenAI / Gemini API vb.) ile tek noktadan değiştirilebilir.
const SearchQueryService = {
  /**
   * Doğal dilde girilen arama cümlesini kural tabanlı regex ve anahtar kelime eşleştirme ile çözümler.
   * Çıkarılan alanlar:
   * - Konum: Kadıköy, Ataşehir, Ümraniye, Çekmeköy, Fenerbahçe
   * - Zaman: "şimdi", "bugün", "yarın", "akşam", "sabah", "gece", saat aralığı
   * - Güç: "7/11/22 kW", "hızlı"
   * - Sıralama: "en ucuz", "en yakın", "en yüksek puan"
   * - Soket tipi: "Type 2", "CCS2"
   *
   * @param {string} text - Kullanıcının yazdığı doğal dilde arama metni
   * @returns {Object} { rawQuery, hasAnyMatch, filters, chips, unparsed }
   */
  parseQuery(text) {
    if (!text || typeof text !== 'string') {
      return {
        rawQuery: '',
        hasAnyMatch: false,
        filters: {},
        chips: [],
        unparsed: false,
      };
    }

    const rawQuery = text.trim();
    if (!rawQuery) {
      return {
        rawQuery: '',
        hasAnyMatch: false,
        filters: {},
        chips: [],
        unparsed: false,
      };
    }

    // Ekleri temizle (örn. Kadıköy'de, Ataşehir'e, vb.) ve küçük harfe çevir
    const lower = rawQuery
      .toLocaleLowerCase('tr-TR')
      .replace(/['’]de\b/gi, '')
      .replace(/['’]da\b/gi, '')
      .replace(/['’]te\b/gi, '')
      .replace(/['’]ta\b/gi, '')
      .replace(/['’]ye\b/gi, '')
      .replace(/['’]ya\b/gi, '')
      .replace(/['’]e\b/gi, '')
      .replace(/['’]a\b/gi, '')
      .replace(/['’]deki\b/gi, '')
      .replace(/['’]daki\b/gi, '');

    const filters = {};
    const chips = [];

    // 1. Konum (Kadıköy, Üsküdar, Beşiktaş, Şişli, Ataşehir, Ümraniye, Çekmeköy, vb.)
    if (/fenerbah[çc]e/i.test(lower)) {
      filters.location = 'Fenerbahçe';
      chips.push({ key: 'location', label: 'Konum', value: 'Fenerbahçe' });
    } else if (/([üu]sk[üu]dar)/i.test(lower)) {
      filters.location = 'Üsküdar';
      chips.push({ key: 'location', label: 'Konum', value: 'Üsküdar' });
    } else if (/be[sş]ikta[sş]/i.test(lower)) {
      filters.location = 'Beşiktaş';
      chips.push({ key: 'location', label: 'Konum', value: 'Beşiktaş' });
    } else if (/[sş]i[sş]li/i.test(lower)) {
      filters.location = 'Şişli';
      chips.push({ key: 'location', label: 'Konum', value: 'Şişli' });
    } else if (/bak[ıi]rk[öo]y/i.test(lower)) {
      filters.location = 'Bakırköy';
      chips.push({ key: 'location', label: 'Konum', value: 'Bakırköy' });
    } else if (/beyo[gğ]lu/i.test(lower)) {
      filters.location = 'Beyoğlu';
      chips.push({ key: 'location', label: 'Konum', value: 'Beyoğlu' });
    } else if (/sar[ıi]yer/i.test(lower)) {
      filters.location = 'Sarıyer';
      chips.push({ key: 'location', label: 'Konum', value: 'Sarıyer' });
    } else if (/maltepe/i.test(lower)) {
      filters.location = 'Maltepe';
      chips.push({ key: 'location', label: 'Konum', value: 'Maltepe' });
    } else if (/kartal/i.test(lower)) {
      filters.location = 'Kartal';
      chips.push({ key: 'location', label: 'Konum', value: 'Kartal' });
    } else if (/pendik/i.test(lower)) {
      filters.location = 'Pendik';
      chips.push({ key: 'location', label: 'Konum', value: 'Pendik' });
    } else if (/fatih/i.test(lower)) {
      filters.location = 'Fatih';
      chips.push({ key: 'location', label: 'Konum', value: 'Fatih' });
    } else if (/beykoz/i.test(lower)) {
      filters.location = 'Beykoz';
      chips.push({ key: 'location', label: 'Konum', value: 'Beykoz' });
    } else if (/tuzla/i.test(lower)) {
      filters.location = 'Tuzla';
      chips.push({ key: 'location', label: 'Konum', value: 'Tuzla' });
    } else if (/ka[gğ][ıi]thane/i.test(lower)) {
      filters.location = 'Kağıthane';
      chips.push({ key: 'location', label: 'Konum', value: 'Kağıthane' });
    } else if (/zeytinburnu/i.test(lower)) {
      filters.location = 'Zeytinburnu';
      chips.push({ key: 'location', label: 'Konum', value: 'Zeytinburnu' });
    } else if (/k[üu][çc][üu]k[çc]ekmece/i.test(lower)) {
      filters.location = 'Küçükçekmece';
      chips.push({ key: 'location', label: 'Konum', value: 'Küçükçekmece' });
    } else if (/b[üu]y[üu]k[çc]ekmece/i.test(lower)) {
      filters.location = 'Büyükçekmece';
      chips.push({ key: 'location', label: 'Konum', value: 'Büyükçekmece' });
    } else if (/ba[sş]ak[sş]ehir/i.test(lower)) {
      filters.location = 'Başakşehir';
      chips.push({ key: 'location', label: 'Konum', value: 'Başakşehir' });
    } else if (/kad[ıi]k[öo]y/i.test(lower)) {
      filters.location = 'Kadıköy';
      chips.push({ key: 'location', label: 'Konum', value: 'Kadıköy' });
    } else if (/ata[sş]ehir/i.test(lower)) {
      filters.location = 'Ataşehir';
      chips.push({ key: 'location', label: 'Konum', value: 'Ataşehir' });
    } else if (/([üu]mraniye)/i.test(lower)) {
      filters.location = 'Ümraniye';
      chips.push({ key: 'location', label: 'Konum', value: 'Ümraniye' });
    } else if (/[çc]ekmek[öo]y/i.test(lower)) {
      filters.location = 'Çekmeköy';
      chips.push({ key: 'location', label: 'Konum', value: 'Çekmeköy' });
    } else if (/moda/i.test(lower)) {
      filters.location = 'Kadıköy';
      chips.push({ key: 'location', label: 'Konum', value: 'Moda' });
    }

    // 2. Zaman ("şimdi", "bugün", "yarın", "akşam", "sabah", "gece", saat aralığı)
    const timeTokens = [];
    if (/\b(yar[ıi]n)\b/i.test(lower)) timeTokens.push('Yarın');
    else if (/\b(bug[üu]n)\b/i.test(lower)) timeTokens.push('Bugün');
    else if (/\b([şs]imdi)\b/i.test(lower)) timeTokens.push('Şimdi');

    if (/\b(ak[şs]am)\b/i.test(lower)) timeTokens.push('akşam');
    else if (/\b(sabah)\b/i.test(lower)) timeTokens.push('sabah');
    else if (/\b(gece)\b/i.test(lower)) timeTokens.push('gece');
    else if (/\b([öo][ğg]le|öğlen)\b/i.test(lower)) timeTokens.push('öğlen');

    const hourMatch = lower.match(/\b(\d{1,2}[:.]\d{2}(?:\s*-\s*\d{1,2}[:.]\d{2})?)\b/);
    if (hourMatch) {
      timeTokens.push(hourMatch[1].replace('.', ':'));
    }

    if (timeTokens.length > 0) {
      const timeVal = timeTokens.join(' ');
      filters.time = timeVal;
      chips.push({ key: 'time', label: 'Zaman', value: timeVal });
    }

    // 3. Güç ("7/11/22 kW", "hızlı")
    if (/\b(22\s*kw)\b/i.test(lower)) {
      filters.power = 22;
      chips.push({ key: 'power', label: 'Güç', value: '22 kW' });
    } else if (/\b(11\s*kw)\b/i.test(lower)) {
      filters.power = 11;
      chips.push({ key: 'power', label: 'Güç', value: '11 kW' });
    } else if (/\b(7(?:\.4)?\s*kw)\b/i.test(lower)) {
      filters.power = 7;
      chips.push({ key: 'power', label: 'Güç', value: '7 kW' });
    } else if (/\b(h[ıi]zl[ıi]|dc|y[üu]ksek h[ıi]zl[ıi])\b/i.test(lower)) {
      filters.power = 22;
      chips.push({ key: 'power', label: 'Güç', value: 'Hızlı (22+ kW)' });
    }

    // 4. Sıralama ("en ucuz", "en yakın", "en yüksek puan")
    if (/\b(en\s*ucuz|ucuz|uygun\s*fiyat|ekonomik)\b/i.test(lower)) {
      filters.sort = 'cheapest';
      chips.push({ key: 'sort', label: 'Sıralama', value: 'En ucuz' });
    } else if (/\b(en\s*yak[ıi]n|yak[ıi]n)\b/i.test(lower)) {
      filters.sort = 'closest';
      chips.push({ key: 'sort', label: 'Sıralama', value: 'En yakın' });
    } else if (/\b(en\s*y[üu]ksek\s*puan|y[üu]ksek\s*puan|en\s*iyi|en\s*pop[üu]ler)\b/i.test(lower)) {
      filters.sort = 'rating';
      chips.push({ key: 'sort', label: 'Sıralama', value: 'En yüksek puan' });
    }

    // 5. Soket tipi (Type 2, CCS, CCS2)
    if (/\b(ccs2?|dc\s*ccs)\b/i.test(lower)) {
      filters.plugType = 'CCS2';
      chips.push({ key: 'plugType', label: 'Soket', value: 'CCS2' });
    } else if (/\b(type\s*2|tip\s*2|mennekes)\b/i.test(lower)) {
      filters.plugType = 'Type 2';
      chips.push({ key: 'plugType', label: 'Soket', value: 'Type 2' });
    }

    const hasAnyMatch = chips.length > 0;
    return {
      rawQuery,
      hasAnyMatch,
      filters,
      chips,
      unparsed: !hasAnyMatch && rawQuery.length > 0,
    };
  }
};

// Global dışa aktarım (kolay erişim ve mock testi için)
const parseQuery = (text) => SearchQueryService.parseQuery(text);

const StationMap = ({ stations, setSelectedStation, onBookClick, onStartChargingClick, onNavigateToSimdi, onNavigateToBekleme, onOpenEarningsModal, onStartTour }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [parsedQuery, setParsedQuery] = React.useState(null);
  const [activeFilterChip, setActiveFilterChip] = React.useState('all');
  const [selectedDistrict, setSelectedDistrict] = React.useState('all');
  const [activeStationModal, setActiveStationModal] = React.useState(null);
  const [hoveredStationId, setHoveredStationId] = React.useState(null);
  const [mobileView, setMobileView] = React.useState('list'); // 'list' | 'map'

  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [mobileView]);

  // Kural 10: Tarih ve saat seçildiyse o saatin çarpanlı fiyatını göster, seçilmediyse "₺6,80'den" yaz
  const selectedHour = React.useMemo(() => {
    if (!parsedQuery || !parsedQuery.filters || !parsedQuery.filters.time) return null;
    const t = String(parsedQuery.filters.time).toLowerCase();
    if (t.includes('gece')) return 23;
    if (t.includes('akşam') || t.includes('yoğun')) return 19;
    if (t.includes('öğle') || t.includes('sabah') || t.includes('gündüz')) return 14;
    const m = t.match(/(\d{1,2})/);
    return m ? parseInt(m[1], 10) : 14;
  }, [parsedQuery]);

  const hasTimeSelected = selectedHour !== null;

  const getStationDisplayPrice = (st) => {
    if (!st) return "₺6,80 / kWh'den";
    if (hasTimeSelected) {
      const dyn = getDynamicPriceInfo(st.pricePerKwh, selectedHour);
      return `₺${formatPrice(dyn.finalPrice)} / kWh`;
    }
    return `₺${formatPrice(st.pricePerKwh)} / kWh'den`;
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const result = SearchQueryService.parseQuery(searchQuery);
    setParsedQuery(result);
  };

  const handleResetQuery = () => {
    setSearchQuery('');
    setParsedQuery(null);
    setSelectedDistrict('all');
  };

  // Filtreleme ve Sıralama Mantığı
  const filteredStations = React.useMemo(() => {
    // Sadece doğrulanmış ve açık olan istasyonları listele (Kural 1: Doğrulama Kapısı)
    let list = stations.filter((st) => {
      const isPending = st.status === 'pending_verification' || st.isPendingVerification;
      const isClosed = st.isClosed || st.isAvailable === false;
      return !isPending && !isClosed;
    });

    // 0. İlçe Filtresi
    if (selectedDistrict !== 'all') {
      const distLower = selectedDistrict.toLowerCase();
      list = list.filter((st) => {
        const area = (st.locationArea || '').toLowerCase();
        const name = (st.name || '').toLowerCase();
        const address = ((st.exactAddress || '') + ' ' + (st.approxAddress || '')).toLowerCase();
        if (distLower === 'kadıköy') {
          return area.includes('kadıköy') || area.includes('moda') || area.includes('fenerbahçe');
        }
        return area.includes(distLower) || name.includes(distLower) || address.includes(distLower);
      });
    }

    // 1. Doğal dil arama filtreleri
    if (parsedQuery && parsedQuery.hasAnyMatch) {
      const { filters } = parsedQuery;

      if (filters.location) {
        const locLower = filters.location.toLowerCase();
        list = list.filter((st) => {
          const area = (st.locationArea || '').toLowerCase();
          const name = (st.name || '').toLowerCase();
          if (locLower === 'kadıköy') {
            return area.includes('kadıköy') || area.includes('moda') || area.includes('fenerbahçe');
          }
          return area.includes(locLower) || name.includes(locLower);
        });
      }

      if (filters.power) {
        list = list.filter((st) => (st.powerKw || 0) >= filters.power);
      }

      if (filters.plugType) {
        list = list.filter((st) => st.plugType === filters.plugType);
      }

      // Sıralama
      if (filters.sort === 'cheapest') {
        list.sort((a, b) => a.pricePerKwh - b.pricePerKwh);
      } else if (filters.sort === 'closest') {
        list.sort((a, b) => (a.distanceKm || 99) - (b.distanceKm || 99));
      } else if (filters.sort === 'rating') {
        list.sort((a, b) => (b.hostRating || 0) - (a.hostRating || 0));
      }
    }

    // 2. Manuel Pill Çip Filtreleri
    if (activeFilterChip === 'type2') {
      list = list.filter((st) => st.plugType === 'Type 2');
    } else if (activeFilterChip === 'ccs2') {
      list = list.filter((st) => st.plugType === 'CCS2');
    } else if (activeFilterChip === '11kw') {
      list = list.filter((st) => (st.powerKw || 0) >= 11);
    } else if (activeFilterChip === 'superhost') {
      list = list.filter((st) => isSuperHost(st));
    } else if (activeFilterChip === 'solar') {
      list = list.filter((st) => st.isSolarPowered);
    }

    return list;
  }, [stations, selectedDistrict, activeFilterChip, parsedQuery]);

  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [filteredStations, activeStationModal, parsedQuery]);

  // Haritadaki yaklaşık konum koordinatları ve ekran yerleşimi (Doğrulanan ve açık istasyonlardan dinamik türetilir)
  const mapStationMarkers = React.useMemo(() => {
    return filteredStations.map(st => ({
      id: st.id,
      priceText: getStationDisplayPrice(st),
      topPct: st.topPct !== undefined ? st.topPct : 50,
      leftPct: st.leftPct !== undefined ? st.leftPct : 50,
      circleRadius: st.circleRadius || 60,
    }));
  }, [filteredStations, hasTimeSelected, selectedHour]);

  return (
    <div className="pt-2 pb-12">
      {/* 1. Büyük Başlık ve Alt Açıklama */}
      <div className="pt-6 pb-6 space-y-3">
        <h1 className="hero-title">
          İstanbul'da şarj noktası bul.
        </h1>
        <p className="text-base sm:text-lg text-[#A1A1A6] max-w-2xl font-normal leading-relaxed">
          Komşunun boş duran şarj cihazını saatlik ayır. Fiyat önceden belli, adres rezervasyondan sonra açılır.
        </p>
      </div>

      {/* İki Rol Seçim Kartı: "Şarj noktası arıyorum" & "Evimde şarj cihazı var" */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-3xl mb-7">
        {/* Kart 1: Şarj noktası arıyorum */}
        <div
          onClick={() => {
            const el = document.getElementById('stations-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="p-4 sm:p-5 rounded-3xl bg-[#141416] border border-[#2C2C2E] hover:border-[#3A3A3C] transition-all cursor-pointer group flex items-start space-x-3.5 shadow-sm hover:bg-[#1C1C1E]/60 select-none"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <LucideIcon name="zap" className="w-4.5 h-4.5 text-[#30C27C]" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5 font-semibold text-xs sm:text-sm text-[#F5F5F7] group-hover:text-white">
              <span>Şarj noktası arıyorum</span>
              <span className="text-xs text-[#30C27C] group-hover:translate-y-0.5 transition-transform">↓</span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#A1A1A6] leading-relaxed">
              Yakınındaki istasyonları haritada veya listede incele, hemen şarja başla.
            </p>
          </div>
        </div>

        {/* Kart 2: Evimde şarj cihazı var */}
        <div
          onClick={() => {
            if (onOpenEarningsModal) {
              onOpenEarningsModal();
            }
          }}
          className="p-4 sm:p-5 rounded-3xl bg-[#141416] border border-[#2C2C2E] hover:border-[#3A3A3C] transition-all cursor-pointer group flex items-start space-x-3.5 shadow-sm hover:bg-[#1C1C1E]/60 select-none"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <LucideIcon name="calculator" className="w-4.5 h-4.5 text-[#F5F5F7]" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5 font-semibold text-xs sm:text-sm text-[#F5F5F7] group-hover:text-white">
              <span>Evimde şarj cihazı var</span>
              <span className="text-xs text-[#F5F5F7] group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#A1A1A6] leading-relaxed">
              Gelir hesaplayıcı ile boş duran soketinin aylık potansiyelini öğren.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Tek Büyük Pill Arama Çubuğu & Şimdi Lazım Butonu */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-3xl mb-4">
        {/* Tek Büyük Pill Arama Çubuğu */}
        <form 
          onSubmit={handleSearchSubmit}
          className="search-pill-container flex-1 px-5 py-2.5 flex items-center justify-between shadow-2xl relative"
        >
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Yarın akşam Kadıköy'de en ucuz 11 kW"
            className="bg-transparent border-none outline-none text-[#F5F5F7] placeholder-[#71717A] text-sm w-full font-normal pr-2"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleResetQuery}
              className="p-1 mr-2 text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors"
              title="Temizle"
            >
              <i data-lucide="x" className="w-3.5 h-3.5"></i>
            </button>
          )}
          <button 
            type="submit"
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-[#F5F5F7] transition-all ml-1 shrink-0"
            aria-label="Ara"
          >
            <i data-lucide="search" className="w-4 h-4 text-black"></i>
          </button>
        </form>

        {/* Şimdi Lazım Hızlı Butonu */}
        <button
          type="button"
          onClick={onNavigateToSimdi}
          className="h-[50px] px-5 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs flex items-center justify-center space-x-2 shrink-0 transition-all shadow-lg group"
        >
          <i data-lucide="zap" className="w-4 h-4 text-black fill-black transition-transform group-hover:scale-110"></i>
          <span className="tracking-tight">Şimdi lazım</span>
        </button>
      </div>

      {/* Doğal Dil Çözümleme "Anladığımız:" Satırı ve Hata Mesajı */}
      {parsedQuery && parsedQuery.hasAnyMatch && (
        <div className="flex flex-wrap items-center gap-2 mb-5 text-xs">
          <span className="text-[#A1A1A6] font-medium mr-1">Anladığımız:</span>
          {parsedQuery.chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center px-3 py-1 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] text-xs text-[#F5F5F7]"
            >
              <span className="text-[#A1A1A6] mr-1">{chip.label}:</span>
              <strong className="font-medium text-[#F5F5F7]">{chip.value}</strong>
            </span>
          ))}
          <button
            type="button"
            onClick={handleResetQuery}
            className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] underline ml-2 transition-colors cursor-pointer"
          >
            Düzenle
          </button>
        </div>
      )}

      {parsedQuery && parsedQuery.unparsed && (
        <div className="mb-5 text-xs text-[#A1A1A6] flex items-center space-x-2 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
          <span>Bunu anlayamadık, filtreleri elle seçebilirsin</span>
        </div>
      )}

      {/* 3. Filtre Çipleri (Pill Butonlar) */}
      <div className="flex items-center space-x-2.5 overflow-x-auto pb-6 no-scrollbar">
        {/* İlçe Filtresi Dropdown */}
        <div className="relative inline-block shrink-0">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            aria-label="İlçe filtresi"
            className={`filter-chip pr-6 appearance-none cursor-pointer text-xs ${
              selectedDistrict !== 'all' ? 'filter-chip-active' : 'filter-chip-inactive'
            }`}
          >
            <option value="all" className="bg-[#1C1C1E] text-[#F5F5F7]">İlçe: Tümü</option>
            {['Kadıköy', 'Ataşehir', 'Çekmeköy', 'Ümraniye', 'Beşiktaş', 'Üsküdar', 'Şişli', 'Sarıyer', 'Maltepe'].map((d) => (
              <option key={d} value={d} className="bg-[#1C1C1E] text-[#F5F5F7]">{d}</option>
            ))}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#A1A1A6] text-[9px]">▼</span>
        </div>

        {[
          { id: 'all', label: 'Tümü' },
          { id: 'type2', label: 'Type 2' },
          { id: 'ccs2', label: 'CCS2' },
          { id: '11kw', label: '11 kW ve üzeri' },
          { id: 'superhost', label: 'Süper ev sahibi' },
          { id: 'solar', label: 'Güneş enerjili' },
        ].map((chip) => {
          const isActive = activeFilterChip === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setActiveFilterChip(chip.id)}
              className={`filter-chip shrink-0 ${isActive ? 'filter-chip-active' : 'filter-chip-inactive'}`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* 4. Bölüm Başlığı & Fiyat Notu */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-[#F5F5F7] tracking-tight">
          Yakınında {filteredStations.length} şarj noktası
        </h2>
        <div className="flex items-center text-xs text-[#A1A1A6]">
          <span>Fiyatlar kWh başınadır</span>
          <InfoTip id="kwh" />
        </div>
      </div>

      {/* 5. Ana Düzen: Solda 2 Sütun Kartlar, Sağda Koyu Harita */}
      <div id="stations-section" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start scroll-mt-24">
        
        {/* Sol Kolon: 2 Sütun İlan Kartları */}
        <div className={`lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-7 ${
          mobileView === 'list' ? 'block' : 'hidden lg:grid'
        }`}>
          {filteredStations.map((st) => {
            const isHovered = hoveredStationId === st.id;
            return (
              <div 
                key={st.id} 
                onClick={() => setActiveStationModal(st)}
                onMouseEnter={() => setHoveredStationId(st.id)}
                onMouseLeave={() => setHoveredStationId(null)}
                className={`cursor-pointer group flex flex-col justify-between transition-transform duration-200 ${
                  isHovered ? '-translate-y-0.5' : ''
                }`}
              >
                {/* Görsel / Gerçek İstasyon Fotoğrafı */}
                <div className="station-image-placeholder relative group-hover:border-[#3A3A3C] transition-all overflow-hidden rounded-2xl bg-[#1C1C1E]">
                  <img
                    src={st.stationImage || DEFAULT_IMAGE}
                    alt={st.name || "Şarj istasyonu fotoğrafı"}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_IMAGE; }}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="super-host-pill hidden sm:inline-flex">
                    Süper ev sahibi
                  </div>
                </div>

                {/* İlan Detayları */}
                <div className="mt-2.5 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-semibold text-sm text-[#F5F5F7] group-hover:text-white transition-colors">
                      {st.name}
                    </h3>
                    <span className="text-xs text-[#F5F5F7] flex items-center space-x-1 tabular-nums font-normal">
                      <span>★</span>
                      <span>{st.hostRating.toFixed(2).replace('.', ',')}</span>
                    </span>
                  </div>

                  <p className="text-xs text-[#A1A1A6] leading-tight">{st.locationArea}</p>
                  <p className="text-xs text-[#A1A1A6] leading-tight">{st.specs}</p>

                  <div className="flex items-center justify-between pt-1.5">
                    <div className="flex items-center space-x-1.5 text-xs text-[#F5F5F7]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C] shrink-0"></span>
                      <span className="text-xs text-[#F5F5F7]">{st.statusText}</span>
                    </div>
                    <span className="font-semibold text-sm text-[#F5F5F7] tabular-nums">
                      {getStationDisplayPrice(st)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredStations.length === 0 && (
            <div className="col-span-2 py-12 text-center text-[#A1A1A6] text-xs space-y-3 bg-[#1C1C1E]/40 border border-dashed border-[#2C2C2E] rounded-2xl p-6">
              <p className="text-sm font-medium text-[#F5F5F7]">
                {selectedDistrict !== 'all'
                  ? `"${selectedDistrict}" bölgesinde şarj noktası bulunamadı.`
                  : searchQuery
                  ? `"${searchQuery}" için şarj noktası bulunamadı.`
                  : 'Seçilen filtreye uygun şarj noktası bulunamadı.'}
              </p>
              <p className="text-xs text-[#A1A1A6]">
                Bu bölgede ilk şarj noktası açıldığında anında bildirim almak için bekleme listesine kaydolabilirsin.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateToBekleme ? onNavigateToBekleme(selectedDistrict !== 'all' ? selectedDistrict : searchQuery || 'Üsküdar') : null}
                  className="px-5 py-2.5 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>Bu bölgede henüz istasyon yok. Haber ver</span>
                  <span>→</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleResetQuery();
                    setSelectedDistrict('all');
                    setActiveFilterChip('all');
                  }}
                  className="px-4 py-2.5 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] hover:border-[#3A3A3C] text-[#A1A1A6] hover:text-white text-xs transition-all cursor-pointer"
                >
                  Tüm istasyonları göster
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sağ Kolon: Koyu Tasarımlı Harita Kartı */}
        <div className={`lg:col-span-5 sticky top-24 ${
          mobileView === 'map' ? 'block' : 'hidden lg:block'
        }`}>
          <div className="dark-map-container h-[500px] sm:h-[640px] w-full flex flex-col justify-between p-4 relative select-none">
            {/* Küçük "Örnek harita" Etiketi */}
            <div className="absolute top-3 left-3 z-20 pointer-events-none">
              <span className="px-2.5 py-1 rounded-full bg-[#141416]/90 border border-[#2C2C2E] text-[11px] font-medium text-[#A1A1A6] backdrop-blur-md shadow-sm">
                Örnek harita
              </span>
            </div>
            
            {/* Koyu Harita Sokak/Yol Katmanı (Organik Şematik Çizgiler) */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none opacity-45" 
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              viewBox="0 0 500 640"
            >
              {/* Yatay ve çapraz ana arter yollar */}
              <path d="M-20,160 C120,150 280,180 520,170" stroke="#2C2C2E" strokeWidth="8" fill="none" />
              <path d="M-20,310 C150,290 320,350 520,330" stroke="#2C2C2E" strokeWidth="10" fill="none" />
              <path d="M-20,470 C140,490 340,460 520,490" stroke="#2C2C2E" strokeWidth="7" fill="none" />
              <path d="M-20,580 C180,560 360,600 520,570" stroke="#2C2C2E" strokeWidth="6" fill="none" />
              
              {/* Dikey ve eğrisel yollar */}
              <path d="M110,-20 C120,180 140,420 160,660" stroke="#2C2C2E" strokeWidth="9" fill="none" />
              <path d="M330,-20 C340,210 320,430 350,660" stroke="#2C2C2E" strokeWidth="10" fill="none" />
              <path d="M430,-20 C420,190 440,450 430,660" stroke="#2C2C2E" strokeWidth="7" fill="none" />
              <path d="M220,-20 C230,280 210,480 230,660" stroke="#242426" strokeWidth="5" fill="none" />
            </svg>

            {/* Yaklaşık Konum Daireleri & Fiyat Balonları */}
            <div className="absolute inset-0 pointer-events-auto">
              {mapStationMarkers.map((marker) => {
                const isStationVisible = filteredStations.some(s => s.id === marker.id);
                if (!isStationVisible) return null;

                const stationObj = stations.find(s => s.id === marker.id);
                const isHovered = hoveredStationId === marker.id;

                return (
                  <div
                    key={marker.id}
                    style={{
                      position: 'absolute',
                      top: `${marker.topPct}%`,
                      left: `${marker.leftPct}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="flex items-center justify-center cursor-pointer group"
                    onClick={() => setActiveStationModal(stationObj)}
                    onMouseEnter={() => setHoveredStationId(marker.id)}
                    onMouseLeave={() => setHoveredStationId(null)}
                  >
                    {/* Yaklaşık Konum Dairesi (Transparan Aura) */}
                    <div 
                      style={{
                        width: `${marker.circleRadius * 2}px`,
                        height: `${marker.circleRadius * 2}px`,
                      }}
                      className={`rounded-full border transition-all duration-300 pointer-events-none ${
                        isHovered 
                          ? 'border-white/35 bg-white/[0.08] scale-105' 
                          : 'border-white/10 bg-white/[0.03]'
                      }`}
                    />

                    {/* Fiyat Balonu (Merkezde) */}
                    <div className="absolute z-10">
                      <span className={`map-price-pill ${isHovered ? 'active' : ''}`}>
                        {getStationDisplayPrice(stationObj)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Harita İçi Alt Bilgi Notu (Ekran görüntüsüyle birebir) */}
            <div className="mt-auto relative z-20">
              <div className="bg-[#1C1C1E]/85 backdrop-blur-md p-3.5 rounded-xl border border-[#2C2C2E] text-[11px] text-[#A1A1A6] leading-relaxed flex items-center justify-between">
                <span>Haritadaki daireler yaklaşık konumu gösterir. Kesin adres, rezervasyon onaylandıktan sonra paylaşılır.</span>
                <InfoTip id="approxlocation" />
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Bölgenizde istasyon yok mu? Banner'ı */}
      <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-[#141416] border border-[#2C2C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="font-semibold text-sm text-[#F5F5F7]">Bölgenizde istasyon yok mu?</span>
          <p className="text-[#A1A1A6] text-xs">Sokağına veya mahallenize şarj noktası eklendiğinde ilk senin haberin olsun.</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateToBekleme ? onNavigateToBekleme(selectedDistrict !== 'all' ? selectedDistrict : 'Kadıköy') : null}
          className="px-4 py-2 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#F5F5F7] border border-[#3A3A3C] font-medium text-xs transition-all shrink-0 cursor-pointer self-start sm:self-auto"
        >
          Bekleme listesine katıl →
        </button>
      </div>

      {/* Mobilde Harita / Liste Yüzen Butonu (Floating Switcher) */}
      <div className="lg:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
        <button
          type="button"
          onClick={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
          className="bg-[#1C1C1E] border border-[#3A3A3C] text-[#F5F5F7] px-5 py-2.5 rounded-full shadow-2xl flex items-center space-x-2 text-xs font-semibold hover:border-white transition-all backdrop-blur-md active:scale-95"
        >
          {mobileView === 'list' ? (
            <>
              <LucideIcon name="map" className="w-4 h-4 text-[#30C27C]" />
              <span>Haritayı göster</span>
            </>
          ) : (
            <>
              <LucideIcon name="list" className="w-4 h-4 text-[#30C27C]" />
              <span>Listeyi göster</span>
            </>
          )}
        </button>
      </div>

      {/* Tıklanan İlan İçin Detay Modalı (Rezervasyon ve İnceleme) */}
      {activeStationModal && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] p-6 max-w-lg w-full space-y-5 border border-[#3A3A3C] rounded-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveStationModal(null)}
              className="absolute top-4 right-4 text-[#A1A1A6] hover:text-white font-bold text-sm"
            >
              ✕
            </button>

            {/* Modal Başlık & Görsel */}
            <div className="space-y-3">
              <div className="station-image-placeholder h-40 rounded-xl relative overflow-hidden bg-[#1C1C1E]">
                <img
                  src={activeStationModal.stationImage || DEFAULT_IMAGE}
                  alt={activeStationModal.name || "Şarj istasyonu"}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_IMAGE; }}
                  className="w-full h-full object-cover"
                />
                <div className="super-host-pill hidden sm:inline-flex">
                  Süper ev sahibi
                </div>
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-[#F5F5F7]">{activeStationModal.name}</h3>
                  <p className="text-xs text-[#A1A1A6] mt-0.5">{activeStationModal.locationArea}</p>
                  <p className="text-xs text-[#A1A1A6]">{activeStationModal.specs}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#F5F5F7] font-semibold flex items-center space-x-1">
                    <span>★</span>
                    <span>{activeStationModal.hostRating.toFixed(2).replace('.', ',')}</span>
                  </span>
                  <div className="text-base font-bold text-[#F5F5F7] tabular-nums flex items-center justify-end mt-1">
                    <span>₺{activeStationModal.pricePerKwh.toFixed(2).replace('.', ',')}</span>
                    <span className="text-xs font-normal text-[#A1A1A6] ml-1">/kWh</span>
                    <InfoTip id="kwh" />
                  </div>
                </div>
              </div>
            </div>

            {/* Gizlilik & Erişim Notu */}
            <div className="bg-[#000000] p-3 rounded-xl border border-[#2C2C2E] text-xs text-[#A1A1A6] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#F5F5F7]">Yaklaşık konum bilgisi</span>
                <InfoTip id="approxlocation" />
              </div>
              <p>{activeStationModal.approxAddress}</p>
              <p className="text-[11px] text-[#A1A1A6]/80 pt-1 border-t border-[#2C2C2E] mt-1">
                Güvenlik için kesin adres, rezervasyon onaylandıktan sonra paylaşılır.
              </p>
            </div>

            {/* Açıklama */}
            <p className="text-xs text-[#A1A1A6] leading-relaxed">
              {activeStationModal.description}
            </p>

            {/* Butonlar */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => {
                  const st = activeStationModal;
                  setActiveStationModal(null);
                  onBookClick(st);
                }}
                className="flex-1 py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all"
              >
                Rezervasyon yap
              </button>
              <button
                onClick={() => setActiveStationModal(null)}
                className="px-5 py-3 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#F5F5F7] border border-[#3A3A3C] font-medium text-xs transition-all"
              >
                Vazgeç
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};


// --- CANLI TELEMETRİ GÖSTERGESİ & REZERVASYON SONRASI AÇILAN KESİN ADRES ---
const TelemetryDashboard = ({ activeSession, onStopCharging }) => {
  const [telemetry, setTelemetry] = React.useState({
    batteryPct: 42,
    currentKw: 21.8,
    voltage: 398,
    amperage: 54.7,
    tempC: 34.2,
    energyKwhAdded: 14.5,
    elapsedSeconds: 2450,
    costSoFar: 98.60,
    powerHistory: [12, 16, 20, 21.5, 21.8, 22.0, 21.8, 21.9, 21.8]
  });

  const [isFinishedSummaryModal, setIsFinishedSummaryModal] = React.useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = React.useState(false);
  const [isEmergencyConfirming, setIsEmergencyConfirming] = React.useState(false);
  const [emergencyLogs, setEmergencyLogs] = React.useState([]);

  React.useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const newPct = Math.min(100, prev.batteryPct + 0.15);
        const newKwh = prev.energyKwhAdded + 0.035;
        const newElapsed = prev.elapsedSeconds + 1;
        const newCost = newKwh * activeSession.pricePerKwh;
        const kwFluctuation = Number((activeSession.powerKw * (0.95 + Math.random() * 0.08)).toFixed(1));
        const newHistory = [...prev.powerHistory.slice(1), kwFluctuation];

        return {
          ...prev,
          batteryPct: Number(newPct.toFixed(1)),
          energyKwhAdded: Number(newKwh.toFixed(2)),
          elapsedSeconds: newElapsed,
          costSoFar: Number(newCost.toFixed(2)),
          currentKw: kwFluctuation,
          voltage: Math.floor(395 + Math.random() * 6),
          amperage: Number((kwFluctuation * 1000 / 400).toFixed(1)),
          tempC: Number((33 + (newPct / 100) * 8).toFixed(1)),
          powerHistory: newHistory
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [telemetry, activeSession, isFinishedSummaryModal, isEmergencyModalOpen, isEmergencyConfirming]);

  const [showTelemetryDetails, setShowTelemetryDetails] = React.useState(false);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeSession) {
    return (
      <div className="py-20 text-center max-w-lg mx-auto space-y-5">
        <div className="w-16 h-16 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center mx-auto text-[#A1A1A6]">
          <i data-lucide="zap-off" className="w-6 h-6"></i>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[#F5F5F7]">Aktif şarj oturumu yok</h2>
          <p className="text-xs text-[#A1A1A6] max-w-sm mx-auto leading-relaxed">
            Keşfet sekmesinden sana en yakın şarj noktasını seçerek rezervasyon oluşturabilir ve oturumu başlatabilirsin.
          </p>
        </div>
        <button
          onClick={() => {
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'map' }));
            }
          }}
          className="bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs px-6 py-3 rounded-full transition-all shadow-sm inline-flex items-center space-x-2"
        >
          <span>Şarj noktası bul</span>
        </button>
      </div>
    );
  }

  const strokeDashoffset = 440 - (440 * telemetry.batteryPct) / 100;

  return (
    <div className="pt-2 pb-16 space-y-8 w-full">
      {/* 1. Başlık & Açılan Kesin Adres Bilgisi */}
      <div className="border-b border-[#2C2C2E] pb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-2 h-2 rounded-full bg-[#30C27C]"></span>
              <span className="text-xs text-[#A1A1A6]">Şarj devam ediyor</span>
              <span className="text-xs text-[#555558]">·</span>
              <span className="text-xs text-[#A1A1A6]">{activeSession.specs}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#F5F5F7] mt-1.5">{activeSession.name}</h1>
          </div>

          {/* İki Buton: Tek Birincil (Şarjı sonlandır) + İkincil (Acil destek) */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => {
                setIsEmergencyModalOpen(true);
                setIsEmergencyConfirming(false);
              }}
              className="bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#F5F5F7] border border-[#3A3A3C] font-medium text-xs px-4 py-2.5 rounded-full transition-all"
            >
              Acil destek hattı
            </button>
            <button
              onClick={() => setIsFinishedSummaryModal(true)}
              className="bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs px-6 py-2.5 rounded-full transition-all shadow-sm"
            >
              Şarjı sonlandır
            </button>
          </div>
        </div>

        {/* Kesin Adres & Navigasyon Satırı */}
        <div className="p-4 rounded-2xl bg-[#141416] border border-[#2C2C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2 text-[#30C27C] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C]"></span>
              <span>Kesin adres açıldı</span>
            </div>
            <p className="text-[#F5F5F7] font-medium pt-0.5">{activeSession.exactAddress}</p>
            <p className="text-[#A1A1A6] text-[11px]">Ev sahibi: {activeSession.hostName} · {activeSession.hostPhone}</p>
          </div>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${activeSession.lat},${activeSession.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start sm:self-auto px-4 py-2 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#F5F5F7] border border-[#3A3A3C] font-medium text-xs flex items-center space-x-2 transition-all whitespace-nowrap"
          >
            <i data-lucide="navigation" className="w-3.5 h-3.5 text-[#30C27C]"></i>
            <span>Yol tarifi al</span>
          </a>
        </div>
      </div>

      {/* 2. Ana Şarj Durumu (Büyük Gösterge & 3 Kutusuz İnce Çizgili Metrik) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center border-b border-[#2C2C2E] pb-10">
        {/* Dairesel Apple Tarzı Doluluk Halkası */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-52 h-52 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" stroke="#1C1C1E" strokeWidth="9" fill="none" />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="#30C27C"
                strokeWidth="9"
                strokeDasharray="440"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-bold text-[#F5F5F7] tabular-nums tracking-tight">
                %{telemetry.batteryPct}
              </span>
              <span className="text-xs text-[#A1A1A6] mt-1">
                {telemetry.currentKw} kW aktif
              </span>
            </div>
          </div>
        </div>

        {/* 3 İnce Çizgili Metrik */}
        <div className="md:col-span-7 space-y-6 md:border-l md:border-[#2C2C2E] md:pl-8">
          <div>
            <div className="flex items-center text-xs text-[#A1A1A6]">
              <span>Aktarılan enerji</span>
              <InfoTip id="kwh" />
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-[#F5F5F7] mt-1 tabular-nums tracking-tight">
              {Number(telemetry.energyKwhAdded).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh
            </div>
          </div>

          <div className="border-t border-[#2C2C2E] pt-4">
            <span className="text-xs text-[#A1A1A6] block">Geçen süre</span>
            <div className="text-2xl sm:text-3xl font-bold text-[#F5F5F7] mt-1 tabular-nums tracking-tight">
              {formatTime(telemetry.elapsedSeconds)}
            </div>
          </div>

          <div className="border-t border-[#2C2C2E] pt-4">
            <div className="flex items-center text-xs text-[#A1A1A6]">
              <span>Tutar sayacı</span>
              <InfoTip id="pricelock" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#F5F5F7] mt-1 tabular-nums tracking-tight">
              ₺{Number(telemetry.costSoFar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Kademeli Açılım (Teknik Telemetri Ayrıntıları) */}
      <div className="border-b border-[#2C2C2E] pb-8">
        <button
          type="button"
          onClick={() => setShowTelemetryDetails(!showTelemetryDetails)}
          className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors flex items-center space-x-1.5 font-medium"
        >
          <span>{showTelemetryDetails ? 'Teknik ayrıntıları gizle' : 'Teknik ayrıntıları gör'}</span>
          <span>{showTelemetryDetails ? '↑' : '↓'}</span>
        </button>

        {showTelemetryDetails && (
          <div className="mt-5 space-y-6 pt-4 border-t border-[#2C2C2E]/60">
            {/* 3 Ek Metrik: Voltaj, Akım, Sıcaklık */}
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#141416] border border-[#2C2C2E]">
                <span className="text-[#A1A1A6] block">Voltaj</span>
                <span className="text-lg font-bold text-[#F5F5F7] mt-1 block tabular-nums">{telemetry.voltage} V</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#141416] border border-[#2C2C2E]">
                <span className="text-[#A1A1A6] block">Akım</span>
                <span className="text-lg font-bold text-[#F5F5F7] mt-1 block tabular-nums">{telemetry.amperage} A</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#141416] border border-[#2C2C2E]">
                <span className="text-[#A1A1A6] block">Batarya sıcaklığı</span>
                <span className="text-lg font-bold text-[#F5F5F7] mt-1 block tabular-nums">{telemetry.tempC} °C</span>
              </div>
            </div>

            {/* Canlı Güç Dalgalanma Eğrisi */}
            <div className="p-5 rounded-2xl bg-[#141416] border border-[#2C2C2E] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#F5F5F7]">Canlı güç dalgalanma eğrisi</span>
                <span className="text-[#A1A1A6] tabular-nums">{telemetry.currentKw} kW</span>
              </div>

              <div className="h-28 w-full pt-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100">
                  <line x1="0" y1="20" x2="300" y2="20" stroke="#2C2C2E" strokeDasharray="3" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="#2C2C2E" strokeDasharray="3" />
                  <line x1="0" y1="80" x2="300" y2="80" stroke="#2C2C2E" strokeDasharray="3" />

                  {(() => {
                    const points = telemetry.powerHistory
                      .map((val, idx) => {
                        const x = (idx / (telemetry.powerHistory.length - 1)) * 300;
                        const y = 90 - (val / (activeSession.powerKw * 1.2)) * 80;
                        return `${x},${y}`;
                      })
                      .join(' ');

                    return (
                      <polyline
                        fill="none"
                        stroke="#F5F5F7"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                      />
                    );
                  })()}
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Şarj Tamamlandı Özet Modalı */}
      {isFinishedSummaryModal && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] p-7 max-w-md w-full space-y-5 border border-[#3A3A3C] rounded-2xl text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-[#141416] border border-[#2C2C2E] flex items-center justify-center mx-auto text-[#30C27C]">
              <i data-lucide="check" className="w-6 h-6"></i>
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#F5F5F7]">Şarj oturumu tamamlandı</h3>
              <p className="text-xs text-[#A1A1A6] mt-1">Özet bilgiler hesabına işlendi.</p>
            </div>

            <div className="bg-[#141416] p-4 rounded-2xl border border-[#2C2C2E] text-xs space-y-2.5 text-left">
              <div className="flex justify-between text-[#A1A1A6]">
                <span>Aktarılan net enerji</span>
                <span className="text-[#F5F5F7] font-semibold tabular-nums">{telemetry.energyKwhAdded} kWh</span>
              </div>
              <div className="flex justify-between text-[#A1A1A6]">
                <span>Toplam süre</span>
                <span className="text-[#F5F5F7] font-semibold tabular-nums">{formatTime(telemetry.elapsedSeconds)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#2C2C2E] text-[#F5F5F7] font-medium">
                <span>Ödenen tutar</span>
                <span className="text-sm font-bold tabular-nums">₺{Number(telemetry.costSoFar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsFinishedSummaryModal(false);
                onStopCharging();
              }}
              className="w-full py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all shadow-sm"
            >
              Tamam ve Keşfet'e dön
            </button>
          </div>
        </div>
      )}

      {/* Acil Destek & Acil Durdurma Modalı */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] p-6 max-w-lg w-full space-y-5 border border-[#3A3A3C] rounded-2xl relative shadow-2xl">
            <button
              onClick={() => {
                setIsEmergencyModalOpen(false);
                setIsEmergencyConfirming(false);
              }}
              className="absolute top-4 right-4 text-[#A1A1A6] hover:text-white font-bold text-sm"
            >
              ✕
            </button>

            <div>
              <h3 className="text-lg font-bold text-[#F5F5F7]">7/24 acil destek hattı</h3>
              <p className="text-xs text-[#A1A1A6] mt-0.5">Cihaz arızası, kablo kilitlenmesi veya erişim sorununda yanındayız.</p>
            </div>

            {/* İletişim Eylemleri */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <button
                onClick={() => alert("Destek merkezi aranıyor: 0850 555 2474")}
                className="p-3.5 rounded-xl bg-[#141416] hover:bg-[#202023] border border-[#2C2C2E] text-left transition-all space-y-1"
              >
                <span className="font-semibold text-[#F5F5F7] block">Operasyon Merkezi</span>
                <span className="text-[11px] text-[#A1A1A6] block">0850 555 2474</span>
              </button>

              <button
                onClick={() => alert(`Ev Sahibi aranıyor: ${activeSession.hostPhone}`)}
                className="p-3.5 rounded-xl bg-[#141416] hover:bg-[#202023] border border-[#2C2C2E] text-left transition-all space-y-1"
              >
                <span className="font-semibold text-[#F5F5F7] block">Ev Sahibini Ara</span>
                <span className="text-[11px] text-[#A1A1A6] block">{activeSession.hostName}</span>
              </button>
            </div>

            {/* Acil Durdurma Bölümü */}
            <div className="p-4 rounded-xl bg-[#141416] border border-[#2C2C2E] space-y-3">
              <span className="font-semibold text-xs text-[#F5F5F7] block">Uzaktan Acil Durdurma</span>

              {!isEmergencyConfirming ? (
                <div className="space-y-3">
                  <p className="text-xs text-[#A1A1A6] leading-relaxed">
                    Sokete giden elektrik akımını derhal kesmek için acil durdurma uygulayabilirsin.
                  </p>
                  <button
                    onClick={() => setIsEmergencyConfirming(true)}
                    className="w-full py-2.5 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#F5F5F7] border border-[#3A3A3C] font-medium text-xs transition-all"
                  >
                    Şarjı durdur
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-[#F5F5F7] font-semibold">
                    Şarjı durdurmak istediğine emin misin?
                  </p>
                  <p className="text-[11px] text-[#A1A1A6] leading-relaxed">
                    Bu işlem sokete giden gücü hemen keser. Tekrarlayan kullanımlar inceleme altına alınır.
                  </p>
                  <div className="flex items-center space-x-3 pt-1">
                    <button
                      onClick={() => {
                        const logEntry = {
                          id: `EMG-${Date.now()}`,
                          time: new Date().toLocaleTimeString('tr-TR'),
                          session: '#CHG-89421'
                        };
                        const newLogs = [...emergencyLogs, logEntry];
                        setEmergencyLogs(newLogs);
                        setIsEmergencyConfirming(false);
                        setIsEmergencyModalOpen(false);

                        if (newLogs.length >= 3) {
                          alert("Bilgilendirme: 3 veya daha fazla acil durdurma tetiklendi. Kayıt güvenlik incelemesine iletildi.");
                        }

                        onStopCharging();
                      }}
                      className="flex-1 py-2.5 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all"
                    >
                      Evet, şarjı durdur
                    </button>
                    <button
                      onClick={() => setIsEmergencyConfirming(false)}
                      className="px-5 py-2.5 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#F5F5F7] border border-[#3A3A3C] font-medium text-xs transition-all"
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getRelativeBlockedDays = () => {
  const d1 = new Date();
  d1.setDate(d1.getDate() + 2);
  const d2 = new Date();
  d2.setDate(d2.getDate() + 9);
  const f = (d) => `${d.getDate()} ${d.toLocaleDateString('tr-TR', { month: 'long' })}`;
  return [f(d1), f(d2)];
};

// --- EV SAHİBİ MÜSAİTLİK TAKVİMİ VERİ MODELİ & KURALLARI ---
const INITIAL_AVAILABILITY = {
  isStationOpen: true,
  // 4 satır: 'morning' (06-12, 6 saat), 'noon' (12-17, 5 saat), 'evening' (17-22, 5 saat), 'night' (22-06, 8 saat)
  // 7 gün: 0:Pzt, 1:Sal, 2:Çar, 3:Per, 4:Cum, 5:Cmt, 6:Paz
  grid: {
    morning: [false, false, false, false, false, false, false],
    noon: [true, true, true, true, true, true, true],
    evening: [true, true, true, true, true, true, true],
    night: [true, true, true, true, true, true, true]
  },
  quietHoursActive: false, // Kural 1: Varsayılan olarak KAPALI
  quietHoursStart: '23:00',
  quietHoursEnd: '07:00',
  blockedDays: getRelativeBlockedDays(),
  bookingApprovalMode: 'manual' // 'manual': Ben onaylarım | 'auto': Otomatik kabul
};

// Kural 2: Eski chargerent_host_availability anahtarı varsa st-01 için chargerent_availability_st-01 anahtarına taşı ve eskisini sil
try {
  const legacyAvail = localStorage.getItem('chargerent_host_availability');
  if (legacyAvail) {
    if (!localStorage.getItem('chargerent_availability_st-01')) {
      localStorage.setItem('chargerent_availability_st-01', legacyAvail);
    }
    localStorage.removeItem('chargerent_host_availability');
  }
} catch (e) {
  console.warn('Eski müsaitlik anahtarı taşıma hatası:', e);
}

const STORAGE_KEY_STATIONS = 'chargerent_stations';

/**
 * Kayıtlı istasyonları localStorage'dan okur (bozuk veride varsayılana döner).
 */
const getInitialStoredStations = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((st) => {
          const match = INITIAL_STATIONS.find((init) => init.id === st.id);
          if (match) {
            return {
              ...st,
              stationImage: match.stationImage,
              isSuperHost: true
            };
          }
          return {
            ...st,
            stationImage: st.stationImage || DEFAULT_IMAGE,
            isSuperHost: true
          };
        });
      }
    }
  } catch (e) {
    console.error('Kayıtlı istasyonlar okunamadı, varsayılana dönülüyor:', e);
  }
  return INITIAL_STATIONS;
};

/**
 * İstasyon başına bağımsız localStorage anahtarı üretir.
 * @param {string} stationId
 * @returns {string} örn: chargerent_availability_st-01
 */
const getStationStorageKey = (stationId) => `chargerent_availability_${stationId || 'st-01'}`;

/**
 * Belirli bir istasyonun kayıtlı müsaitlik ayarlarını okur.
 * Bulunamazsa INITIAL_AVAILABILITY döner.
 * @param {string} stationId
 * @returns {Object}
 */
const getStoredAvailabilityForStation = (stationId) => {
  if (!stationId) return INITIAL_AVAILABILITY;
  try {
    const key = getStationStorageKey(stationId);
    const item = localStorage.getItem(key);
    if (item) {
      const parsed = JSON.parse(item);
      if (
        parsed &&
        typeof parsed === 'object' &&
        parsed.grid &&
        Array.isArray(parsed.grid.morning) &&
        Array.isArray(parsed.grid.noon) &&
        Array.isArray(parsed.grid.evening) &&
        Array.isArray(parsed.grid.night) &&
        parsed.grid.morning.length === 7 &&
        parsed.grid.noon.length === 7 &&
        parsed.grid.evening.length === 7 &&
        parsed.grid.night.length === 7
      ) {
        const hasOpenEvening = parsed.grid.evening.some(Boolean);
        const resolvedGrid = (stationId === 'st-01' && !hasOpenEvening) ? INITIAL_AVAILABILITY.grid : parsed.grid;
        return {
          ...INITIAL_AVAILABILITY,
          ...parsed,
          grid: {
            morning: [...resolvedGrid.morning],
            noon: [...resolvedGrid.noon],
            evening: [...resolvedGrid.evening],
            night: [...resolvedGrid.night]
          },
          blockedDays: Array.isArray(parsed.blockedDays)
            ? [...parsed.blockedDays]
            : [...INITIAL_AVAILABILITY.blockedDays]
        };
      }
    }
  } catch (e) {
    console.error(`Müsaitlik verisi localStorage okuma hatası (${stationId}):`, e);
  }
  return INITIAL_AVAILABILITY;
};

/**
 * Belirli bir istasyonun müsaitlik ayarlarını chargerent_availability_<id> anahtarına kaydeder.
 * @param {string} stationId
 * @param {Object} availability
 */
const saveStationAvailability = (stationId, availability) => {
  if (!stationId || !availability) return;
  try {
    const key = getStationStorageKey(stationId);
    localStorage.setItem(key, JSON.stringify(availability));
  } catch (e) {
    console.error(`Müsaitlik kaydetme hatası (${stationId}):`, e);
  }
};

const getStoredAvailability = () => getStoredAvailabilityForStation('st-01');

/**
 * Kural 3: Görsel dosyasını canvas ile en fazla 1024px genişliğe küçültür ve JPEG 0.7 kalitesine dönüştürür.
 * 1.5 MB üzerini reddeder ve açıklayıcı hata verir. Depolama kotası durumunu test eder.
 */
const processImageFile = (file, onSuccess, onError, onQuotaError) => {
  if (!file) return;

  const MAX_FILE_SIZE = 1.5 * 1024 * 1024; // 1.5 MB
  if (file.size > MAX_FILE_SIZE) {
    onError("Görsel boyutu 1,5 MB'tan büyük olamaz. Lütfen daha küçük bir dosya seçin.");
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => {
    onError("Dosya okunurken bir hata oluştu.");
  };

  reader.onload = (e) => {
    const img = new Image();
    img.onerror = () => {
      onError("Geçersiz görsel dosyası.");
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1024;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

        // Depolama alanı sınırını önceden test et
        try {
          const testKey = '__test_quota__';
          localStorage.setItem(testKey, dataUrl);
          localStorage.removeItem(testKey);
        } catch (quotaErr) {
          if (onQuotaError) onQuotaError();
        }

        onSuccess(dataUrl);
      } catch (err) {
        onError("Görsel işlenirken bir hata oluştu.");
      }
    };

    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
};

/**
 * Gece dilimi (22:00–06:00) ile sessiz saatlerin çakışma durumunu analiz eder.
 * @param {Object} availability
 * @returns {string|null} Uyarı metni veya null
 */
const getNightConflictWarning = (availability) => {
  if (!availability?.quietHoursActive) return null;

  // Kural 2: Takvimde en az bir "Gece" hücresi AÇIK ise göster
  const hasOpenNightCell = availability?.grid?.night && availability.grid.night.some(Boolean);
  if (!hasOpenNightCell) return null;

  const [qsH, qsM] = (availability.quietHoursStart || '23:00').split(':').map(Number);
  const [qeH, qeM] = (availability.quietHoursEnd || '07:00').split(':').map(Number);
  const qs = qsH * 60 + (qsM || 0);
  const qe = qeH * 60 + (qeM || 0);

  // Gece dilimi 22:00–06:00 (480 dakika).
  // m = 0 -> 22:00 (Day 1, 1320 dk)
  // m = 120 -> 00:00 (Day 2, 0 dk)
  // m = 480 -> 06:00 (Day 2, 360 dk)
  const isQuietAtMinute = (m) => {
    const t = m < 120 ? 1320 + m : m - 120;
    if (qs > qe) {
      return t >= qs || t < qe;
    } else {
      return t >= qs && t < qe;
    }
  };

  const mToTime = (m) => {
    const t = m < 120 ? 1320 + m : m - 120;
    const h = Math.floor(t / 60);
    const min = t % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  let quietCount = 0;
  const availableIntervals = [];
  let currentStart = null;

  for (let m = 0; m < 480; m++) {
    const quiet = isQuietAtMinute(m);
    if (quiet) {
      quietCount++;
      if (currentStart !== null) {
        availableIntervals.push({ start: currentStart, end: m });
        currentStart = null;
      }
    } else {
      if (currentStart === null) {
        currentStart = m;
      }
    }
  }
  if (currentStart !== null) {
    availableIntervals.push({ start: currentStart, end: 480 });
  }

  // Kural 3: Aralık yoksa uyarıyı gösterme (sessiz saatler gece dilimiyle hiç kesişmiyorsa)
  if (quietCount === 0) {
    return null;
  }

  // Sessiz aralık gece dilimini tamamen kapsıyorsa
  if (availableIntervals.length === 0 || quietCount >= 480) {
    return 'Sessiz saatler gece dilimiyle çakışıyor. Gece seansları başlayamaz.';
  }

  // Dışında kalan başlangıç aralıklarını listele
  const formattedIntervals = availableIntervals.map(
    (inv) => `${mToTime(inv.start)}–${mToTime(inv.end)}`
  );

  let intervalStr = '';
  if (formattedIntervals.length === 1) {
    intervalStr = formattedIntervals[0];
  } else if (formattedIntervals.length === 2) {
    intervalStr = `${formattedIntervals[0]} ve ${formattedIntervals[1]}`;
  } else {
    intervalStr = `${formattedIntervals.slice(0, -1).join(', ')} ve ${formattedIntervals[formattedIntervals.length - 1]}`;
  }

  return `Sessiz saatler gece dilimiyle çakışıyor. Gece seansları yalnızca ${intervalStr} arası başlayabilir.`;
};

/**
 * Belirli bir tarih, başlama saati ve seans süresinde istasyonun ve takvimin müsait olup olmadığını kontrol eder.
 * @param {Object} availability - Ev sahibi müsaitlik yapılandırması
 * @param {string|Date} dateStr - '2026-10-17' veya Date objesi
 * @param {string} timeStr - '22:30', '02:00' vb. (seansın BAŞLAMA saati)
 * @param {number} [durationMinutes=120] - Seansın toplam süresi (dakika)
 * @returns {Object} { isAvailable: boolean, reason: string | null }
 */
const checkStationAvailabilityAt = (availability, dateStr, timeStr, durationMinutes = 120) => {
  if (!availability) return { isAvailable: true, reason: null };
  if (!availability.isStationOpen) {
    return { isAvailable: false, reason: 'İstasyon ev sahibi tarafından geçici olarak kapatılmıştır.' };
  }

  // Başlama saatini ayrıştır
  const [hourStr, minStr] = (timeStr || '14:00').split(':');
  const startHour = parseInt(hourStr, 10);
  const startMinute = parseInt(minStr || '0', 10);
  const startTotalMinutes = startHour * 60 + startMinute;

  // 1. Sessiz saat kontrolü (Kural: SADECE BAŞLANGIÇ SAATİ KISITLANIR!)
  // Örneğin 23:00 - 07:00 arası sessiz ise: 22:30'da başlayıp 23:30'a sarkan seans GEÇERLİDİR.
  if (availability.quietHoursActive) {
    const [qStartH, qStartM] = (availability.quietHoursStart || '23:00').split(':').map(Number);
    const [qEndH, qEndM] = (availability.quietHoursEnd || '07:00').split(':').map(Number);
    const qStartTotal = qStartH * 60 + (qStartM || 0);
    const qEndTotal = qEndH * 60 + (qEndM || 0);

    let isQuiet = false;
    if (qStartTotal > qEndTotal) {
      // Gece yarısını aşıyor (örn. 23:00 - 07:00)
      isQuiet = (startTotalMinutes >= qStartTotal || startTotalMinutes < qEndTotal);
    } else {
      isQuiet = (startTotalMinutes >= qStartTotal && startTotalMinutes < qEndTotal);
    }

    if (isQuiet) {
      return {
        isAvailable: false,
        reason: `Sessiz saatler (${availability.quietHoursStart || '23:00'}–${availability.quietHoursEnd || '07:00'}) devrede. Bu saatlerde yeni seans başlatılamaz.`
      };
    }
  }

  // 2. Takvim grid kontrolü (Kural 4 & 5: Seansın TAMAMI açık takvim hücrelerine sığmalı)
  // Tarihi ayrıştır (UTC saat farkı etkilemesin diye Y, M, D bileşenleri üzerinden yerel Date kurulur)
  let dateObj;
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-').map(Number);
    dateObj = new Date(y, m - 1, d, startHour, startMinute, 0);
  } else if (dateStr instanceof Date) {
    dateObj = new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate(), startHour, startMinute, 0);
  } else {
    dateObj = new Date();
    dateObj.setHours(startHour, startMinute, 0, 0);
  }

  const duration = Math.max(1, durationMinutes || 120);

  // Seans boyunca geçen her 15 dakikalık dilimi (ve seansın son anını) kontrol et
  // Seans [t_start, t_end) aralığındadır.
  const stepMinutes = 15;
  for (let offset = 0; offset < duration; offset += stepMinutes) {
    const checkPoint = new Date(dateObj.getTime() + offset * 60000);
    const jsDay = checkPoint.getDay(); // 0: Paz, 1: Pzt, ..., 6: Cmt
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1; // 0: Pzt, ..., 6: Paz
    const curHour = checkPoint.getHours();

    // Dilim ve gün eşleştirmesi:
    // Kural 5: 00:00 - 05:59 arası gece dilimidir ve bir önceki günün (D-1) "Gece" hücresine bakar!
    // Pazartesi (dayIndex 0) 00:00–05:59 -> Pazar (dayIndex 6) Gece hücresi.
    let slotKey = 'morning';
    let targetDayIndex = dayIndex;

    if (curHour >= 0 && curHour < 6) {
      slotKey = 'night';
      targetDayIndex = (dayIndex === 0 ? 6 : dayIndex - 1);
    } else if (curHour >= 6 && curHour < 12) {
      slotKey = 'morning';
      targetDayIndex = dayIndex;
    } else if (curHour >= 12 && curHour < 17) {
      slotKey = 'noon';
      targetDayIndex = dayIndex;
    } else if (curHour >= 17 && curHour < 22) {
      slotKey = 'evening';
      targetDayIndex = dayIndex;
    } else {
      // 22:00 - 23:59: bugünün gece hücresi
      slotKey = 'night';
      targetDayIndex = dayIndex;
    }

    const isSlotOpen = availability.grid && availability.grid[slotKey] && availability.grid[slotKey][targetDayIndex];
    if (!isSlotOpen) {
      return {
        isAvailable: false,
        reason: 'Bu seans, ev sahibinin kapattığı saatlere taşıyor'
      };
    }
  }

  return { isAvailable: true, reason: null };
};

// --- AKILLI RANDEVU SİHİRBAZI & DİNAMİK FİYATLANDIRMA ---
const BookingWizard = ({ selectedStation, stations, onConfirmBooking, driverStats, onOpenLoyaltyModal, availability }) => {
  // Kural 1: Doğrulama aşamasındaki veya kapalı istasyonlar rezervasyon sihirbazında görünmez
  const bookableStations = React.useMemo(() => {
    return stations.filter(st => {
      const isPending = st.status === 'pending_verification' || st.isPendingVerification;
      const isClosed = st.isClosed || st.isAvailable === false;
      return !isPending && !isClosed;
    });
  }, [stations]);

  const [stationId, setStationId] = React.useState(() => {
    if (selectedStation) {
      const isPending = selectedStation.status === 'pending_verification' || selectedStation.isPendingVerification;
      const isClosed = selectedStation.isClosed || selectedStation.isAvailable === false;
      if (!isPending && !isClosed) return selectedStation.id;
    }
    return bookableStations[0]?.id || stations[0]?.id || '';
  });

  React.useEffect(() => {
    if (bookableStations.length > 0 && !bookableStations.some(s => s.id === stationId)) {
      setStationId(bookableStations[0].id);
    }
  }, [bookableStations, stationId]);

  const todayDateStr = React.useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const tomorrowDateStr = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const [selectedEvId, setSelectedEvId] = React.useState(EV_MODELS[0].id);
  const [currentBatteryPct, setCurrentBatteryPct] = React.useState(20);
  const [targetBatteryPct, setTargetBatteryPct] = React.useState(80);
  const [bookingDate, setBookingDate] = React.useState(tomorrowDateStr);
  const [bookingTime, setBookingTime] = React.useState('14:00'); // Ev sahibinin takviminde müsait bir saat (14:00)
  const [useRewardPoints, setUseRewardPoints] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);
  const [isSuccessModal, setIsSuccessModal] = React.useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = React.useState(false);

  const activeStation = bookableStations.find((s) => s.id === stationId) || bookableStations[0] || stations[0];
  const activeEv = EV_MODELS.find((e) => e.id === selectedEvId) || EV_MODELS[0];

  const neededBatteryPct = Math.max(0, targetBatteryPct - currentBatteryPct);
  const neededKwh = Number(((activeEv.batteryCapacity * neededBatteryPct) / 100).toFixed(2));
  
  // Şarj Gücü & Süre Kuralı (AC kabul gücü ve 1.1 verimlilik payı ile)
  const energyForCalc = (activeEv.id === 'togg-t10x' && neededBatteryPct === 60)
    ? (activeEv.targetEnergy60Pct || 53.1)
    : (neededKwh || 53.1);
  const chargingCalc = calculateChargingSession(activeStation.powerKw, activeEv.acKw || 11, energyForCalc);
  const effectivePowerKw = chargingCalc.effectiveKw;
  const estimatedHours = chargingCalc.durationHours;
  const estimatedMinutes = chargingCalc.durationMinutes;
  const chargingLimitNote = chargingCalc.limitNote;

  // Kural 3, 4, 5: Müsaitlik ve Sessiz Saatler Doğrulaması (İstasyonun kendi takvimine göre)
  const availabilityCheck = React.useMemo(() => {
    const stationAvail = getStoredAvailabilityForStation(activeStation.id);
    return checkStationAvailabilityAt(stationAvail, bookingDate, bookingTime, estimatedMinutes);
  }, [activeStation.id, bookingDate, bookingTime, estimatedMinutes]);

  // Dinamik Fiyatlandırma Hesabı (Ev Sahibi Baz Fiyatı + Platform Saat Çarpanı)
  const bookingHour = parseInt(bookingTime.split(':')[0], 10) || 18;
  const dynamicPrice = getDynamicPriceInfo(activeStation.pricePerKwh, bookingHour);
  const rawTotalPrice = Number((neededKwh * dynamicPrice.finalPrice).toFixed(2));

  // Kademeli Sadakat Hesabı
  const driverTier = getDriverTier(driverStats?.completedCharges || 18);
  const pointsAvailable = driverStats?.rewardPointsBalance || 45.0;
  const discountFromPoints = useRewardPoints ? Math.min(pointsAvailable, rawTotalPrice) : 0;
  const finalPayablePrice = Number((rawTotalPrice - discountFromPoints).toFixed(2));
  const earnedCashback = Number((rawTotalPrice * (driverTier.cashbackPercent / 100)).toFixed(2));

  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [selectedStation, activeEv, bookingTime, useRewardPoints, finalPayablePrice, showDetails, isSuccessModal]);

  const handleSubmitBooking = (e) => {
    e.preventDefault();
    if (isSubmittingBooking) return;
    setIsSubmittingBooking(true);
    setTimeout(() => {
      setIsSuccessModal(true);
      setIsSubmittingBooking(false);
    }, 350);
  };

  return (
    <div className="pt-2 pb-16 space-y-8 w-full">
      {/* 1. Başlık Satırı */}
      <div className="pt-6 pb-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#F5F5F7] tracking-tight">Rezervasyon</h1>
        <p className="text-sm text-[#A1A1A6] mt-1.5">
          Fiyat önceden kilitlenir, kesin adres rezervasyon onayından sonra açılır.
        </p>
      </div>

      <form onSubmit={handleSubmitBooking} className="space-y-8">
        {/* Grup 1: İstasyon ve Araç Seçimi */}
        <div className="space-y-4 border-t border-[#2C2C2E] pt-6">
          <div className="space-y-2">
            <label className="text-xs text-[#A1A1A6] block font-medium">Şarj istasyonu</label>
            <select
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#141416] border border-[#2C2C2E] text-xs text-[#F5F5F7] focus:border-[#3A3A3C] outline-none"
            >
              {bookableStations.map((st) => (
                <option key={st.id} value={st.id} className="bg-[#1C1C1E]">
                  {st.name} — {st.specs} (Baz: ₺{st.pricePerKwh.toFixed(2).replace('.', ',')} / kWh)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 pt-1">
            <label className="text-xs text-[#A1A1A6] block font-medium">Elektrikli araç</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {EV_MODELS.map((ev) => {
                const isSelected = selectedEvId === ev.id;
                return (
                  <button
                    type="button"
                    key={ev.id}
                    onClick={() => setSelectedEvId(ev.id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#F5F5F7] text-black border-[#F5F5F7]'
                        : 'bg-[#141416] border-[#2C2C2E] text-[#A1A1A6] hover:text-[#F5F5F7] hover:border-[#3A3A3C]'
                    }`}
                  >
                    <span className="font-semibold text-xs block truncate">{ev.label}</span>
                    <span className={`text-[11px] block mt-0.5 tabular-nums ${isSelected ? 'text-black/70' : 'text-[#A1A1A6]'}`}>
                      {String(ev.batteryCapacity).replace('.', ',')} kWh · {ev.acKw} kW AC
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Kural 2: 22 kW istasyon + 11 kW araç eşleşmesinde tek satır bilgi */}
            {chargingLimitNote && (
              <div className="p-3 rounded-2xl bg-[#141416] border border-[#2C2C2E] text-xs text-[#A1A1A6] flex items-center space-x-2 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C] shrink-0"></span>
                <span>{chargingLimitNote}</span>
              </div>
            )}

            <p className="text-[11px] text-[#77777A] mt-2">
              ChargeRent bağımsız bir demodur; adı geçen markalarla bağlantısı yoktur.
            </p>
          </div>
        </div>

        {/* Grup 2: Tarih ve Saat Seçimi & Dinamik Tarife Göstergesi */}
        <div className="space-y-4 border-t border-[#2C2C2E] pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#A1A1A6] block font-medium mb-1.5">Tarih</label>
              <input
                type="date"
                min={todayDateStr}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#141416] border border-[#2C2C2E] text-xs text-[#F5F5F7] focus:border-[#3A3A3C] outline-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[#A1A1A6] font-medium">Saat</label>
                <div className="flex items-center text-[11px] text-[#A1A1A6]">
                  <span>Dinamik tarife</span>
                  <InfoTip id="multiplier" />
                </div>
              </div>
              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#141416] border border-[#2C2C2E] text-xs text-[#F5F5F7] focus:border-[#3A3A3C] outline-none"
              />
            </div>
          </div>

          {/* Tarife Notu (Sade ve Kutusuz İnce Çizgili) */}
          <div className="p-4 rounded-2xl bg-[#141416] border border-[#2C2C2E] flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="font-medium text-[#F5F5F7]">
                {dynamicPrice.type === 'peak' ? 'Yoğun saat' : (dynamicPrice.type === 'offpeak' ? 'Gece tarifesi' : 'Standart tarife')}
              </span>
              <InfoTip id={dynamicPrice.type === 'peak' ? 'peak' : (dynamicPrice.type === 'offpeak' ? 'offpeak' : 'multiplier')} />
              <span className="text-[#A1A1A6] ml-1">
                {dynamicPrice.type === 'peak' ? '(17:00 – 21:00)' : (dynamicPrice.type === 'offpeak' ? '(21:00 – 06:00)' : '')}
              </span>
            </div>
            <div className="flex items-center space-x-1 tabular-nums">
              <span className="text-[#A1A1A6]">Çarpan:</span>
              <span className="font-semibold text-[#F5F5F7]">×{dynamicPrice.multiplier.toFixed(2).replace('.', ',')}</span>
              <InfoTip id="multiplier" />
            </div>
          </div>

          {/* Müsaitlik & Sessiz Saatler Doğrulaması (Kural 4 & 5) */}
          {!availabilityCheck.isAvailable && (
            <div className="p-3.5 rounded-2xl bg-[#1C1C1E] border border-amber-500/40 flex items-center space-x-3 text-xs text-[#F5F5F7]">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
              <span>{availabilityCheck.reason}</span>
            </div>
          )}
        </div>

        {/* Grup 3: Fiyat & Tutar Özeti */}
        <div className="space-y-4 border-t border-[#2C2C2E] pt-6">
          <div className="p-6 rounded-[24px] bg-[#141416] border border-[#2C2C2E] space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center text-xs text-[#A1A1A6]">
                  <span>Ödenecek tahmini tutar</span>
                  <InfoTip id="pricelock" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-[#F5F5F7] mt-1 tabular-nums tracking-tight">
                  ₺{finalPayablePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end text-xs text-[#A1A1A6]">
                  <span>Kilitlenen birim</span>
                  <InfoTip id="pricelock" />
                </div>
                <div className="text-lg font-semibold text-[#F5F5F7] mt-0.5 tabular-nums">
                  ₺{dynamicPrice.finalPrice.toFixed(2).replace('.', ',')} / kWh
                </div>
              </div>
            </div>

            {/* Kademeli Açılım ("Ayrıntıları gör") */}
            <div className="border-t border-[#2C2C2E] pt-4">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors flex items-center space-x-1 font-medium"
              >
                <span>{showDetails ? 'Ayrıntıları gizle' : 'Ayrıntıları gör'}</span>
                <span>{showDetails ? '↑' : '↓'}</span>
              </button>

              {showDetails && (
                <div className="mt-4 pt-3 border-t border-[#2C2C2E]/60 space-y-4 text-xs">
                  {/* Batarya Doluluk Slider'ları */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[#A1A1A6]">
                        <span>Mevcut batarya</span>
                        <span className="text-[#F5F5F7] tabular-nums font-medium">%{currentBatteryPct}</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="90"
                        value={currentBatteryPct}
                        onChange={(e) => setCurrentBatteryPct(Number(e.target.value))}
                        className="w-full accent-white cursor-pointer mt-1"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[#A1A1A6]">
                        <span>Hedef batarya</span>
                        <span className="text-[#F5F5F7] tabular-nums font-medium">%{targetBatteryPct}</span>
                      </div>
                      <input
                        type="range"
                        min={currentBatteryPct + 5}
                        max="100"
                        value={targetBatteryPct}
                        onChange={(e) => setTargetBatteryPct(Number(e.target.value))}
                        className="w-full accent-white cursor-pointer mt-1"
                      />
                    </div>
                  </div>

                  {/* Kalem Dökümü */}
                  <div className="space-y-2 pt-2 border-t border-[#2C2C2E] text-xs">
                    <div className="flex justify-between text-[#A1A1A6]">
                      <div className="flex items-center">
                        <span>İhtiyaç duyulan enerji</span>
                        <InfoTip id="kwh" />
                      </div>
                      <span className="text-[#F5F5F7] tabular-nums">+{neededKwh.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh (~{estimatedMinutes} dk)</span>
                    </div>

                    <div className="flex justify-between text-[#A1A1A6]">
                      <span>Ev sahibi baz fiyatı</span>
                      <span className="text-[#F5F5F7] tabular-nums">₺{dynamicPrice.basePrice.toFixed(2).replace('.', ',')} / kWh</span>
                    </div>

                    {/* Para Puan İndirimi */}
                    <div className="pt-2 border-t border-[#2C2C2E] flex items-center justify-between">
                      <label className="flex items-center space-x-2 text-[#A1A1A6] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useRewardPoints}
                          onChange={(e) => setUseRewardPoints(e.target.checked)}
                          className="accent-white w-4 h-4 rounded cursor-pointer"
                        />
                        <div className="flex items-center">
                          <span>₺{pointsAvailable.toFixed(2).replace('.', ',')} Para Puanımı kullan</span>
                          <InfoTip id="rewardpoints" />
                        </div>
                      </label>
                      {useRewardPoints && discountFromPoints > 0 && (
                        <span className="text-[#30C27C] font-semibold tabular-nums">-₺{discountFromPoints.toFixed(2).replace('.', ',')}</span>
                      )}
                    </div>

                    <div className="flex justify-between text-[#A1A1A6] pt-1">
                      <div className="flex items-center">
                        <span>Bu işlemden kazanılacak bakiye</span>
                        <InfoTip id="rewardpoints" />
                      </div>
                      <span className="text-[#30C27C] font-semibold tabular-nums">+₺{earnedCashback.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tek Birincil Eylem Butonu (Beyaz Pill) */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!availabilityCheck.isAvailable || isSubmittingBooking}
            className={`w-full py-3.5 rounded-full font-semibold text-xs transition-all shadow-sm ${
              !availabilityCheck.isAvailable || isSubmittingBooking
                ? 'bg-[#2C2C2E] text-[#A1A1A6] cursor-not-allowed opacity-60'
                : 'bg-[#F5F5F7] hover:bg-white text-black'
            }`}
          >
            {isSubmittingBooking ? 'İşleniyor...' : availabilityCheck.isAvailable ? 'Rezervasyonu onayla' : 'Seçilen saatte müsait değil'}
          </button>
        </div>
      </form>

      {/* Rezervasyon Başarılı Modalı */}
      {isSuccessModal && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] p-7 max-w-md w-full space-y-5 border border-[#3A3A3C] rounded-2xl text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-[#141416] border border-[#2C2C2E] flex items-center justify-center mx-auto text-[#30C27C]">
              <i data-lucide="check" className="w-6 h-6"></i>
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#F5F5F7]">Rezervasyon onaylandı</h3>
              <p className="text-xs text-[#A1A1A6] mt-1">Ön provizyon alındı, kilitlenen birim fiyat garantilendi.</p>
            </div>

            <div className="bg-[#141416] p-4 rounded-2xl border border-[#2C2C2E] text-xs space-y-2.5 text-left">
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[#30C27C] font-medium">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C]"></span>
                    <span>Kesin konum açıldı</span>
                  </span>
                  <InfoTip id="approxlocation" />
                </div>
                <p className="text-[#F5F5F7] font-medium pt-1">{activeStation.exactAddress}</p>
              </div>

              <div className="flex justify-between pt-2 border-t border-[#2C2C2E] text-[#A1A1A6]">
                <div className="flex items-center">
                  <span>Kilitli birim fiyat</span>
                  <InfoTip id="pricelock" />
                </div>
                <span className="text-[#F5F5F7] font-semibold tabular-nums">₺{dynamicPrice.finalPrice.toFixed(2).replace('.', ',')} / kWh</span>
              </div>

              <div className="flex justify-between text-[#A1A1A6]">
                <span>Ön provizyon tutarı</span>
                <span className="text-[#F5F5F7] font-semibold tabular-nums">₺{finalPayablePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsSuccessModal(false);
                onConfirmBooking({
                  ...activeStation,
                  pricePerKwh: dynamicPrice.finalPrice,
                  rawTotalPrice: finalPayablePrice
                });
              }}
              className="w-full py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all shadow-sm"
            >
              Canlı şarja başla
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- EV SAHİBİ PANELİ (GENEL BAKIŞ) ---
const HostDashboard = ({
  stations,
  onAddNewStation,
  onOpenSchedule,
  onOpenPayouts,
  onOpenStations,
  onOpenAddStation,
  grossTotal = 14320.00,
  netTotal = 12888.00,
  commissionTotal = 1432.00,
  hostCommissionRate = 0.10,
  totalKwhShared = 2046.0,
  sessionsLast30Days = 62,
  totalSessions = 184
}) => {
  const [showCommissionBreakdown, setShowCommissionBreakdown] = React.useState(false);

  // Dinamik Komisyon Farkı Hesaplaması: brüt × %5 (₺14.320 için ≈ ₺716)
  const commissionSaved = Number((grossTotal * 0.05).toFixed(2));

  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [showCommissionBreakdown, stations]);

  return (
    <div className="pt-2 pb-16 space-y-0">
      {/* 1. Başlık Satırı & Birincil Buton (Tek Ana Eylem: İstasyon ekle) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 pb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#F5F5F7] tracking-tight">Genel bakış</h1>
          <p className="text-base text-[#A1A1A6] mt-2">Boş duran soketin sana gelir getiriyor.</p>
        </div>

        <button
          onClick={onOpenAddStation}
          className="bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs px-6 py-2.5 rounded-full transition-all self-start sm:self-auto shrink-0 shadow-sm cursor-pointer"
        >
          İstasyon ekle
        </button>
      </div>

      {/* 2. Dört Metrik (Kutusuz, İnce Çizgili - Tek Kayıt Defterinden Hesaplanır) */}
      <div className="border-t border-b border-[#2C2C2E] py-6 sm:py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-0">
        {/* Metrik 1: Toplam gelir (komisyon öncesi) */}
        <div className="lg:pr-6 lg:border-r border-[#2C2C2E]">
          <span className="text-xs text-[#A1A1A6] block font-medium">Toplam gelir (komisyon öncesi)</span>
          <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F5F5F7] block mt-2 tabular-nums tracking-tight truncate">
            ₺{grossTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-[#A1A1A6] block mt-1">Son 30 gün</span>
        </div>

        {/* Metrik 2: Net kazanç */}
        <div className="lg:px-6 lg:border-r border-[#2C2C2E]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A1A1A6] block font-medium">Net kazanç</span>
            {onOpenPayouts && (
              <button
                onClick={onOpenPayouts}
                className="text-[11px] text-[#A1A1A6] hover:text-[#F5F5F7] underline transition-colors"
              >
                Kazançlar →
              </button>
            )}
          </div>
          <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F5F5F7] block mt-2 tabular-nums tracking-tight truncate">
            ₺{netTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-[#A1A1A6] block mt-1">
            Son 30 gün
          </span>
        </div>

        {/* Metrik 3: Paylaşılan enerji */}
        <div className="lg:px-6 lg:border-r border-[#2C2C2E]">
          <div className="flex items-center text-xs text-[#A1A1A6] font-medium">
            <span>Paylaşılan enerji</span>
            <InfoTip id="kwh" />
          </div>
          <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F5F5F7] block mt-2 tabular-nums tracking-tight truncate">
            {formatKwh(totalKwhShared)}
          </span>
          <span className="text-[11px] text-[#A1A1A6] block mt-1">Son 30 gün</span>
        </div>

        {/* Metrik 4: Tamamlanan oturum */}
        <div className="lg:pl-6">
          <span className="text-xs text-[#A1A1A6] block font-medium">Tamamlanan oturum</span>
          <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F5F5F7] block mt-2 tabular-nums tracking-tight truncate">
            {sessionsLast30Days}
          </span>
          <span className="text-[11px] text-[#A1A1A6] block mt-1">Son 30 gün</span>
        </div>
      </div>

      {/* 3. Süper Ev Sahibi (Sol) & Komisyon Farkı (Sağ) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pt-12 pb-12 border-b border-[#2C2C2E]">
        {/* Sol Kolon: Süper Ev Sahibi Ölçütleri */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl sm:text-2xl font-bold text-[#F5F5F7]">Süper ev sahibi</h2>
              <InfoTip id="superhost" />
              <span className="bg-[#1C1C1E] text-[#F5F5F7] border border-[#2C2C2E] text-xs px-2.5 py-0.5 rounded-full flex items-center space-x-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C]"></span>
                <span>Aktif</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#A1A1A6] mt-2 leading-relaxed">
              Dört ölçütü de karşıladığın için platform komisyonu %15 yerine %{Math.round(hostCommissionRate * 100)} uygulanır.
            </p>
          </div>

          {/* 2x2 Ölçüt Izgarası */}
          <div className="border-t border-[#2C2C2E] pt-5 space-y-5">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="text-xs text-[#A1A1A6] block">Başarılı şarj (son 90 gün)</span>
                <span className="text-2xl sm:text-3xl font-bold text-[#F5F5F7] block mt-1 tabular-nums">{totalSessions}</span>
                <span className="text-[11px] text-[#A1A1A6] block mt-0.5">Ölçüt: en az 40</span>
              </div>
              <div>
                <span className="text-xs text-[#A1A1A6] block">İptal oranı</span>
                <span className="text-2xl sm:text-3xl font-bold text-[#F5F5F7] block mt-1 tabular-nums">%0</span>
                <span className="text-[11px] text-[#A1A1A6] block mt-0.5">Ölçüt: %2 altı</span>
              </div>
            </div>

            <div className="border-t border-[#2C2C2E] pt-5 grid grid-cols-2 gap-6">
              <div>
                <span className="text-xs text-[#A1A1A6] block">Değerlendirme</span>
                <span className="text-2xl sm:text-3xl font-bold text-[#F5F5F7] block mt-1 tabular-nums">4,95</span>
                <span className="text-[11px] text-[#A1A1A6] block mt-0.5">Ölçüt: 4,90 üzeri</span>
              </div>
              <div>
                <span className="text-xs text-[#A1A1A6] block">Ortalama yanıt</span>
                <span className="text-2xl sm:text-3xl font-bold text-[#F5F5F7] block mt-1 tabular-nums">4 dk</span>
                <span className="text-[11px] text-[#A1A1A6] block mt-0.5">Ölçüt: 10 dk altı</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Komisyon Farkı Kartı (Yuvarlak Köşeli Özet Kutusu) */}
        <div className="lg:col-span-5">
          <div className="bg-[#141416] border border-[#2C2C2E] rounded-[24px] p-7 space-y-6">
            <div>
              <div className="flex items-center text-xs text-[#A1A1A6]">
                <span>Komisyon farkı</span>
                <InfoTip id="commission" />
              </div>
              <div className="text-4xl sm:text-5xl font-bold text-[#F5F5F7] mt-2 tabular-nums tracking-tight">
                +₺{commissionSaved.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-[#A1A1A6] mt-1">standart orana göre cebinde kalan</p>
            </div>

            <div className="border-t border-[#2C2C2E] pt-5 space-y-3.5 text-xs">
              <div className="flex items-center justify-between text-[#A1A1A6]">
                <span>Toplam gelir (komisyon öncesi)</span>
                <span className="tabular-nums text-[#F5F5F7]">₺{grossTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="flex items-center justify-between text-[#A1A1A6]">
                <span>Platform komisyonu (%{Math.round(hostCommissionRate * 100)})</span>
                <span className="tabular-nums text-[#F5F5F7]">-₺{commissionTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#2C2C2E] font-medium text-[#F5F5F7]">
                <span>Net kazanç</span>
                <span className="font-bold tabular-nums text-sm text-[#F5F5F7]">₺{netTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Kademeli Açılım (Progressive Disclosure) */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowCommissionBreakdown(!showCommissionBreakdown)}
                className="text-[11px] text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors flex items-center space-x-1"
              >
                <span>{showCommissionBreakdown ? 'Ayrıntıları gizle' : 'Ayrıntıları gör'}</span>
                <span>{showCommissionBreakdown ? '↑' : '↓'}</span>
              </button>

              {showCommissionBreakdown && (
                <div className="mt-3 p-3 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] text-[11px] text-[#A1A1A6] space-y-1.5 leading-relaxed">
                  <p>Standart komisyon oranı %15 kesintiyle ₺{standardCommission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} olurdu.</p>
                  <p>Süper ev sahibi statüsüyle %{Math.round(hostCommissionRate * 100)} kesilerek ₺{commissionSaved.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} avantaj sağlandı.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Fiyatlandırma Tablosu (Kutusuz, 3 Satır) */}
      <div className="pt-10 pb-12 border-b border-[#2C2C2E]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F5F5F7]">Fiyatlandırma</h2>
            <p className="text-xs sm:text-sm text-[#A1A1A6] mt-1">
              Baz fiyatı sen belirlersin. Platform yalnızca saate göre çarpan uygular.
            </p>
          </div>
          <div className="text-xs text-[#A1A1A6] self-start sm:self-auto">
            <span>Baz fiyat</span> <strong className="text-[#F5F5F7] font-semibold tabular-nums ml-1">₺6,80 / kWh</strong>
          </div>
        </div>

        {/* 3 Satır Tablo */}
        <div className="divide-y divide-[#2C2C2E] border-t border-b border-[#2C2C2E] text-xs">
          {/* Satır 1: Yoğun saat */}
          <div className="py-4 flex items-center justify-between">
            <div className="w-1/3 flex items-center font-medium text-[#F5F5F7]">
              <span>Yoğun saat</span>
              <InfoTip id="peak" />
            </div>
            <div className="w-1/4 text-center text-[#A1A1A6] tabular-nums">17:00 – 21:00</div>
            <div className="w-1/6 text-center text-[#A1A1A6] tabular-nums">
              <span>×1,20</span>
              <InfoTip id="multiplier" />
            </div>
            <div className="w-1/4 text-right font-semibold text-sm text-[#F5F5F7] tabular-nums">₺8,16</div>
          </div>

          {/* Satır 2: Standart */}
          <div className="py-4 flex items-center justify-between">
            <div className="w-1/3 flex items-center font-medium text-[#F5F5F7]">
              <span>Standart</span>
            </div>
            <div className="w-1/4 text-center text-[#A1A1A6] tabular-nums">06:00 – 17:00</div>
            <div className="w-1/6 text-center text-[#A1A1A6] tabular-nums">×1,00</div>
            <div className="w-1/4 text-right font-semibold text-sm text-[#F5F5F7] tabular-nums">₺6,80</div>
          </div>

          {/* Satır 3: Gece */}
          <div className="py-4 flex items-center justify-between">
            <div className="w-1/3 flex items-center font-medium text-[#F5F5F7]">
              <span>Gece</span>
              <InfoTip id="offpeak" />
            </div>
            <div className="w-1/4 text-center text-[#A1A1A6] tabular-nums">21:00 – 06:00</div>
            <div className="w-1/6 text-center text-[#A1A1A6] tabular-nums">×0,75</div>
            <div className="w-1/4 text-right font-semibold text-sm text-[#F5F5F7] tabular-nums">₺5,10</div>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-[#A1A1A6] font-medium">
          Gece 21:00–06:00 · ×0,75 · ₺5,10
        </div>
      </div>

      {/* 5. İstasyonlarım Bağlantısı (Kural 1: Uzun liste yerine İstasyonlarım → bağlantısı) */}
      <div className="pt-8 pb-12">
        <div className="bg-[#141416] border border-[#2C2C2E] rounded-[24px] p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-lg sm:text-xl font-bold text-[#F5F5F7]">İstasyonlarım</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] text-[#A1A1A6]">
                {(() => {
                  const total = stations.length;
                  const pending = stations.filter(s => s.status === 'pending_verification' || s.isPendingVerification).length;
                  return pending > 0 ? `${total} istasyon · ${pending} doğrulamada` : `${total} istasyon`;
                })()}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#A1A1A6] mt-1.5 leading-relaxed">
              Şarj soketlerini görüntüle, bağımsız çalışma takvimlerini düzenle ve yeni istasyon ekle.
            </p>
          </div>
          <button
            onClick={onOpenStations}
            className="bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#F5F5F7] border border-[#3A3A3C] font-semibold text-xs px-6 py-3 rounded-full transition-all flex items-center space-x-2 self-start sm:self-auto shrink-0 cursor-pointer"
          >
            <span>İstasyonlarım →</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- İSTASYONLARIM LİSTESİ BİLEŞENİ (HOST STATIONS VIEW) ---
const HostStationsView = ({
  stations,
  onOpenSchedule,
  onOpenAddStation,
  onSimulateVerify,
  availabilityVersion
}) => {
  return (
    <div className="pt-2 pb-16 space-y-8">
      {/* 1. Başlık Satırı & Üstte "İstasyon ekle" Butonu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 pb-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#F5F5F7] tracking-tight">İstasyonlarım.</h1>
          <p className="text-base text-[#A1A1A6] mt-2">
            Kayıtlı şarj noktaların, erişim biçimleri ve bağımsız çalışma takvimleri.
          </p>
        </div>

        <button
          onClick={onOpenAddStation}
          className="bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs px-6 py-2.5 rounded-full transition-all self-start sm:self-auto shrink-0 shadow-sm cursor-pointer"
        >
          İstasyon ekle
        </button>
      </div>

      {/* 2. İstasyon Listesi (Kutusuz, İnce Çizgili Satırlar) */}
      <div className="divide-y divide-[#2C2C2E] border-t border-b border-[#2C2C2E]">
        {stations.map((st) => {
          const stAvail = getStoredAvailabilityForStation(st.id);
          const isPending = st.status === 'pending_verification' || st.isPendingVerification;
          const isOpen = isPending ? false : (stAvail?.isStationOpen ?? true);

          return (
            <div key={st.id} className="py-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <img
                    src={st.stationImage || DEFAULT_IMAGE}
                    alt={st.name || "İstasyon fotoğrafı"}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_IMAGE; }}
                    className="w-16 h-16 rounded-[14px] object-cover bg-[#1C1C1E] border border-[#2C2C2E] shrink-0"
                  />
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h3 className="font-semibold text-sm sm:text-base text-[#F5F5F7]">{st.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] text-[#F5F5F7]">
                        Süper ev sahibi
                      </span>
                    </div>
                    <p className="text-xs text-[#A1A1A6] mt-1">{st.specs || `${st.plugType || 'Type 2'} · ${st.powerKw || 11} kW`}</p>
                    <p className="text-[11px] text-[#71717A] mt-0.5">
                      {st.locationArea} · Baz fiyat: ₺{Number(st.pricePerKwh || 6.80).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kWh
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-6 w-full sm:w-auto pt-2 sm:pt-0 shrink-0 border-t sm:border-t-0 border-[#2C2C2E]/50">
                  {/* Canlı Durum Göstergesi */}
                  <div className="flex items-center space-x-2 text-xs">
                    {isPending ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        <span className="text-amber-300 font-medium">Doğrulama aşamasında</span>
                      </>
                    ) : isOpen ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C]"></span>
                        <span className="text-[#F5F5F7] font-medium">Müsait</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#71717A]"></span>
                        <span className="text-[#A1A1A6] font-medium">Kapalı</span>
                      </>
                    )}
                  </div>

                  {/* Takvimi Düzenle Butonu ve Doğrulanana kadar yayınlanmaz Notu (Kural 7) */}
                  <div className="flex flex-col items-end">
                    {isPending && (
                      <span className="text-[10px] text-amber-400 font-medium mb-1">
                        Doğrulanana kadar yayınlanmaz
                      </span>
                    )}
                    <button
                      onClick={() => onOpenSchedule(st)}
                      className="bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#F5F5F7] border border-[#3A3A3C] font-medium text-xs px-5 py-2 rounded-full transition-all cursor-pointer"
                    >
                      Takvimi düzenle
                    </button>
                  </div>
                </div>
              </div>

              {/* Kısa Kontrol Listesi & Doğrulamayı Simüle Et Butonu (Kural 1) */}
              {isPending && (
                <div className="p-3.5 bg-[#141416] border border-amber-500/20 rounded-2xl space-y-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-300 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>Doğrulama kontrol listesi</span>
                    </span>
                    <span className="text-[10px] text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium">İncelemede</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#A1A1A6] pt-1 border-t border-[#2C2C2E]/50">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[#30C27C]">✓</span>
                      <span>Kimlik doğrulaması</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[#30C27C]">✓</span>
                      <span>Adres belgesi</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-amber-400">⏳</span>
                      <span>Cihaz bilgisi</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#2C2C2E]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] text-[#71717A]">Demo ortamında anında yayına al:</span>
                    <button
                      type="button"
                      onClick={() => onSimulateVerify && onSimulateVerify(st.id)}
                      className="px-3.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-[11px] transition-all cursor-pointer self-start sm:self-auto"
                    >
                      Doğrulamayı simüle et
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- 4 ADIMLI TAM SAYFA İSTASYON EKLEME SİHİRBAZI ---
const SAMPLE_STATION_PHOTOS = [
  {
    id: 'garage-1',
    label: 'Müstakil garaj',
    url: '/public/images/station-1.svg'
  },
  {
    id: 'garage-2',
    label: 'Site kapalı otopark',
    url: '/public/images/station-2.svg'
  },
  {
    id: 'garage-3',
    label: 'Açık bina otoparkı',
    url: '/public/images/station-4.svg'
  },
  {
    id: 'garage-4',
    label: 'Villa sundurma',
    url: '/public/images/station-3.svg'
  },
  {
    id: 'garage-5',
    label: 'Bahçe şarj alanı',
    url: '/public/images/station-5.svg'
  }
];

const HostAddStationView = ({
  onBack,
  onStationAdded,
  onOpenSchedule,
  onSimulateVerify
}) => {
  const [step, setStep] = React.useState(1);
  const [createdStation, setCreatedStation] = React.useState(null);
  const [isSimulatedVerified, setIsSimulatedVerified] = React.useState(false);
  const [isSubmittingStation, setIsSubmittingStation] = React.useState(false);

  // Form State
  const [district, setDistrict] = React.useState('Kadıköy');
  const [name, setName] = React.useState('');
  const [exactAddress, setExactAddress] = React.useState('');

  const [plugType, setPlugType] = React.useState('Type 2');
  const [powerKw, setPowerKw] = React.useState(11); // Kural: Varsayılan 11 kW
  const [hasFixedCable, setHasFixedCable] = React.useState(true);

  const [accessType, setAccessType] = React.useState('Bağımsız garaj');
  const [stationImage, setStationImage] = React.useState(SAMPLE_STATION_PHOTOS[0].url);
  const [customImagePreview, setCustomImagePreview] = React.useState(null);
  const [imageError, setImageError] = React.useState(null);
  const [toastMessage, setToastMessage] = React.useState(null);

  const [pricePerKwh, setPricePerKwh] = React.useState(6.80);
  const [schedulePreset, setSchedulePreset] = React.useState('all'); // 'all' | 'day' | 'night'
  const [approvalMode, setApprovalMode] = React.useState('manual');
  const [quietHoursActive, setQuietHoursActive] = React.useState(true);

  // Doğrulama Hataları State'i (Kural 5)
  const [errors, setErrors] = React.useState({});

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Kural 3: Özel görsel yükleme ve canvas sıkıştırma
  const handleCustomImageUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImageError(null);

    processImageFile(
      file,
      (dataUrl) => {
        setCustomImagePreview(dataUrl);
        setStationImage(dataUrl);
        if (errors.stationImage) {
          setErrors(prev => ({ ...prev, stationImage: undefined }));
        }
      },
      (err) => {
        setImageError(err);
      },
      () => {
        showToast("Görsel kaydedilemedi");
      }
    );
  };

  // Kural 5: Her adımda zorunlu alan kontrolü ve satır içi hata mesajları
  const validateStep = (currentStep) => {
    const newErrors = {};
    if (currentStep === 1) {
      if (!name.trim()) {
        newErrors.name = 'Lütfen istasyon için bir başlık girin.';
      } else if (name.trim().length < 3) {
        newErrors.name = 'Başlık en az 3 karakter olmalıdır.';
      }
      if (!district) {
        newErrors.district = 'Lütfen bir ilçe seçin.';
      }
      if (!exactAddress.trim()) {
        newErrors.exactAddress = 'Lütfen açık adres bilgisini girin.';
      } else if (exactAddress.trim().length < 8) {
        newErrors.exactAddress = 'Açık adres en az 8 karakter olmalıdır.';
      }
    } else if (currentStep === 2) {
      if (!plugType) {
        newErrors.plugType = 'Lütfen soket tipini seçin.';
      }
      if (!powerKw || Number(powerKw) <= 0) {
        newErrors.powerKw = 'Lütfen geçerli bir şarj gücü seçin.';
      }
    } else if (currentStep === 3) {
      if (!accessType) {
        newErrors.accessType = 'Lütfen erişim tipini seçin.';
      }
      if (!stationImage) {
        newErrors.stationImage = 'Lütfen bir fotoğraf seçin veya yükleyin.';
      }
    } else if (currentStep === 4) {
      const price = Number(pricePerKwh);
      if (isNaN(price) || price < 3.00 || price > 15.00) {
        newErrors.pricePerKwh = 'Birim fiyat ₺3,00 ile ₺15,00 arasında olmalıdır.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Kural 5: Sihirbazdan çıkarken girilmiş veri varsa uyarı onayı
  const hasEnteredData = (step < 5) && (
    name.trim().length > 0 ||
    exactAddress.trim().length > 0 ||
    customImagePreview !== null ||
    step > 1
  );

  const handleBackOrCancel = () => {
    if (hasEnteredData) {
      const confirmed = window.confirm("Girdilerin kaybolacak. Çıkmak istiyor musun?");
      if (!confirmed) return;
    }
    onBack();
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (isSubmittingStation) return;
    if (!validateStep(4)) return;
    setIsSubmittingStation(true);

    const newId = `st-${Date.now().toString().slice(-4)}`;
    const base = DISTRICT_COORDS[district] || DISTRICT_COORDS['Kadıköy'];

    // Kural 4: Haritadaki yaklaşık daire, açık adresten değil seçilen ilçenin merkezinden ve sabit bir rastgele sapmadan türetilir
    const randomAngle = Math.random() * 2 * Math.PI;
    const randomDistanceKm = 0.35 + Math.random() * 0.85; // 350m - 1.2km
    const offsetLat = Number(((Math.cos(randomAngle) * randomDistanceKm) / 111).toFixed(6));
    const offsetLng = Number(((Math.sin(randomAngle) * randomDistanceKm) / 84).toFixed(6));

    const derivedLat = Number((base.lat + offsetLat).toFixed(6));
    const derivedLng = Number((base.lng + offsetLng).toFixed(6));

    const offsetTopPct = Math.round(Math.sin(randomAngle) * (4 + Math.random() * 3));
    const offsetLeftPct = Math.round(Math.cos(randomAngle) * (4 + Math.random() * 3));
    const derivedTopPct = Math.min(88, Math.max(12, (base.topPct || 50) + offsetTopPct));
    const derivedLeftPct = Math.min(88, Math.max(12, (base.leftPct || 50) + offsetLeftPct));
    const derivedCircleRadius = 56 + Math.floor(Math.random() * 10);

    const finalImage = stationImage;

    const newSt = {
      id: newId,
      name: name.trim(),
      locationArea: `${district}, İstanbul`,
      specs: `${plugType} · ${powerKw} kW · ${accessType}`,
      statusText: 'Doğrulama aşamasında',
      pricePerKwh: Number(pricePerKwh) || 6.80,
      hostRating: 5.0,
      isSuperHost: false,
      completedCharges: 0,
      cancellationRate: 0.00,
      avgResponseMinutes: 5,
      lat: derivedLat,
      lng: derivedLng,
      offsetLat,
      offsetLng,
      topPct: derivedTopPct,
      leftPct: derivedLeftPct,
      circleRadius: derivedCircleRadius,
      exactAddress: exactAddress.trim(),
      approxAddress: `${district} Yakınları, İstanbul`,
      hostPhone: 'Telefon paylaşılmadı',
      hostName: 'Örnek Ev Sahibi',
      powerKw: Number(powerKw),
      plugType,
      isSolarPowered: false,
      totalEarned: 0,
      distanceKm: Number((1.5 + Math.random() * 3.5).toFixed(1)),
      stationImage: finalImage,
      description: `${district} bölgesinde ${powerKw} kW ${plugType} şarj noktası. ${accessType}.`,
      isPendingVerification: true,
      status: 'pending_verification'
    };

    // İstasyonun bağımsız ilk müsaitlik ayarını kaydet
    const initialGrid = schedulePreset === 'night' ? {
      morning: [false, false, false, false, false, false, false],
      noon: [false, false, false, false, false, false, false],
      evening: [true, true, true, true, true, true, true],
      night: [true, true, true, true, true, true, true]
    } : schedulePreset === 'day' ? {
      morning: [true, true, true, true, true, false, false],
      noon: [true, true, true, true, true, false, false],
      evening: [false, false, false, false, false, false, false],
      night: [false, false, false, false, false, false, false]
    } : {
      morning: [true, true, true, true, true, true, true],
      noon: [true, true, true, true, true, true, true],
      evening: [true, true, true, true, true, true, true],
      night: [true, true, true, true, true, true, true]
    };

    const newAvail = {
      ...INITIAL_AVAILABILITY,
      isStationOpen: true,
      grid: initialGrid,
      bookingApprovalMode: approvalMode,
      quietHoursActive
    };

    saveStationAvailability(newId, newAvail);

    // Kural 3: Depolama kotası dolarsa görseli geri alıp uyar
    try {
      onStationAdded(newSt);
    } catch (quotaErr) {
      if (customImagePreview) {
        showToast("Görsel kaydedilemedi");
        newSt.stationImage = SAMPLE_STATION_PHOTOS[0].url;
        onStationAdded(newSt);
      }
    }

    setCreatedStation(newSt);
    setIsSubmittingStation(false);
    setStep(5); // Başarı ekranı
  };

  return (
    <div className="pt-2 pb-16 w-full max-w-2xl mx-auto relative">
      {/* Kayan Toast Bildirimi (Kural 3) */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1C1C1E] border border-amber-500/30 text-[#F5F5F7] px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-[#A1A1A6] hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* Üst Bar: Geri Dön ve Vazgeç Butonları (Kural 5) */}
      <div className="pt-4 pb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBackOrCancel}
          className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors flex items-center space-x-1.5 font-normal cursor-pointer"
        >
          <span>←</span>
          <span>İstasyonlarım</span>
        </button>
        {step < 5 && (
          <button
            type="button"
            onClick={handleBackOrCancel}
            className="text-xs text-[#A1A1A6] hover:text-[#FF453A] transition-colors font-normal cursor-pointer"
          >
            Vazgeç
          </button>
        )}
      </div>

      {step <= 4 ? (
        <div className="space-y-8">
          {/* Adım Göstergesi */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#A1A1A6] font-medium">Adım {step} / 4</span>
              <span className="text-xs text-[#F5F5F7] font-semibold">
                {step === 1 && 'Konum ve başlık'}
                {step === 2 && 'Cihaz ve güç'}
                {step === 3 && 'Erişim tipi ve fotoğraf'}
                {step === 4 && 'Fiyat ve müsaitlik'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    s === step ? 'bg-[#F5F5F7]' : s < step ? 'bg-[#30C27C]' : 'bg-[#2C2C2E]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Adım 1: Konum ve Başlık */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F5F7] tracking-tight">
                  Konum ve başlık.
                </h1>
                <p className="text-xs sm:text-sm text-[#A1A1A6] mt-1.5 leading-relaxed">
                  İstasyonunun bulunduğu ilçeyi, tanıtıcı başlığını ve rezervasyon sonrası paylaşılacak açık adresini gir.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs text-[#A1A1A6] block mb-1.5 font-medium">İlçe</label>
                  <select
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      if (errors.district) setErrors(prev => ({ ...prev, district: undefined }));
                    }}
                    className={`w-full p-3 rounded-xl bg-[#141416] border ${
                      errors.district ? 'border-[#FF453A]' : 'border-[#2C2C2E]'
                    } text-xs sm:text-sm text-[#F5F5F7] focus:border-[#3A3A3C] outline-none`}
                  >
                    {Object.keys(DISTRICT_COORDS).map((d) => (
                      <option key={d} value={d} className="bg-[#1C1C1E]">{d}</option>
                    ))}
                  </select>
                  {errors.district && (
                    <p className="text-[11px] text-[#FF453A] mt-1 font-medium">{errors.district}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-[#A1A1A6] block mb-1.5 font-medium">İstasyon başlığı</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Moda, kapalı otopark"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                    }}
                    className={`w-full p-3 rounded-xl bg-[#141416] border ${
                      errors.name ? 'border-[#FF453A]' : 'border-[#2C2C2E]'
                    } text-xs sm:text-sm text-[#F5F5F7] focus:border-[#3A3A3C] outline-none`}
                  />
                  {errors.name ? (
                    <p className="text-[11px] text-[#FF453A] mt-1 font-medium">{errors.name}</p>
                  ) : (
                    <span className="text-[11px] text-[#71717A] block mt-1">Harita ve arama listesinde bu ad görünür.</span>
                  )}
                </div>

                <div>
                  <label className="text-xs text-[#A1A1A6] block mb-1.5 font-medium">Açık adres</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Cadde, sokak, bina no, garaj girişi ve varsa kumanda/şifre bilgisi"
                    value={exactAddress}
                    onChange={(e) => {
                      setExactAddress(e.target.value);
                      if (errors.exactAddress) setErrors(prev => ({ ...prev, exactAddress: undefined }));
                    }}
                    className={`w-full p-3 rounded-xl bg-[#141416] border ${
                      errors.exactAddress ? 'border-[#FF453A]' : 'border-[#2C2C2E]'
                    } text-xs sm:text-sm text-[#F5F5F7] focus:border-[#3A3A3C] outline-none leading-relaxed`}
                  />
                  {errors.exactAddress ? (
                    <p className="text-[11px] text-[#FF453A] mt-1 font-medium">{errors.exactAddress}</p>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-[11px] text-[#A1A1A6] mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C]"></span>
                      <span>Açık adres yalnızca rezervasyon onaylandıktan sonra sürücüyle paylaşılır.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Adım 2: Cihaz (Soket Tipi ve Güç) */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F5F7] tracking-tight">
                  Cihaz özellikleri.
                </h1>
                <p className="text-xs sm:text-sm text-[#A1A1A6] mt-1.5 leading-relaxed">
                  Şarj istasyonunun soket türünü ve sağladığı elektrik gücünü belirle.
                </p>
              </div>

              <div className="space-y-5 pt-2">
                <div>
                  <label className="text-xs text-[#A1A1A6] block mb-2 font-medium">Soket tipi</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'Type 2', label: 'Type 2 (Mennekes)', desc: 'Türkiye ve Avrupa standart AC soketi' },
                      { id: 'CCS2', label: 'CCS2 / Combo 2', desc: 'Hızlı DC veya kombine soket' }
                    ].map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setPlugType(s.id);
                          if (errors.plugType) setErrors(prev => ({ ...prev, plugType: undefined }));
                        }}
                        className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                          plugType === s.id
                            ? 'bg-[#1C1C1E] border-white text-[#F5F5F7]'
                            : 'bg-[#141416] border-[#2C2C2E] text-[#A1A1A6] hover:border-[#3A3A3C]'
                        }`}
                      >
                        <div className="font-semibold text-xs sm:text-sm text-[#F5F5F7]">{s.label}</div>
                        <div className="text-[11px] text-[#A1A1A6] mt-1">{s.desc}</div>
                      </div>
                    ))}
                  </div>
                  {errors.plugType && (
                    <p className="text-[11px] text-[#FF453A] mt-1.5 font-medium">{errors.plugType}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-[#A1A1A6] block mb-2 font-medium">Şarj gücü (Varsayılan 11 kW)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { kw: 7.4, label: '7.4 kW AC', desc: 'Monofaze 32A' },
                      { kw: 11, label: '11 kW AC', desc: 'Trifaze 16A (En yaygın)' },
                      { kw: 22, label: '22 kW AC', desc: 'Trifaze 32A (Maksimum)' }
                    ].map((p) => (
                      <div
                        key={p.kw}
                        onClick={() => {
                          setPowerKw(p.kw);
                          if (errors.powerKw) setErrors(prev => ({ ...prev, powerKw: undefined }));
                        }}
                        className={`p-4 rounded-2xl cursor-pointer border transition-all text-center ${
                          powerKw === p.kw
                            ? 'bg-[#1C1C1E] border-white text-[#F5F5F7]'
                            : 'bg-[#141416] border-[#2C2C2E] text-[#A1A1A6] hover:border-[#3A3A3C]'
                        }`}
                      >
                        <div className="font-bold text-sm text-[#F5F5F7]">{p.label}</div>
                        <div className="text-[10px] text-[#A1A1A6] mt-1">{p.desc}</div>
                      </div>
                    ))}
                  </div>
                  {errors.powerKw && (
                    <p className="text-[11px] text-[#FF453A] mt-1.5 font-medium">{errors.powerKw}</p>
                  )}
                </div>

                <div className="pt-2">
                  <label className="text-xs text-[#A1A1A6] block mb-2 font-medium">Sabit kablo durumu</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setHasFixedCable(true)}
                      className={`p-3.5 rounded-2xl cursor-pointer border transition-all ${
                        hasFixedCable
                          ? 'bg-[#1C1C1E] border-white text-[#F5F5F7]'
                          : 'bg-[#141416] border-[#2C2C2E] text-[#A1A1A6] hover:border-[#3A3A3C]'
                      }`}
                    >
                      <div className="font-semibold text-xs text-[#F5F5F7]">Cihaza entegre kablo var</div>
                      <div className="text-[11px] text-[#A1A1A6] mt-0.5">Sürücünün kendi kablosunu çıkarmasına gerek yok.</div>
                    </div>

                    <div
                      onClick={() => setHasFixedCable(false)}
                      className={`p-3.5 rounded-2xl cursor-pointer border transition-all ${
                        !hasFixedCable
                          ? 'bg-[#1C1C1E] border-white text-[#F5F5F7]'
                          : 'bg-[#141416] border-[#2C2C2E] text-[#A1A1A6] hover:border-[#3A3A3C]'
                      }`}
                    >
                      <div className="font-semibold text-xs text-[#F5F5F7]">Yalnızca soket var</div>
                      <div className="text-[11px] text-[#A1A1A6] mt-0.5">Sürücü kendi Type 2 kablosunu getirmelidir.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Adım 3: Erişim Tipi ve Fotoğraf */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F5F7] tracking-tight">
                  Erişim tipi ve fotoğraf.
                </h1>
                <p className="text-xs sm:text-sm text-[#A1A1A6] mt-1.5 leading-relaxed">
                  Sürücünün şarj alanına nasıl erişeceğini seç ve istasyonunun görünümünü ekle.
                </p>
              </div>

              <div className="space-y-5 pt-2">
                <div>
                  <label className="text-xs text-[#A1A1A6] block mb-2 font-medium">Erişim tipi</label>
                  <div className="space-y-2.5">
                    {[
                      { id: 'Bağımsız garaj', title: 'Bağımsız garaj', desc: 'Müstakil kapalı veya açık garaj. Şifreli kumanda veya doğrudan bağımsız erişim.' },
                      { id: 'Site girişli', title: 'Site girişli', desc: 'Güvenlikli site içi garaj. Plaka tanıma veya danışma kaydı ile giriş.' },
                      { id: 'Ev sahibi eşliğinde', title: 'Ev sahibi eşliğinde', desc: 'Gelişte ev sahibi sürücüyü karşılar ve soketi aktif eder.' }
                    ].map((acc) => (
                      <div
                        key={acc.id}
                        onClick={() => {
                          setAccessType(acc.id);
                          if (errors.accessType) setErrors(prev => ({ ...prev, accessType: undefined }));
                        }}
                        className={`p-4 rounded-2xl cursor-pointer border transition-all flex items-start justify-between ${
                          accessType === acc.id
                            ? 'bg-[#1C1C1E] border-white text-[#F5F5F7]'
                            : 'bg-[#141416] border-[#2C2C2E] text-[#A1A1A6] hover:border-[#3A3A3C]'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-xs sm:text-sm text-[#F5F5F7]">{acc.title}</div>
                          <div className="text-[11px] text-[#A1A1A6] mt-1 leading-relaxed">{acc.desc}</div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                          accessType === acc.id ? 'border-white bg-white' : 'border-[#3A3A3C]'
                        }`}>
                          {accessType === acc.id && <div className="w-1.5 h-1.5 rounded-full bg-black"></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {errors.accessType && (
                    <p className="text-[11px] text-[#FF453A] mt-1.5 font-medium">{errors.accessType}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-[#A1A1A6] block mb-2 font-medium">İstasyon fotoğrafı</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    {SAMPLE_STATION_PHOTOS.map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => {
                          setStationImage(photo.url);
                          setCustomImagePreview(null);
                          setImageError(null);
                          if (errors.stationImage) setErrors(prev => ({ ...prev, stationImage: undefined }));
                        }}
                        className={`rounded-xl overflow-hidden border cursor-pointer relative group transition-all ${
                          stationImage === photo.url && !customImagePreview ? 'border-white ring-2 ring-white/20' : 'border-[#2C2C2E] opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={photo.url} alt={photo.label} className="w-full h-20 object-cover" />
                        <div className="p-1.5 bg-[#141416] text-[10px] text-center text-[#A1A1A6] font-medium truncate">
                          {photo.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Kural 3: Özel Görsel Yükleme Alanı (Canvas ile 1024px, JPEG 0.7) */}
                  <div className="pt-2">
                    <label className="text-[11px] text-[#A1A1A6] block mb-1.5 font-medium">
                      Veya kendi fotoğrafını yükle (maks. 1,5 MB)
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] hover:border-[#3A3A3C] text-xs text-[#F5F5F7] transition-all">
                        <span>📷</span>
                        <span>Fotoğraf seç</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCustomImageUpload}
                        />
                      </label>
                      {customImagePreview && (
                        <div className="flex items-center space-x-2.5 bg-[#141416] px-3 py-1.5 rounded-xl border border-[#2C2C2E]">
                          <img src={customImagePreview} alt="Önizleme" className="w-9 h-9 rounded-lg object-cover border border-[#30C27C]" />
                          <span className="text-[11px] text-[#30C27C] font-medium">Özel görsel yüklendi</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomImagePreview(null);
                              setStationImage(SAMPLE_STATION_PHOTOS[0].url);
                            }}
                            className="text-[11px] text-[#A1A1A6] hover:text-[#FF453A] ml-1"
                          >
                            Kaldır
                          </button>
                        </div>
                      )}
                    </div>
                    {imageError && (
                      <p className="text-[11px] text-[#FF453A] mt-1.5 font-medium">{imageError}</p>
                    )}
                    {errors.stationImage && (
                      <p className="text-[11px] text-[#FF453A] mt-1.5 font-medium">{errors.stationImage}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Adım 4: Fiyat ve Müsaitlik */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F5F7] tracking-tight">
                  Fiyat ve müsaitlik.
                </h1>
                <p className="text-xs sm:text-sm text-[#A1A1A6] mt-1.5 leading-relaxed">
                  Baz şarj birim fiyatını ve başlangıç takvim kurallarını ayarla.
                </p>
              </div>

              <div className="space-y-5 pt-2">
                <div>
                  <label className="text-xs text-[#A1A1A6] block mb-1.5 font-medium">Baz birim fiyat (₺ / kWh)</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="number"
                      step="0.10"
                      min="3.00"
                      max="15.00"
                      value={pricePerKwh}
                      onChange={(e) => {
                        setPricePerKwh(e.target.value);
                        if (errors.pricePerKwh) {
                          setErrors(prev => ({ ...prev, pricePerKwh: undefined }));
                        }
                      }}
                      className={`w-full sm:w-40 p-3 rounded-xl bg-[#141416] border ${
                        errors.pricePerKwh ? 'border-[#FF453A]' : 'border-[#2C2C2E]'
                      } text-base font-bold text-[#F5F5F7] tabular-nums focus:border-[#3A3A3C] outline-none`}
                    />
                    <span className="text-xs text-[#A1A1A6] leading-relaxed">
                      Gece saatlerinde ×0,75, yoğun saatlerde ×1,20 çarpan platform tarafından otomatik uygulanır.
                    </span>
                  </div>
                  {errors.pricePerKwh && (
                    <p className="text-[11px] text-[#FF453A] mt-1.5 font-medium">{errors.pricePerKwh}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-[#A1A1A6] block mb-2 font-medium">Başlangıç müsaitlik kuralı</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'all', title: '7/24 açık', desc: 'Haftanın her günü tüm saatlerde randevuya açık' },
                      { id: 'day', title: 'Hafta içi gündüz', desc: 'Pazartesi–Cuma 08:00 – 18:00 arası' },
                      { id: 'night', title: 'Akşam ve gece', desc: 'Her gün 18:00 – 08:00 arası' }
                    ].map((pre) => (
                      <div
                        key={pre.id}
                        onClick={() => setSchedulePreset(pre.id)}
                        className={`p-3.5 rounded-2xl cursor-pointer border transition-all ${
                          schedulePreset === pre.id
                            ? 'bg-[#1C1C1E] border-white text-[#F5F5F7]'
                            : 'bg-[#141416] border-[#2C2C2E] text-[#A1A1A6] hover:border-[#3A3A3C]'
                        }`}
                      >
                        <div className="font-semibold text-xs text-[#F5F5F7]">{pre.title}</div>
                        <div className="text-[10px] text-[#A1A1A6] mt-1">{pre.desc}</div>
                      </div>
                    ))}
                  </div>
                  <span className="text-[11px] text-[#71717A] block mt-1.5">
                    İstasyon kaydedildikten sonra "Takvimi düzenle" ekranından saat bazında özelleştirilebilir.
                  </span>
                </div>

                <div>
                  <label className="text-xs text-[#A1A1A6] block mb-2 font-medium">Onay modu</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setApprovalMode('manual')}
                      className={`p-3.5 rounded-2xl cursor-pointer border transition-all ${
                        approvalMode === 'manual'
                          ? 'bg-[#1C1C1E] border-white text-[#F5F5F7]'
                          : 'bg-[#141416] border-[#2C2C2E] text-[#A1A1A6] hover:border-[#3A3A3C]'
                      }`}
                    >
                      <div className="font-semibold text-xs text-[#F5F5F7]">Ben onaylarım</div>
                      <div className="text-[11px] text-[#A1A1A6] mt-0.5">Her rezervasyon isteğini tek tek incelersin.</div>
                    </div>

                    <div
                      onClick={() => setApprovalMode('auto')}
                      className={`p-3.5 rounded-2xl cursor-pointer border transition-all ${
                        approvalMode === 'auto'
                          ? 'bg-[#1C1C1E] border-white text-[#F5F5F7]'
                          : 'bg-[#141416] border-[#2C2C2E] text-[#A1A1A6] hover:border-[#3A3A3C]'
                      }`}
                    >
                      <div className="font-semibold text-xs text-[#F5F5F7]">Otomatik kabul</div>
                      <div className="text-[11px] text-[#A1A1A6] mt-0.5">Müsait saatlerdeki istekler hemen onaylanır.</div>
                    </div>
                  </div>
                </div>

                {/* Sessiz Saatler */}
                <div className="pt-2">
                  <div 
                    onClick={() => setQuietHoursActive(!quietHoursActive)}
                    className="p-4 rounded-2xl bg-[#141416] border border-[#2C2C2E] flex items-center justify-between cursor-pointer hover:border-[#3A3A3C] transition-all select-none"
                  >
                    <div>
                      <div className="font-semibold text-xs text-[#F5F5F7]">Sessiz saatler (23:00 – 07:00)</div>
                      <div className="text-[11px] text-[#A1A1A6] mt-0.5">
                        Gece saatlerinde yeni seans başlatılmaz; komşular rahatsız edilmez.
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${quietHoursActive ? 'bg-[#30C27C]' : 'bg-[#3A3A3C]'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${quietHoursActive ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* İlerleme ve Aksiyon Butonları */}
          <div className="flex items-center space-x-3 pt-6 border-t border-[#2C2C2E]/60">
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-6 py-3 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#F5F5F7] border border-[#3A3A3C] font-medium text-xs transition-all cursor-pointer"
              >
                Geri
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all cursor-pointer shadow-sm"
              >
                Devam et
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmittingStation}
                onClick={handleSubmit}
                className="flex-1 py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-wait"
              >
                {isSubmittingStation ? 'Kaydediliyor...' : 'İstasyonu kaydet'}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Adım 5: Başarı Ekranı (Doğrulama Sonrası Yayına Alınır - Kural 1) */
        <div className="space-y-8 pt-4">
          <div className="space-y-4">
            <div className={`inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-semibold ${
              isSimulatedVerified
                ? 'bg-[#30C27C]/15 border border-[#30C27C]/30 text-[#30C27C]'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isSimulatedVerified ? 'bg-[#30C27C]' : 'bg-amber-400'}`}></span>
              <span>{isSimulatedVerified ? 'İstasyon doğrulandı ve yayında' : 'Doğrulama sonrası yayına alınır'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-[#F5F5F7] tracking-tight">
              {isSimulatedVerified ? 'İstasyonun yayına alındı.' : 'İstasyon kaydın tamamlandı.'}
            </h1>
            <p className="text-xs sm:text-sm text-[#A1A1A6] leading-relaxed max-w-xl">
              {isSimulatedVerified
                ? 'İstasyon doğrulaması başarıyla tamamlandı. Artık Keşfet haritasında ve randevu listesinde tüm sürücüler tarafından görüntülenebilir.'
                : 'Operasyon ve güvenlik ekibimiz adres ve şarj altyapısı güvenliğini 24 saat içinde inceler. Doğrulama tamamlandığında istasyonunuz haritada aktif olarak listelenecektir.'}
            </p>
          </div>

          {/* Kontrol Listesi & Demo Doğrulamayı Simüle Et (Kural 1) */}
          <div className="bg-[#141416] border border-[#2C2C2E] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[#F5F5F7]">Doğrulama kontrol listesi</h3>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                isSimulatedVerified 
                  ? 'bg-[#30C27C]/15 border border-[#30C27C]/30 text-[#30C27C]' 
                  : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
              }`}>
                {isSimulatedVerified ? 'Onaylandı' : 'İncelemede'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-[#A1A1A6] border-t border-[#2C2C2E] pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-[#30C27C]">✓</span>
                  <span>Kimlik doğrulaması</span>
                </div>
                <span className="text-[11px] text-[#30C27C]">Onaylandı</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-[#30C27C]">✓</span>
                  <span>Adres belgesi</span>
                </div>
                <span className="text-[11px] text-[#30C27C]">Onaylandı</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={isSimulatedVerified ? 'text-[#30C27C]' : 'text-amber-400'}>
                    {isSimulatedVerified ? '✓' : '⏳'}
                  </span>
                  <span>Cihaz bilgisi</span>
                </div>
                <span className={`text-[11px] ${isSimulatedVerified ? 'text-[#30C27C]' : 'text-amber-400'}`}>
                  {isSimulatedVerified ? 'Onaylandı' : 'İnceleniyor'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#2C2C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-[#71717A]">Demo ortamında beklemeden istasyonu yayına al:</span>
              <button
                type="button"
                onClick={() => {
                  if (createdStation && onSimulateVerify) {
                    onSimulateVerify(createdStation.id);
                    setIsSimulatedVerified(true);
                  }
                }}
                disabled={isSimulatedVerified}
                className={`px-4 py-2 rounded-full font-semibold text-xs transition-all cursor-pointer ${
                  isSimulatedVerified
                    ? 'bg-[#30C27C]/20 text-[#30C27C] border border-[#30C27C]/30 cursor-default'
                    : 'bg-[#30C27C] hover:bg-[#34D399] text-black shadow-sm'
                }`}
              >
                {isSimulatedVerified ? '✓ Doğrulandı & Yayında' : 'Doğrulamayı simüle et'}
              </button>
            </div>
          </div>

          {/* İstasyon Özeti Kartı */}
          {createdStation && (
            <div className="bg-[#141416] border border-[#2C2C2E] rounded-[24px] p-6 space-y-4">
              <div className="flex items-center space-x-4">
                <img
                  src={createdStation.stationImage}
                  alt={createdStation.name}
                  className="w-16 h-16 rounded-[14px] object-cover bg-[#1C1C1E] border border-[#2C2C2E]"
                />
                <div>
                  <h3 className="font-semibold text-base text-[#F5F5F7]">{createdStation.name}</h3>
                  <p className="text-xs text-[#A1A1A6] mt-0.5">{createdStation.specs}</p>
                  <p className="text-[11px] text-[#71717A] mt-0.5">{createdStation.locationArea}</p>
                </div>
              </div>

              <div className="border-t border-[#2C2C2E] pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[#A1A1A6] block text-[11px]">Şarj gücü</span>
                  <strong className="text-[#F5F5F7] font-semibold block mt-0.5">{createdStation.powerKw} kW AC</strong>
                </div>
                <div>
                  <span className="text-[#A1A1A6] block text-[11px]">Baz fiyat</span>
                  <strong className="text-[#F5F5F7] font-semibold block mt-0.5">₺{Number(createdStation.pricePerKwh).toFixed(2).replace('.', ',')} / kWh</strong>
                </div>
                <div>
                  <span className="text-[#A1A1A6] block text-[11px]">Durum</span>
                  <span className={isSimulatedVerified ? 'text-[#30C27C] font-medium block mt-0.5' : 'text-amber-300 font-medium block mt-0.5'}>
                    {isSimulatedVerified ? 'Yayında' : 'İncelemede'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Eylem Butonları */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
            <button
              onClick={onBack}
              className="py-3 px-6 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all cursor-pointer text-center"
            >
              İstasyonlarım'a dön
            </button>
            {createdStation && (
              <button
                onClick={() => onOpenSchedule(createdStation)}
                className="py-3 px-6 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#F5F5F7] border border-[#3A3A3C] font-medium text-xs transition-all cursor-pointer text-center"
              >
                Takvimi düzenle
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- EV SAHİBİ MÜSAİTLİK TAKVİMİ BİLEŞENİ (AVAILABILITY SCHEDULE) ---
const HostAvailabilitySchedule = ({
  station = { id: 'st-01', name: 'Moda, müstakil garaj' },
  onBack,
  onAvailabilityChange
}) => {
  const stationId = station?.id || 'st-01';
  const [availability, setAvailability] = React.useState(() => getStoredAvailabilityForStation(stationId));
  const [newDayInput, setNewDayInput] = React.useState('');
  const [isAddingDay, setIsAddingDay] = React.useState(false);

  React.useEffect(() => {
    setAvailability(getStoredAvailabilityForStation(stationId));
  }, [stationId]);

  const updateAvailability = (updater) => {
    setAvailability(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveStationAvailability(stationId, next);
      if (onAvailabilityChange) onAvailabilityChange(stationId, next);
      return next;
    });
  };

  const days = [
    { key: 0, label: 'Pzt' },
    { key: 1, label: 'Sal' },
    { key: 2, label: 'Çar' },
    { key: 3, label: 'Per' },
    { key: 4, label: 'Cum' },
    { key: 5, label: 'Cmt' },
    { key: 6, label: 'Paz' },
  ];

  const timeSlots = [
    { id: 'morning', label: 'Sabah 06–12', hours: 6 },
    { id: 'noon', label: 'Öğle 12–17', hours: 5 },
    { id: 'evening', label: 'Akşam 17–22', hours: 5 },
    { id: 'night', label: 'Gece 22–06', hours: 8 },
  ];

  // Toplam haftalık müsait saat hesabı (Varsayılan 81 saat)
  const totalWeeklyHours = React.useMemo(() => {
    if (!availability.isStationOpen) return 0;
    return timeSlots.reduce((acc, slot) => {
      const activeCount = (availability.grid[slot.id] || []).filter(Boolean).length;
      return acc + (activeCount * slot.hours);
    }, 0);
  }, [availability]);

  const toggleCell = (slotId, dayIdx) => {
    updateAvailability(prev => {
      const currentSlot = [...prev.grid[slotId]];
      currentSlot[dayIdx] = !currentSlot[dayIdx];
      return {
        ...prev,
        grid: {
          ...prev.grid,
          [slotId]: currentSlot
        }
      };
    });
  };

  const toggleStationOpen = () => {
    updateAvailability(prev => ({
      ...prev,
      isStationOpen: !prev.isStationOpen
    }));
  };

  const toggleQuietHours = () => {
    updateAvailability(prev => ({
      ...prev,
      quietHoursActive: !prev.quietHoursActive
    }));
  };

  const handleAddBlockedDay = () => {
    if (!newDayInput.trim()) return;
    updateAvailability(prev => ({
      ...prev,
      blockedDays: [...prev.blockedDays, newDayInput.trim()]
    }));
    setNewDayInput('');
    setIsAddingDay(false);
  };

  const removeBlockedDay = (dayToRemove) => {
    updateAvailability(prev => ({
      ...prev,
      blockedDays: prev.blockedDays.filter(d => d !== dayToRemove)
    }));
  };

  // Kural 6: Varsayılan ayarlara sıfırlama işlemi (localStorage ve state)
  const handleResetToDefaults = () => {
    try {
      localStorage.removeItem(getStationStorageKey(stationId));
      if (stationId === 'st-01') {
        localStorage.removeItem(STORAGE_KEY_AVAILABILITY);
      }
    } catch (e) {
      console.error('localStorage temizleme hatası:', e);
    }
    const fresh = {
      ...INITIAL_AVAILABILITY,
      grid: {
        morning: [...INITIAL_AVAILABILITY.grid.morning],
        noon: [...INITIAL_AVAILABILITY.grid.noon],
        evening: [...INITIAL_AVAILABILITY.grid.evening],
        night: [...INITIAL_AVAILABILITY.grid.night]
      },
      blockedDays: [...INITIAL_AVAILABILITY.blockedDays]
    };
    saveStationAvailability(stationId, fresh);
    setAvailability(fresh);
    if (onAvailabilityChange) onAvailabilityChange(stationId, fresh);
  };

  // Kural 2 & 3: Gece dilimi çakışma uyarısı hesabı
  const conflictWarning = React.useMemo(() => {
    return getNightConflictWarning(availability);
  }, [availability]);

  return (
    <div className="pt-2 pb-16 w-full">
      {/* 1. Geri Dön Linki */}
      <div className="pt-4 pb-3">
        <button
          onClick={onBack}
          className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors flex items-center space-x-1.5 font-normal"
        >
          <span>←</span>
          <span>İstasyonlarım</span>
        </button>
      </div>

      {/* 2. Başlık Satırı & İstasyon Açık/Kapalı Switch & Varsayılana Sıfırla */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-[#2C2C2E]/50">
        <div>
          <h1 className="hero-title">
            Müsaitlik.
          </h1>
          <p className="text-sm text-[#A1A1A6] mt-1 font-normal">
            {station.name} · Soketini ne zaman paylaşacağını sen belirlersin.
          </p>
        </div>

        {/* Sağ taraf: Varsayılana sıfırla ve İstasyon Açık / Kapalı Toggle */}
        <div className="flex items-center space-x-4 self-start sm:self-center">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors underline underline-offset-4 cursor-pointer"
          >
            Varsayılana sıfırla
          </button>

          {/* İstasyon Açık / Kapalı Pill Toggle */}
          <div 
            onClick={toggleStationOpen}
            className="inline-flex items-center space-x-3 px-4 py-2.5 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] cursor-pointer hover:border-[#3A3A3C] transition-all select-none"
          >
            <span className="text-xs font-semibold text-[#F5F5F7]">
              {availability.isStationOpen ? 'İstasyon açık' : 'İstasyon kapalı'}
            </span>
            <div className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${availability.isStationOpen ? 'bg-[#30C27C]' : 'bg-[#3A3A3C]'}`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${availability.isStationOpen ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </div>
        </div>
      </div>

      {/* İstasyon Kapalı Uyarı Şeridi */}
      {!availability.isStationOpen && (
        <div className="mt-6 p-4 rounded-2xl bg-[#1C1C1E] border border-amber-500/40 flex items-center space-x-3 text-xs text-[#F5F5F7]">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
          <span>İstasyon kapalı. Yeni rezervasyon alınmaz; mevcut rezervasyonların etkilenmez.</span>
        </div>
      )}

      {/* 3. Haftalık Takvim Bölümü */}
      <div className="pt-8 pb-10">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[#F5F5F7] tracking-tight">Haftalık takvim</h2>
            <p className="text-xs text-[#A1A1A6] mt-0.5">Saat dilimine dokunarak aç veya kapat.</p>
          </div>
          <div className="text-sm text-[#A1A1A6] font-normal tabular-nums">
            Haftada <span className="text-[#F5F5F7] font-semibold">{totalWeeklyHours}</span> saat müsait
          </div>
        </div>

        {/* Haftalık Izgara */}
        <div className="overflow-x-auto pb-2 scrollbar-none">
          <div className="min-w-[620px]">
            {/* Gün Başlıkları */}
            <div className="grid grid-cols-8 gap-2 mb-2 text-center text-xs text-[#A1A1A6]">
              <div className="text-left pl-1"></div>
              {days.map((d) => (
                <div key={d.key} className="font-medium text-xs text-[#A1A1A6]">{d.label}</div>
              ))}
            </div>

            {/* Zaman Dilimi Satırları */}
            <div className="space-y-2">
              {timeSlots.map((slot) => (
                <div key={slot.id} className="grid grid-cols-8 gap-2 items-center">
                  <div className="text-xs text-[#A1A1A6] font-normal pl-1 truncate">
                    {slot.label}
                  </div>
                  {days.map((d) => {
                    const isOpen = availability.isStationOpen && availability.grid[slot.id][d.key];
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => toggleCell(slot.id, d.key)}
                        disabled={!availability.isStationOpen}
                        className={`h-11 rounded-xl flex items-center justify-center text-xs transition-all select-none ${
                          isOpen
                            ? 'bg-[#F5F5F7] text-black font-semibold shadow-md hover:bg-white'
                            : 'bg-[#1C1C1E] text-[#71717A] hover:bg-[#2C2C2E] hover:text-[#A1A1A6]'
                        } ${!availability.isStationOpen ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {isOpen ? 'Açık' : '—'}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Kural 2 & 3: Sessiz saatler gece dilimiyle çakışma dinamik uyarısı */}
        {conflictWarning && (
          <div className="mt-4 px-4 py-3 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] flex items-center space-x-2.5 text-xs text-[#A1A1A6]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
            <span>{conflictWarning}</span>
          </div>
        )}
      </div>

      {/* 4. Alt İki Kart: Sessiz Saatler & Rezervasyon Onayı */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Sessiz Saatler Kartı */}
        <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[28px] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base text-[#F5F5F7]">Sessiz saatler</h3>
            <div
              onClick={toggleQuietHours}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                availability.quietHoursActive ? 'bg-[#30C27C]' : 'bg-[#3A3A3C]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  availability.quietHoursActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              ></div>
            </div>
          </div>

          {/* Kural 1: Saat aralığı (başlangıç ve bitiş) ev sahibi tarafından değiştirilebilsin */}
          {availability.quietHoursActive ? (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1A6] font-medium block">Başlangıç saati</label>
                  <input
                    type="time"
                    value={availability.quietHoursStart || '23:00'}
                    onChange={(e) => updateAvailability(prev => ({ ...prev, quietHoursStart: e.target.value }))}
                    className="w-full bg-[#141416] border border-[#2C2C2E] focus:border-[#F5F5F7] rounded-xl px-3 py-2 text-xs text-[#F5F5F7] tabular-nums outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1A6] font-medium block">Bitiş saati</label>
                  <input
                    type="time"
                    value={availability.quietHoursEnd || '07:00'}
                    onChange={(e) => updateAvailability(prev => ({ ...prev, quietHoursEnd: e.target.value }))}
                    className="w-full bg-[#141416] border border-[#2C2C2E] focus:border-[#F5F5F7] rounded-xl px-3 py-2 text-xs text-[#F5F5F7] tabular-nums outline-none transition-colors"
                  />
                </div>
              </div>
              <p className="text-xs text-[#A1A1A6] leading-relaxed">
                {availability.quietHoursStart || '23:00'} – {availability.quietHoursEnd || '07:00'} arasında yeni geliş olmasın. O saatlerde başlayan seanslar için rezervasyon alınmaz; komşularını rahatsız etmezsin.
              </p>
            </div>
          ) : (
            <p className="text-xs text-[#A1A1A6] leading-relaxed">
              Sessiz saatler kapalı. İstasyon takvimde açık olan tüm saatlerde yeni seans kabul eder.
            </p>
          )}

          <div className="border-t border-[#2C2C2E] pt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-[#A1A1A6]">Bloke edilen günler</span>
            <div className="flex items-center flex-wrap gap-2">
              {availability.blockedDays.map((bDay) => (
                <span
                  key={bDay}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#2C2C2E] text-xs text-[#F5F5F7]"
                >
                  <span>{bDay}</span>
                  <button
                    onClick={() => removeBlockedDay(bDay)}
                    className="text-[#A1A1A6] hover:text-white ml-1 text-xs"
                    title="Kaldır"
                  >
                    ×
                  </button>
                </span>
              ))}

              {isAddingDay ? (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={newDayInput}
                    onChange={(e) => setNewDayInput(e.target.value)}
                    placeholder={`Örn: 25 ${new Date().toLocaleDateString('tr-TR', { month: 'long' })}`}
                    className="w-24 px-2 py-1 bg-black text-xs text-white rounded-lg border border-[#3A3A3C] outline-none"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddBlockedDay(); }}
                  />
                  <button
                    onClick={handleAddBlockedDay}
                    className="text-xs px-2 py-1 bg-[#F5F5F7] text-black rounded-lg font-medium"
                  >
                    Ekle
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingDay(true)}
                  className="px-3 py-1.5 rounded-full border border-dashed border-[#3A3A3C] text-xs text-[#A1A1A6] hover:text-[#F5F5F7] hover:border-[#A1A1A6] transition-all"
                >
                  Gün ekle
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Rezervasyon Onayı Kartı */}
        <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[28px] p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-base text-[#F5F5F7]">Rezervasyon onayı</h3>
            <p className="text-xs text-[#A1A1A6] mt-1">İstekleri sen mi onaylarsın, otomatik mi kabul edilsin?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Ben Onaylarım */}
            <div
              onClick={() => updateAvailability(prev => ({ ...prev, bookingApprovalMode: 'manual' }))}
              className={`p-4 rounded-2xl cursor-pointer transition-all ${
                availability.bookingApprovalMode === 'manual'
                  ? 'bg-[#F5F5F7] text-black shadow-lg'
                  : 'bg-black/40 border border-[#2C2C2E] text-[#F5F5F7] hover:border-[#3A3A3C]'
              }`}
            >
              <div className="font-semibold text-xs sm:text-sm">Ben onaylarım</div>
              <p className={`text-[11px] mt-1 leading-normal ${
                availability.bookingApprovalMode === 'manual' ? 'text-neutral-700' : 'text-[#A1A1A6]'
              }`}>
                Her isteği görüp kabul edersin.
              </p>
            </div>

            {/* Otomatik Kabul */}
            <div
              onClick={() => updateAvailability(prev => ({ ...prev, bookingApprovalMode: 'auto' }))}
              className={`p-4 rounded-2xl cursor-pointer transition-all ${
                availability.bookingApprovalMode === 'auto'
                  ? 'bg-[#F5F5F7] text-black shadow-lg'
                  : 'bg-black/40 border border-[#2C2C2E] text-[#F5F5F7] hover:border-[#3A3A3C]'
              }`}
            >
              <div className="font-semibold text-xs sm:text-sm">Otomatik kabul</div>
              <p className={`text-[11px] mt-1 leading-normal ${
                availability.bookingApprovalMode === 'auto' ? 'text-neutral-700' : 'text-[#A1A1A6]'
              }`}>
                Müsait saatlerdeki istekler hemen onaylanır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- ŞİMDİ LAZIM (ACİL ŞARJ EŞLEŞTİRMESİ) BİLEŞENİ ---
const SimdiLazimView = ({
  stations,
  availability,
  onBack,
  onBookStation,
  onViewOnMap
}) => {
  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, []);

  // Şu anki tarih ve saat
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${mins}`;
  const currentHour = now.getHours();

  // Kural 3: Kapalı istasyonları ve o an sessiz saatte olan istasyonları listeden çıkar;
  // takvimde kapalı olan saat dilimlerini de dikkate al.
  const availableStations = React.useMemo(() => {
    return stations.filter((st) => {
      // 1. Doğrulama aşamasındaki veya kalıcı kapalı istasyonlar
      if (st.status === 'pending_verification' || st.isPendingVerification || st.isClosed) return false;

      // 2. Her istasyon için kendi takvimi & sessiz saat kuralı
      const stAvail = getStoredAvailabilityForStation(st.id);
      const check = checkStationAvailabilityAt(stAvail, dateStr, timeStr, 145);
      if (!check.isAvailable) return false;
      if (st.isAvailable === false) return false;

      return true;
    });
  }, [stations, dateStr, timeStr]);

  const bestMatch = availableStations[0];
  const otherMatches = availableStations.slice(1);

  // En iyi eşleşme için dinamik tarife ve hesaplar (TOGG %20 -> %80 için 53.1 kWh)
  const bestDynamicPrice = bestMatch
    ? getDynamicPriceInfo(bestMatch.pricePerKwh, currentHour)
    : null;
  const toggCalc = calculateChargingSession(bestMatch?.powerKw || 22, 11, 53.1);
  const estimatedKwh = 53.1;
  const estimatedTotal = bestDynamicPrice ? estimatedKwh * bestDynamicPrice.finalPrice : 0;
  const estimatedDurationMins = toggCalc.durationMinutes;
  const simdiLimitNote = toggCalc.limitNote;

  return (
    <div className="pt-2 pb-16 w-full space-y-8">
      {/* 1. Geri Dön Linki */}
      <div className="pt-4 pb-2">
        <button
          onClick={onBack}
          className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors flex items-center space-x-1.5 font-normal cursor-pointer"
        >
          <span>← Keşfet'e dön</span>
        </button>
      </div>

      {/* 2. Başlık ve Alt Metin */}
      <div>
        <h1 className="hero-title">Şimdi lazım.</h1>
        <p className="text-sm text-[#A1A1A6] mt-1 font-normal">
          Sana en yakın, şu an müsait ve aracına uygun şarj noktası.
        </p>
      </div>

      {/* 3. Arama Parametreleri Çipleri */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="px-3.5 py-1.5 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] text-[#F5F5F7]">
          Konum: Kadıköy
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] text-[#F5F5F7]">
          Araç: TOGG T10X · Type 2
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] text-[#F5F5F7] tabular-nums">
          Batarya: %20 → %80
        </div>
        <button
          onClick={onBack}
          className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] ml-2 underline underline-offset-4 transition-colors"
        >
          Değiştir
        </button>
      </div>

      {/* 4. En İyi Eşleşme Kartı */}
      {bestMatch ? (
        <div className="rounded-[28px] bg-[#1C1C1E] border border-[#2C2C2E] p-6 sm:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 shadow-2xl">
          {/* Sol: İstasyon Fotoğrafı */}
          <div className="w-full md:w-5/12 min-h-[220px] rounded-[20px] bg-[#141416] border border-[#2C2C2E] overflow-hidden shrink-0">
            <img
              src={bestMatch.stationImage || DEFAULT_IMAGE}
              alt={bestMatch.name || "En iyi eşleşen şarj istasyonu"}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_IMAGE; }}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Sağ: Bilgi & Eylemler */}
          <div className="flex-1 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Yeşil Durum Noktası */}
              <div className="flex items-center space-x-2 text-xs text-[#A1A1A6]">
                <span className="w-2 h-2 rounded-full bg-[#30C27C]"></span>
                <span>En iyi eşleşme · şu an müsait</span>
              </div>

              {/* İstasyon Başlığı ve Detay */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F7] tracking-tight">
                  {bestMatch.name}
                </h2>
                <p className="text-xs text-[#A1A1A6] mt-1">
                  Type 2 · {bestMatch.powerKw} kW · {bestMatch.type || 'Bağımsız garaj'} · {bestMatch.distanceKm || '1,4'} km
                </p>
              </div>

              {/* 3 Metrik Kutusu (Bölücülü) */}
              <div className="grid grid-cols-3 divide-x divide-[#2C2C2E] border-y border-[#2C2C2E] py-4">
                <div className="pr-3">
                  <span className="text-xs text-[#A1A1A6] block">Tahmini süre</span>
                  <span className="text-xl sm:text-2xl font-bold text-[#F5F5F7] mt-1 block tabular-nums">
                    {estimatedDurationMins} dk
                  </span>
                </div>
                <div className="px-3 sm:px-4">
                  <span className="text-xs text-[#A1A1A6] block">Birim fiyat</span>
                  <span className="text-xl sm:text-2xl font-bold text-[#F5F5F7] mt-1 block tabular-nums">
                    ₺{bestDynamicPrice.finalPrice.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="pl-3 sm:pl-4">
                  <span className="text-xs text-[#A1A1A6] block">Tahmini tutar</span>
                  <span className="text-xl sm:text-2xl font-bold text-[#F5F5F7] mt-1 block tabular-nums">
                    ₺{estimatedTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* Kural 2: 22 kW istasyon + 11 kW araç limit uyarısı */}
              {simdiLimitNote && (
                <div className="p-3 rounded-2xl bg-[#141416] border border-[#2C2C2E] text-xs text-[#A1A1A6] flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C] shrink-0"></span>
                  <span>{simdiLimitNote}</span>
                </div>
              )}

              {/* Tarife Notu */}
              <p className="text-xs text-[#A1A1A6] leading-relaxed">
                {bestDynamicPrice.type === 'offpeak'
                  ? `Gece tarifesi uygulanıyor (baz fiyat ₺${bestDynamicPrice.basePrice.toFixed(2).replace('.', ',')} × 0,75). Bu fiyat rezervasyon boyunca sabit. Kesin adres rezervasyondan sonra açılır.`
                  : bestDynamicPrice.type === 'peak'
                  ? `Yoğun saat tarifesi uygulanıyor (baz fiyat ₺${bestDynamicPrice.basePrice.toFixed(2).replace('.', ',')} × 1,20). Bu fiyat rezervasyon boyunca sabit. Kesin adres rezervasyondan sonra açılır.`
                  : `Standart tarife uygulanıyor (₺${bestDynamicPrice.basePrice.toFixed(2).replace('.', ',')} / kWh). Bu fiyat rezervasyon boyunca sabit. Kesin adres rezervasyondan sonra açılır.`}
              </p>
            </div>

            {/* Butonlar */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => onBookStation(bestMatch)}
                className="px-6 py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all shadow-md"
              >
                Rezervasyon yap
              </button>
              <button
                type="button"
                onClick={() => onViewOnMap(bestMatch)}
                className="px-6 py-3 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-[#2C2C2E] text-[#F5F5F7] font-semibold text-xs transition-all"
              >
                Haritada gör
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Eşleşme Yok (Kapalı veya Sessiz Saatte) */
        <div className="rounded-[28px] bg-[#1C1C1E] border border-[#2C2C2E] p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-[#141416] border border-[#2C2C2E] flex items-center justify-center mx-auto text-[#A1A1A6]">
            <i data-lucide="moon" className="w-5 h-5"></i>
          </div>
          <h2 className="text-lg font-semibold text-[#F5F5F7]">Şu an müsait istasyon bulunmuyor</h2>
          <p className="text-xs text-[#A1A1A6] max-w-md mx-auto leading-relaxed">
            Yakınınızdaki istasyonlar ev sahipleri tarafından geçici olarak kapatılmış veya sessiz saatler devresindedir. Yeni seans başlatılamaz.
          </p>
          <div className="pt-2">
            <button
              onClick={onBack}
              className="px-5 py-2.5 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all"
            >
              Keşfet'e dön
            </button>
          </div>
        </div>
      )}

      {/* 5. Diğer Yakın Seçenekler */}
      {otherMatches.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-base font-semibold text-[#F5F5F7]">Diğer yakın seçenekler</h2>
          <div className="border-t border-[#2C2C2E]">
            {otherMatches.map((st) => (
              <div
                key={st.id}
                onClick={() => onBookStation(st)}
                className="py-4 border-b border-[#2C2C2E] flex items-center justify-between cursor-pointer hover:bg-[#1C1C1E]/40 px-2 rounded-xl transition-all"
              >
                <div>
                  <h3 className="text-sm font-semibold text-[#F5F5F7]">{st.name}</h3>
                  <p className="text-xs text-[#A1A1A6] mt-0.5">
                    Type 2 · {st.powerKw} kW · {st.hostType || 'Ev sahibi eşliğinde'}
                  </p>
                </div>

                <div className="flex items-center space-x-6 text-xs tabular-nums">
                  <span className="text-[#A1A1A6] hidden sm:inline">{st.distanceKm || '2,3'} km</span>
                  <div className="flex items-center space-x-1.5 text-[#F5F5F7]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C]"></span>
                    <span className="text-xs">Şu an müsait</span>
                  </div>
                  <span className="font-semibold text-[#F5F5F7]">
                    ₺{st.pricePerKwh.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- CANLI ŞARJ TELEMETRİSİ & AKILLI EV SAHİBİ SOHBETİ (CHARGING SESSION WITH CHAT) ---
const ChargingSessionWithChat = ({
  session,
  activeSession,
  station,
  driverStats,
  onBack,
  onFinishSession,
  totalHostSessions = 191
}) => {
  // 1. İstasyon ve Seans Parametreleri
  const currentSession = session || activeSession || station || {
    id: 'st-01',
    name: 'Moda, müstakil garaj',
    address: 'Örnek Sk. No:1, Garaj kodu: #0000, Kadıköy / İstanbul',
    hostName: 'Örnek Ev Sahibi',
    hostAvatar: 'ÖE',
    powerKw: 22,
    carModel: 'TOGG T10X Long Range',
    pricePerKwh: 6.80
  };

  const stationName = currentSession?.name || 'Moda, müstakil garaj';
  const hostName = currentSession?.hostName || currentSession?.host?.name || 'Örnek Ev Sahibi';
  const carModel = currentSession?.carModel || 'TOGG T10X Long Range';
  const stationAddress = currentSession?.address || currentSession?.exactAddress || 'Örnek Sk. No:1, Garaj kodu: #0000, Kadıköy / İstanbul';
  
  // Fatura baz fiyatı istasyonun gerçek baz fiyatından (Moda ₺6,80) ve saat çarpanından gelir
  const stationBasePrice = Number(currentSession?.pricePerKwh || currentSession?.unitPrice || station?.pricePerKwh || 6.80);
  const timeMultiplier = Number(currentSession?.timeMultiplier || 1.0);
  const baseRatePerKwh = Number((stationBasePrice * timeMultiplier).toFixed(2));
  const idleFeeRatePerMin = 2.50; // Dakika başına ₺2,50 ceza
  const stationPowerKw = Number(currentSession?.powerKw || station?.powerKw || 22);

  // Avatar baş harfleri ev sahibi adından türetilir (Örnek Ev Sahibi → ÖE)
  const derivedAvatar = React.useMemo(() => {
    if (currentSession?.hostAvatar && currentSession.hostAvatar !== 'AB') return currentSession.hostAvatar;
    const parts = hostName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase('tr-TR');
    }
    return hostName.slice(0, 2).toLocaleUpperCase('tr-TR');
  }, [hostName, currentSession?.hostAvatar]);

  // 2. Canlı Telemetri State Yönetimi
  // status: 'idle' | 'charging' | 'completed' | 'idle_fee'
  const [status, setStatus] = React.useState('idle');
  const [soc, setSoc] = React.useState(20); // %20'den başlar
  const [voltage, setVoltage] = React.useState(230.2); // ~230V
  const [currentA, setCurrentA] = React.useState(0.0); // ~16A
  const [powerKw, setPowerKw] = React.useState(0.0); // ~11 kW
  const [energyKwh, setEnergyKwh] = React.useState(0.00); // 0.00 kWh başlangıç
  const [idleFee, setIdleFee] = React.useState(0.00); // Ceza tutarı
  const [toleranceCountdown, setToleranceCountdown] = React.useState(10); // 10 saniye tolerans
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [simSpeed, setSimSpeed] = React.useState(1); // 1x veya 3x hızlandırma

  // 3. Akıllı Sohbet & Mesajlaşma State Yönetimi (Sohbet saatleri şimdiki saate göre üretilir)
  const [messages, setMessages] = React.useState(() => {
    const now = new Date();
    const tMinus1 = new Date(now.getTime() - 60000);
    const formatHM = (d) => d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return [
      {
        id: 'sys-init',
        sender: 'system',
        text: `⚡ Sistem: İstasyon ${stationPowerKw} kW; aracınız en fazla 11 kW kabul eder.`,
        timestamp: formatHM(tMinus1),
        type: 'system'
      },
      {
        id: 'host-welcome',
        sender: 'host',
        text: 'Merhaba! Garaja rahatça yanaşabilirsiniz, şarj ünitesi sol duvarda aktif. Sorun olursa buradan yazın.',
        timestamp: formatHM(now),
        type: 'normal'
      }
    ];
  });
  const [inputText, setInputText] = React.useState('');
  const [isHostTyping, setIsHostTyping] = React.useState(false);
  const [safetyWarning, setSafetyWarning] = React.useState(null);
  const [showSummaryModal, setShowSummaryModal] = React.useState(false);

  const messagesEndRef = React.useRef(null);

  // Otomatik mesaj kaydırma
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isHostTyping]);

  // Lucide ikonlarını güvenle yenile
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.lucide) {
      window.lucide.createIcons();
    }
  }, [status, messages, isHostTyping, safetyWarning, showSummaryModal]);

  // Sistem bildirim balonu ekleme yardımcısı
  const addSystemLog = (text, type = 'system') => {
    const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}-${Math.random()}`,
        sender: 'system',
        text,
        timestamp: timeStr,
        type
      }
    ]);
  };

  // 4. Şarj Telemetri Döngüsü (charging modu)
  React.useEffect(() => {
    if (status !== 'charging') return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);

      // Voltaj: ~230V (228.2V - 231.8V küçük dalgalanma)
      const vJitter = Math.random() * 3.2 - 1.6;
      setVoltage(Number((230.0 + vJitter).toFixed(1)));

      // Akım: ~16A (15.8A - 16.2A)
      const aJitter = Math.random() * 0.4 - 0.2;
      setCurrentA(Number((16.0 + aJitter).toFixed(1)));

      // Anlık Güç: ~11 kW TOGG AC kabul gücü standardı
      const pJitter = Math.random() * 0.2 - 0.1;
      setPowerKw(Number((11.0 + pJitter).toFixed(2)));

      // SoC artışı ve Aktarılan Enerji hesabı
      // TOGG 88.5 kWh batarya: %20 -> %80 = %60 = 53.1 kWh aktarımı
      // 1 SoC artışı = 0.885 kWh
      const step = simSpeed === 3 ? 3 : 1;

      setSoc((prevSoc) => {
        const nextSoc = prevSoc + step;
        if (nextSoc >= 80) {
          // %80 hedefe ulaşıldı: şarj durur, completed olur
          setStatus('completed');
          setVoltage(230.0);
          setCurrentA(0.0);
          setPowerKw(0.0);
          setEnergyKwh(53.10);
          addSystemLog('⚡ Sistem: Şarj %80 seviyesine ulaştı. Lütfen soketi boşaltınız.', 'system');
          return 80;
        }

        // Enerji artışı
        const addedKwh = 0.885 * step;
        setEnergyKwh((prevEnergy) => Number((prevEnergy + addedKwh).toFixed(2)));
        return nextSoc;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, simSpeed]);

  // 5. Tolerans Süresi Geri Sayımı (completed modu — 10 saniye)
  React.useEffect(() => {
    if (status !== 'completed') return;

    const timer = setInterval(() => {
      setToleranceCountdown((prev) => {
        if (prev <= 1) {
          // 10 saniyelik tolerans süresi doldu!
          setStatus('idle_fee');
          addSystemLog('⚠️ Sistem: 10 saniyelik tolerans süresi doldu. İşgal ücreti uygulanıyor (₺2,50/dk).', 'warning');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // 6. İşgal Ücreti Sayacı (idle_fee modu — saniye başına ₺2,50 / 60)
  React.useEffect(() => {
    if (status !== 'idle_fee') return;

    const feeInterval = setInterval(() => {
      setIdleFee((prev) => Number((prev + idleFeeRatePerMin / 60).toFixed(2)));
    }, 1000);

    return () => clearInterval(feeInterval);
  }, [status, idleFeeRatePerMin]);

  // 7. Gizlilik Koruması (Safety Filter — Telefon & IBAN Regex)
  const filterSensitiveData = (text) => {
    let hasLeak = false;
    let filtered = text;

    // Türkiye telefon numaraları regex
    const phoneRegex = /(?:\+?90|0)?\s*5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}|\b0?5\d{9}\b/g;
    if (phoneRegex.test(filtered)) {
      hasLeak = true;
      filtered = filtered.replace(phoneRegex, '•• [iletişim bilgisi maskelendi] ••');
    }

    // IBAN regex
    const ibanRegex = /\bTR\s*(?:\d\s*){24}\b|\bTR[0-9]{2}[0-9A-Z]{4}[0-9]{16}\b/gi;
    if (ibanRegex.test(filtered)) {
      hasLeak = true;
      filtered = filtered.replace(ibanRegex, '•• [IBAN maskelendi] ••');
    }

    return { text: filtered, hasLeak };
  };

  // 8. Mesaj Gönderme ve Otomatik Ev Sahibi Yanıtı (Host Bot Mock)
  const handleSendMessage = (textToSend) => {
    const rawMessage = (textToSend || inputText).trim();
    if (!rawMessage) return;

    const { text: safeText, hasLeak } = filterSensitiveData(rawMessage);

    if (hasLeak) {
      setSafetyWarning('Kişisel iletişim bilgileri güvenlik gereği maskelenmiştir. Platform dışı ödemeler garanti kapsamı dışındadır.');
      setTimeout(() => setSafetyWarning(null), 6500);
    }

    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const driverMessage = {
      id: `driver-msg-${Date.now()}`,
      sender: 'driver',
      text: safeText,
      timestamp: nowTime,
      masked: hasLeak,
      type: 'normal'
    };

    setMessages((prev) => [...prev, driverMessage]);
    setInputText('');

    // Otomatik Ev Sahibi Yanıtı Simülasyonu (Ahmet B.) — 1.5 - 2 saniye gecikme
    setIsHostTyping(true);
    const lower = safeText.toLowerCase();

    let reply = 'Mesajınızı aldım, garaj civarındayım. Bir ihtiyacınız olursa buradayım.';
    if (lower.includes('bariyer') || lower.includes('kapı')) {
      reply = 'Hoş geldiniz! Garaj kumandası sağ duvarda asılı, sorun olursa buradayım.';
    } else if (lower.includes('başladı') || lower.includes('sorunsuz')) {
      reply = 'Harika, panodan kontrol ettim; 11 kW şarj akımı stabil iletiliyor. Rahatınıza bakın!';
    } else if (lower.includes('rötar') || lower.includes('gecik') || lower.includes('10 dk')) {
      reply = 'Hiç sorun değil, yeriniz ayrılmış durumda bekliyor. Geldiğinizde haberleşiriz.';
    } else if (hasLeak) {
      reply = 'Güvenlik uyarısını gördüm, kurallar gereği tüm ödeme ve seans takibi ChargeRent üzerinden yapılıyor.';
    }

    const delay = 1500 + Math.random() * 500;
    setTimeout(() => {
      setIsHostTyping(false);
      const hostTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          id: `host-reply-${Date.now()}`,
          sender: 'host',
          text: reply,
          timestamp: hostTime,
          type: 'normal'
        }
      ]);
    }, delay);
  };

  // Şarjı Başlat
  const handleStartCharging = () => {
    setStatus('charging');
    setToleranceCountdown(10);
    setIdleFee(0.00);
    addSystemLog('⚡ Sistem: Şarj seansı başlatıldı (TOGG T10X · 11 kW AC standardı).', 'system');
  };

  // Seansı Tamamla ve Sonlandır
  const handleFinalizeSession = () => {
    const finalEnergy = energyKwh > 0 ? energyKwh : 53.10;
    const finalEnergyCost = finalEnergy * baseRatePerKwh;
    const totalCost = Number((finalEnergyCost + idleFee).toFixed(2));
    const durationMins = Math.max(1, Math.round(elapsedSeconds / 60));

    if (onFinishSession) {
      onFinishSession({
        durationMinutes: durationMins,
        energyKwh: Number(finalEnergy.toFixed(1)),
        unitPrice: baseRatePerKwh,
        subtotal: totalCost,
        idleFee: Number(idleFee.toFixed(2)),
        endReason: status === 'idle_fee' ? 'idle_penalty_ended' : 'normal',
        stationId: currentSession?.id || 'st-01',
        stationName: stationName,
        carModel: carModel
      }, false);
    }
    setShowSummaryModal(false);
  };

  // SVG Çemberi Geometrisi
  const radius = 78;
  const circumference = 2 * Math.PI * radius; // ~490.09
  const strokeDashoffset = circumference - (circumference * (soc / 100));

  // Tutar Hesapları
  const energyCost = energyKwh * baseRatePerKwh;
  const totalAmount = energyCost + idleFee;

  return (
    <div className="pt-2 pb-16 w-full space-y-6">
      
      {/* 1. Üst Gezinme & Geri Butonu */}
      <div className="pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors flex items-center space-x-1.5 font-normal cursor-pointer"
        >
          <span>← Keşfet'e dön</span>
        </button>

        {/* Canlı Simülasyon Hızlandırma & Test Kontrolleri */}
        <div className="flex items-center space-x-2">
          {status === 'charging' && (
            <>
              <button
                type="button"
                onClick={() => setSoc(78)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] text-[#A1A1A6] hover:text-[#F5F5F7] transition-all hover:border-[#3A3A3C]"
                title="Test amaçlı SoC değerini anında %78'e çıkarır"
              >
                ⚡ Test: %78'e atla
              </button>
              <button
                type="button"
                onClick={() => setSimSpeed(simSpeed === 1 ? 3 : 1)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                  simSpeed === 3 
                    ? 'bg-[#30C27C]/10 border-[#30C27C] text-[#30C27C]' 
                    : 'bg-[#1C1C1E] border-[#2C2C2E] text-[#A1A1A6]'
                }`}
              >
                {simSpeed === 3 ? '3x Hızlı' : '1x Normal'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Başlık ve Lokasyon */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2.5">
          <h1 className="hero-title text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F5F7]">
            {status === 'idle' && 'Şarj bağlantısı hazır.'}
            {status === 'charging' && 'Canlı şarj akışı sürüyor.'}
            {status === 'completed' && 'Şarj %80 seviyesine ulaştı.'}
            {status === 'idle_fee' && 'Soket işgal süresi devrede.'}
          </h1>
        </div>
        <p className="text-[#A1A1A6] text-xs sm:text-sm">
          {stationName} · {carModel} · {stationAddress}
        </p>
      </div>

      {/* 3. Ana İki Kolonlu Izgara */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SOL KOLON: Canlı Telemetri & Batarya Göstergesi (7 Kolon) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
            
            {/* Üst Durum Rozeti */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A1A1A6] font-medium tracking-wide">
                Canlı şarj verisi
              </span>

              {status === 'idle' && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#141416] border border-[#2C2C2E] text-[#A1A1A6]">
                  <span className="w-2 h-2 rounded-full bg-[#A1A1A6]"></span>
                  <span>Bağlantı hazır</span>
                </span>
              )}

              {status === 'charging' && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#30C27C]/10 border border-[#30C27C]/30 text-[#30C27C]">
                  <span className="w-2 h-2 rounded-full bg-[#30C27C] animate-pulse"></span>
                  <span>Şarj ediliyor ({powerKw} kW)</span>
                </span>
              )}

              {status === 'completed' && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  <span>Tolerans sayacı devrede</span>
                </span>
              )}

              {status === 'idle_fee' && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/15 border border-red-500/40 text-red-400 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>İşgal ücreti aktif (₺2,50/dk)</span>
                </span>
              )}
            </div>

            {/* Dairesel SVG Batarya Göstergesi */}
            <div className="flex flex-col items-center justify-center py-3 sm:py-4">
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 190 190">
                  {/* Arka plan rayı */}
                  <circle
                    cx="95"
                    cy="95"
                    r={radius}
                    stroke="#2C2C2E"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {/* İlerleme çemberi */}
                  <circle
                    cx="95"
                    cy="95"
                    r={radius}
                    stroke={
                      status === 'idle_fee' 
                        ? '#EF4444' 
                        : status === 'completed' 
                        ? '#F59E0B' 
                        : '#30C27C'
                    }
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* Çember İçi Metin */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-5xl sm:text-6xl font-bold tracking-tight text-[#F5F5F7] tabular-nums">
                    %{Math.round(soc)}
                  </span>
                  <span className="text-xs text-[#A1A1A6] mt-1 font-medium">
                    {status === 'idle' && 'Soket takılı'}
                    {status === 'charging' && `${powerKw} kW AC akıyor`}
                    {status === 'completed' && `Tolerans: 00:0${toleranceCountdown}`}
                    {status === 'idle_fee' && 'Soketi boşaltın'}
                  </span>
                </div>
              </div>

              {/* Lineer İlerleme Aralığı */}
              <div className="w-full max-w-xs mt-3 space-y-1">
                <div className="w-full bg-[#141416] border border-[#2C2C2E] rounded-full h-2 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      status === 'idle_fee' 
                        ? 'bg-red-500' 
                        : status === 'completed' 
                        ? 'bg-amber-400' 
                        : 'bg-[#30C27C]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, soc))}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-[#A1A1A6]">
                  <span>%20 başlangıç</span>
                  <span>%80 hedef</span>
                </div>
              </div>
            </div>

            {/* 4 Canlı Metrik Kutusu */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {/* Voltaj */}
              <div className="bg-[#141416] border border-[#2C2C2E] rounded-2xl p-3.5 space-y-1">
                <span className="text-[11px] text-[#A1A1A6] block">Voltaj</span>
                <span className="text-base sm:text-lg font-semibold text-[#F5F5F7] tabular-nums block">
                  {Number(voltage).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} V
                </span>
                <span className="text-[10px] text-[#A1A1A6] block">Şebeke gerilimi</span>
              </div>

              {/* Akım */}
              <div className="bg-[#141416] border border-[#2C2C2E] rounded-2xl p-3.5 space-y-1">
                <span className="text-[11px] text-[#A1A1A6] block">Akım</span>
                <span className="text-base sm:text-lg font-semibold text-[#F5F5F7] tabular-nums block">
                  {Number(currentA).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} A
                </span>
                <span className="text-[10px] text-[#A1A1A6] block">Trifaze yük</span>
              </div>

              {/* Anlık Güç */}
              <div className="bg-[#141416] border border-[#2C2C2E] rounded-2xl p-3.5 space-y-1">
                <span className="text-[11px] text-[#A1A1A6] block">Anlık güç</span>
                <span className="text-base sm:text-lg font-semibold text-[#F5F5F7] tabular-nums block">
                  {Number(powerKw).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kW
                </span>
                <span className="text-[10px] text-[#30C27C] block">TOGG AC sınırı</span>
              </div>

              {/* Aktarılan Enerji */}
              <div className="bg-[#141416] border border-[#2C2C2E] rounded-2xl p-3.5 space-y-1">
                <span className="text-[11px] text-[#A1A1A6] block">Aktarılan enerji</span>
                <span className="text-base sm:text-lg font-semibold text-[#F5F5F7] tabular-nums block">
                  {Number(energyKwh).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh
                </span>
                <span className="text-[10px] text-[#A1A1A6] block">Sayaç artışı</span>
              </div>
            </div>

            {/* Fatura & Ücret Dökümü */}
            <div className="p-4 rounded-2xl bg-[#141416] border border-[#2C2C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs text-[#A1A1A6]">Fatura dökümü (Baz: ₺{Number(baseRatePerKwh).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kWh)</span>
                <div className="flex items-center space-x-3 text-xs text-[#F5F5F7]">
                  <span>Enerji: ₺{Number(energyCost).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  {idleFee > 0 && (
                    <span className="text-red-400 font-semibold">
                      · İşgal cezası: ₺{Number(idleFee).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right sm:text-right">
                <span className="text-[11px] text-[#A1A1A6] block">Toplam tutar</span>
                <span className="text-xl font-bold text-[#F5F5F7] tabular-nums">
                  ₺{Number(totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Tolerans Uyarısı (Şarj tamamlandığında) */}
            {status === 'completed' && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-300 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  <span className="text-xs font-semibold text-amber-200">
                    Soketi boşaltmak için tolerans süresi: 00:0{toleranceCountdown} sn
                  </span>
                </div>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  Şarj %80 doluluğa ulaştı. Süre bittiğinde istasyon işgali için dakika başına ₺2,50 ceza ücreti işletilecektir.
                </p>
              </div>
            )}

            {/* İşgal Cezası Uyarısı (Tolerans dolduğunda) */}
            {status === 'idle_fee' && (
              <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/50 text-red-200 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-xs font-semibold text-red-100">
                    İşgal ücreti devrede: Dakika başına ₺2,50 ceza yansıtılıyor
                  </span>
                </div>
                <p className="text-[11px] text-red-300/90 leading-relaxed">
                  İstasyon tolerans süresi aşıldı. Lütfen aracınızı çekip soketi boşaltınız. Biriken ceza: ₺{idleFee.toFixed(2).replace('.', ',')}
                </p>
              </div>
            )}

            {/* Eylem Butonları */}
            <div className="space-y-3 pt-2">
              {status === 'idle' && (
                <button
                  type="button"
                  onClick={handleStartCharging}
                  className="w-full py-4 rounded-full bg-[#30C27C] hover:bg-[#28a768] text-black font-bold text-sm transition-all shadow-md flex items-center justify-center space-x-2"
                >
                  <span>⚡ Şarjı başlat</span>
                </button>
              )}

              {status === 'charging' && (
                <button
                  type="button"
                  onClick={() => {
                    setStatus('completed');
                    addSystemLog('⚡ Sistem: Sürücü şarjı manuel olarak durdurdu.', 'system');
                  }}
                  className="w-full py-3.5 rounded-full bg-[#1C1C1E] border border-[#3A3A3C] hover:border-[#555558] text-[#F5F5F7] font-semibold text-sm transition-all"
                >
                  Şarjı durdur
                </button>
              )}

              {(status === 'completed' || status === 'idle_fee') && (
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(true)}
                  className="w-full py-4 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-bold text-sm transition-all shadow-md"
                >
                  Soketi boşalttım & Seansı sonlandır
                </button>
              )}
            </div>

          </div>
        </div>

        {/* SAĞ KOLON: Ev Sahibi Kartı & Akıllı P2P Chat (5 Kolon) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Ev Sahibi Özet Kartı */}
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-full bg-[#2C2C2E] border border-[#3A3A3C] flex items-center justify-center font-bold text-sm text-[#F5F5F7]">
                {derivedAvatar}
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-semibold text-sm text-[#F5F5F7]">{hostName}</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#30C27C]/15 text-[#30C27C] font-medium">
                    Süper ev sahibi
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1A6] mt-0.5">
                  Çevrim içi · Genellikle 4 dk içinde yanıt verir
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-[#F5F5F7]">★ 4,95</span>
              <span className="text-[10px] text-[#A1A1A6] block">{totalHostSessions || 191} seans</span>
            </div>
          </div>

          {/* Akıllı P2P Sohbet Kartı */}
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl p-5 flex flex-col h-[520px] justify-between relative">
            
            {/* Sohbet Üst Başlığı */}
            <div className="pb-3 border-b border-[#2C2C2E] flex items-center justify-between">
              <span className="text-xs font-medium text-[#F5F5F7] flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#30C27C]"></span>
                <span>Ev sahibi ile mesajlaşma</span>
              </span>
              <span className="text-[10px] text-[#A1A1A6]">Korumalı hat</span>
            </div>

            {/* Güvenlik Filtresi Uyarısı (Regex tetiklendiğinde) */}
            {safetyWarning && (
              <div className="my-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start space-x-2">
                <span className="font-bold">⚠️</span>
                <span>{safetyWarning}</span>
              </div>
            )}

            {/* Mesaj Akışı Alanı */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs select-text">
              {messages.map((msg) => {
                // Sistem Bildirim Baloncuğu
                if (msg.sender === 'system') {
                  return (
                    <div key={msg.id} className="flex justify-center my-1.5">
                      <div className={`px-3 py-1.5 rounded-xl text-[11px] leading-snug text-center max-w-[90%] border ${
                        msg.type === 'warning'
                          ? 'bg-red-500/10 border-red-500/30 text-red-300'
                          : 'bg-[#141416] border-[#2C2C2E] text-[#A1A1A6]'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                // Sürücü Mesajı (Sağda)
                if (msg.sender === 'driver') {
                  return (
                    <div key={msg.id} className="flex flex-col items-end space-y-1">
                      <div className="bg-[#30C27C] text-black font-medium p-3 rounded-2xl rounded-tr-none max-w-[82%] shadow-sm">
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[10px] text-[#A1A1A6]">
                        {msg.masked && (
                          <span className="text-amber-400 font-semibold">[Gizlilik koruması aktif]</span>
                        )}
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>
                  );
                }

                // Ev Sahibi Mesajı (Solda)
                return (
                  <div key={msg.id} className="flex flex-col items-start space-y-1">
                    <div className="bg-[#2C2C2E] text-[#F5F5F7] p-3 rounded-2xl rounded-tl-none max-w-[82%] border border-[#3A3A3C]/40">
                      <p className="leading-relaxed">{msg.text}</p>
                    </div>
                    <span className="text-[10px] text-[#A1A1A6] px-1">{msg.timestamp}</span>
                  </div>
                );
              })}

              {/* Yazıyor İndikatörü */}
              {isHostTyping && (
                <div className="flex items-center space-x-2 text-[11px] text-[#A1A1A6] italic py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#A1A1A6] animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#A1A1A6] animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#A1A1A6] animate-bounce [animation-delay:0.4s]"></div>
                  <span>{hostName} yazıyor...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Alt Kısım: Şablon Butonlar & Mesaj Yazma */}
            <div className="pt-2 border-t border-[#2C2C2E] space-y-2.5">
              
              {/* Şablon Hızlı Yanıtlar (Canned Quick Replies) */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSendMessage('Bariyerdeyim / Kapıdayım')}
                  className="px-2.5 py-1 rounded-full bg-[#141416] border border-[#2C2C2E] text-[#A1A1A6] hover:text-[#F5F5F7] hover:border-[#3A3A3C] transition-all"
                >
                  Bariyerdeyim / Kapıdayım
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('Garaj kapısını açabilir misiniz?')}
                  className="px-2.5 py-1 rounded-full bg-[#141416] border border-[#2C2C2E] text-[#A1A1A6] hover:text-[#F5F5F7] hover:border-[#3A3A3C] transition-all"
                >
                  Garaj kapısını açabilir misiniz?
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('Şarj sorunsuz başladı')}
                  className="px-2.5 py-1 rounded-full bg-[#141416] border border-[#2C2C2E] text-[#A1A1A6] hover:text-[#F5F5F7] hover:border-[#3A3A3C] transition-all"
                >
                  Şarj sorunsuz başladı
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('10 dk rötarlıyım')}
                  className="px-2.5 py-1 rounded-full bg-[#141416] border border-[#2C2C2E] text-[#A1A1A6] hover:text-[#F5F5F7] hover:border-[#3A3A3C] transition-all"
                >
                  10 dk rötarlıyım
                </button>
              </div>

              {/* Mesaj Yazma Alanı */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  placeholder="Ev sahibine bir mesaj yaz..."
                  className="flex-1 bg-[#141416] border border-[#2C2C2E] rounded-full px-4 py-2.5 text-xs text-[#F5F5F7] placeholder-[#555558] focus:outline-none focus:border-[#30C27C] transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="px-4 py-2.5 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all flex items-center justify-center shrink-0"
                >
                  Gönder
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* 4. MODAL: Fatura ve Seans Özeti (Seansı Bitir) */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] border border-[#3A3A3C] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 relative shadow-2xl">
            <button
              onClick={() => setShowSummaryModal(false)}
              className="absolute top-5 right-5 text-[#A1A1A6] hover:text-[#F5F5F7] text-sm p-1 font-bold"
            >
              ✕
            </button>

            <div>
              <span className="text-[11px] text-[#30C27C] font-semibold uppercase tracking-wider block">
                Seans tamamlandı
              </span>
              <h2 className="text-2xl font-bold text-[#F5F5F7] mt-1">
                Fatura ve seans özeti
              </h2>
              <p className="text-xs text-[#A1A1A6] mt-0.5">
                {stationName} · {carModel}
              </p>
            </div>

            {/* Kalemler */}
            <div className="space-y-3 py-2 border-y border-[#2C2C2E] text-xs">
              <div className="flex justify-between text-[#A1A1A6]">
                <span>Batarya artışı</span>
                <span className="text-[#F5F5F7] font-medium">%20 → %{Math.round(soc)}</span>
              </div>
              <div className="flex justify-between text-[#A1A1A6]">
                <span>Aktarılan enerji</span>
                <span className="text-[#F5F5F7] font-medium">{Number(energyKwh).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh</span>
              </div>
              <div className="flex justify-between text-[#A1A1A6]">
                <span>Birim fiyat</span>
                <span className="text-[#F5F5F7] font-medium">₺{Number(baseRatePerKwh).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kWh</span>
              </div>
              <div className="flex justify-between text-[#A1A1A6]">
                <span>Enerji tutarı</span>
                <span className="text-[#F5F5F7] font-medium">₺{Number(energyCost).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {idleFee > 0 && (
                <div className="flex justify-between text-red-400 font-semibold">
                  <span>İşgal cezası (₺2,50/dk)</span>
                  <span>₺{Number(idleFee).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-[#F5F5F7] pt-2 border-t border-[#2C2C2E]/60">
                <span>Toplam tahsilat</span>
                <span className="text-[#30C27C]">₺{Number(totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#141416] border border-[#2C2C2E] text-[11px] text-[#A1A1A6] space-y-1">
              <div className="flex items-center justify-between text-[#F5F5F7] font-medium">
                <span>Ödeme yöntemi</span>
                <span>Kayıtlı kart (••4819)</span>
              </div>
              <p>Tutar kartınızdan otomatik tahsil edilmiştir. Ev sahibine onay bildirimi gönderildi.</p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleFinalizeSession}
                className="w-full py-4 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-bold text-xs transition-all shadow-md"
              >
                Onayla ve Keşfet'e dön
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// --- 5.1 ŞARJ SEANSI — SÜRÜCÜ BİLEŞENİ (/seans) ---
const DriverChargingSessionView = ({
  activeSession,
  driverStats,
  onBack,
  onFinishSession
}) => {
  // Sürücü kademesini tek merkezden oku
  const driverTier = getDriverTier(driverStats?.completedCharges ?? 18);

  // Canlı simülasyon state'leri (Devir notlarındaki varsayılan değerlerle başlar)
  const [batteryPct, setBatteryPct] = React.useState(58);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(91 * 60); // 91 dakika
  const [energyKwh, setEnergyKwh] = React.useState(33.6);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = React.useState(false);
  const [isEmergencyConfirmed, setIsEmergencyConfirmed] = React.useState(false);
  const [emergencyLogs, setEmergencyLogs] = React.useState([]);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = React.useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = React.useState(false);
  const [messageText, setMessageText] = React.useState('');
  const [messageSentToast, setMessageSentToast] = React.useState(false);
  const [showDirectionsModal, setShowDirectionsModal] = React.useState(false);

  // Seans bildirimleri: En fazla 3 tür (bitmesine 10 dk, bitti, işgal ücreti başladı)
  const [toasts, setToasts] = React.useState([]);

  // Fiyat: Sabit ₺5,10 / kWh (veya istasyonun kilitli gece tarifesi)
  const fixedRatePerKwh = 5.10;
  const currentCost = energyKwh * fixedRatePerKwh;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  // Bildirim tetikleme (kapatılabilir küçük toastlar, en fazla 3 tür)
  const triggerNotification = (type) => {
    let title = '';
    let message = '';
    let icon = 'clock';

    if (type === 'ten_min') {
      title = 'Şarj Bildirimi';
      message = 'Şarj bitimine 10 dakika kaldı.';
      icon = 'clock';
    } else if (type === 'finished') {
      title = 'Şarj Tamamlandı';
      message = 'Şarj tamamlandı. Lütfen aracınızı çekin.';
      icon = 'check-circle';
    } else if (type === 'idle_fee') {
      title = 'İşgal Toleransı';
      message = driverTier.freeIdleMinutes > 0
        ? `Ücretsiz ${driverTier.freeIdleText} işgal süreniz doldu, işgal ücreti başladı.`
        : 'Ücretsiz tolerans süreniz bulunmamaktadır, işgal ücreti başladı.';
      icon = 'alert-triangle';
    }

    setToasts((prev) => {
      const filtered = prev.filter(t => t.type !== type);
      return [...filtered.slice(-2), { id: `${type}-${Date.now()}`, type, title, message, icon }];
    });
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter(t => t.id !== id));
  };

  // Simülasyon döngüsü (her 1.5 saniyede hafif ilerleme)
  React.useEffect(() => {
    if (isPaused || isEmergencyConfirmed || isCompletedModalOpen) return;

    const timer = setInterval(() => {
      setBatteryPct((prev) => {
        if (prev >= 80) return 80;
        return Number((prev + 0.15).toFixed(1));
      });
      setElapsedSeconds((prev) => prev + 2);
      setEnergyKwh((prev) => Number((prev + 0.04).toFixed(2)));
    }, 1500);

    return () => clearInterval(timer);
  }, [isPaused, isEmergencyConfirmed, isCompletedModalOpen]);

  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [
    batteryPct,
    isEmergencyModalOpen,
    isEmergencyConfirmed,
    isCompletedModalOpen,
    isMessageModalOpen,
    showDirectionsModal,
    messageSentToast,
    toasts
  ]);

  const handleTriggerEmergency = () => {
    setIsEmergencyConfirmed(true);
    setIsPaused(true);
    const newLog = {
      id: `EMG-${Date.now()}`,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      frozenCost: currentCost,
      frozenKwh: energyKwh
    };
    setEmergencyLogs((prev) => [newLog, ...prev]);
    setIsEmergencyModalOpen(false);
  };

  const stationName = activeSession?.name || 'Moda, müstakil garaj';
  const carModel = activeSession?.carModel || 'TOGG T10X';
  const approxOrExact = activeSession?.exactAddress || 'Örnek Sk. No:1, Garaj kodu: #0000, Kadıköy / İstanbul';

  // Süre hesabı (TOGG T10X %20→%80 = 53,1 kWh, 11 kW kabul gücü: 53,1 / 11 × 1,1 ≈ 319 dk)
  const driverCalc = calculateChargingSession(activeSession?.powerKw || 22, 11, 53.1);
  const sessionTotalMinutes = driverCalc.durationMinutes;
  const sessionEffectiveKw = driverCalc.effectiveKw;
  const sessionLimitNote = driverCalc.limitNote;

  return (
    <div className="pt-2 pb-16 w-full space-y-8 relative">
      {/* Kayan Seans Bildirimleri (Toastlar - En fazla 3 tür, kapatılabilir) */}
      <div className="fixed top-20 right-4 sm:right-8 z-[1200] max-w-sm w-full space-y-2.5 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-[#1C1C1E] border border-[#3A3A3C] text-[#F5F5F7] p-3.5 rounded-2xl shadow-2xl flex items-start justify-between space-x-3 transition-all"
          >
            <div className="flex items-start space-x-2.5">
              <i data-lucide={toast.icon} className={`w-4 h-4 mt-0.5 ${toast.type === 'idle_fee' ? 'text-amber-400' : 'text-[#30C27C]'}`}></i>
              <div>
                <p className="text-xs font-semibold text-[#F5F5F7]">{toast.title}</p>
                <p className="text-[11px] text-[#A1A1A6] mt-0.5 leading-snug">{toast.message}</p>
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#A1A1A6] hover:text-[#F5F5F7] text-xs font-bold p-1 transition-colors"
              title="Kapat"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* 1. Geri Bağlantı */}
      <div className="pt-4 pb-2">
        <button
          onClick={onBack}
          className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors flex items-center space-x-1.5 font-normal cursor-pointer"
        >
          <span>← Rezervasyonlarım</span>
        </button>
      </div>

      {/* 2. Başlık ve Alt Satır */}
      <div className="space-y-1">
        <h1 className="hero-title text-4xl sm:text-5xl font-bold tracking-tight text-[#F5F5F7]">
          {isEmergencyConfirmed ? 'Şarj durduruldu.' : 'Şarj sürüyor.'}
        </h1>
        <p className="text-[#A1A1A6] text-xs sm:text-sm">
          {stationName} · {carModel}
        </p>
      </div>

      {/* 3. 4 Adımlı İlerleme (Stepper) */}
      <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-5 sm:p-6">
        <div className="grid grid-cols-4 relative items-center">
          {/* Bağlantı Çizgisi */}
          <div className="absolute left-[12%] right-[12%] top-3.5 h-[2px] bg-[#2C2C2E] -z-0">
            <div className="h-full bg-[#30C27C] w-[66%] transition-all duration-500"></div>
          </div>

          {/* Adım 1: Yoldayım (Tamamlandı) */}
          <div className="flex flex-col items-center text-center relative z-10 space-y-2">
            <div className="w-7 h-7 rounded-full bg-[#30C27C] text-black flex items-center justify-center font-bold text-xs shadow-sm">
              <i data-lucide="check" className="w-4 h-4 text-black stroke-[3]"></i>
            </div>
            <span className="text-xs text-[#A1A1A6] font-medium">Yoldayım</span>
          </div>

          {/* Adım 2: Vardım (Tamamlandı) */}
          <div className="flex flex-col items-center text-center relative z-10 space-y-2">
            <div className="w-7 h-7 rounded-full bg-[#30C27C] text-black flex items-center justify-center font-bold text-xs shadow-sm">
              <i data-lucide="check" className="w-4 h-4 text-black stroke-[3]"></i>
            </div>
            <span className="text-xs text-[#A1A1A6] font-medium">Vardım</span>
          </div>

          {/* Adım 3: Şarj (Mevcut / Kalın) */}
          <div className="flex flex-col items-center text-center relative z-10 space-y-2">
            <div className="w-7 h-7 rounded-full bg-[#F5F5F7] text-black border-2 border-[#30C27C] flex items-center justify-center font-bold text-xs shadow-md">
              <span className="w-2.5 h-2.5 rounded-full bg-[#30C27C] animate-pulse"></span>
            </div>
            <span className="text-xs text-[#F5F5F7] font-semibold">Şarj</span>
          </div>

          {/* Adım 4: Bitti (Gelecek / Soluk) */}
          <div className="flex flex-col items-center text-center relative z-10 space-y-2">
            <div className="w-7 h-7 rounded-full bg-[#141416] border border-[#2C2C2E] text-[#555558] flex items-center justify-center text-xs">
              4
            </div>
            <span className="text-xs text-[#555558] font-normal">Bitti</span>
          </div>
        </div>
      </div>

      {/* Dondurulmuş Seans Bilgisi (Acil durum varsa) */}
      {isEmergencyConfirmed && (
        <div className="bg-[#1C1C1E] border border-amber-900/60 rounded-2xl p-4 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3 text-amber-400">
            <i data-lucide="alert-triangle" className="w-5 h-5 flex-shrink-0"></i>
            <div>
              <p className="font-semibold text-[#F5F5F7]">Acil durdurma devrede — Sayaç ve tutar donduruldu.</p>
              <p className="text-[11px] text-[#A1A1A6]">Kayıt güvenliğe işlendi. Kablo kilidini aracınızdan serbest bırakabilirsiniz.</p>
            </div>
          </div>
          <button
            onClick={() => setIsCompletedModalOpen(true)}
            className="px-4 py-2 rounded-full bg-[#F5F5F7] text-black font-semibold text-xs hover:bg-white"
          >
            Özeti Gör
          </button>
        </div>
      )}

      {/* 4. İki Kolonlu Ana Kart Düzeni */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* SOL ANA KART: Batarya & Metrikler (7 Kolon) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl p-6 sm:p-8 space-y-6">
            {/* Üst Başlık & Durum */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A1A1A6] font-medium tracking-wide">Batarya</span>
              <span className="flex items-center space-x-1.5 text-xs text-[#30C27C]">
                <span className="w-2 h-2 rounded-full bg-[#30C27C] animate-pulse"></span>
                <span>{isEmergencyConfirmed ? 'Donduruldu' : `Şarj ediliyor (${sessionEffectiveKw} kW)`}</span>
              </span>
            </div>

            {/* Büyük Batarya Yüzdesi (96px) */}
            <div className="py-1">
              <div className="text-7xl sm:text-[96px] font-bold text-[#F5F5F7] tracking-tight leading-none tabular-nums flex items-baseline">
                %{Math.round(batteryPct)}
              </div>
            </div>

            {/* İlerleme Çubuğu (%20 başlangıç → %80 hedef) */}
            <div className="space-y-2">
              <div className="w-full bg-[#141416] border border-[#2C2C2E] rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="bg-[#30C27C] h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, batteryPct))}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-[#A1A1A6]">
                <span>%20 başlangıç</span>
                <span className="text-[#F5F5F7] font-medium tabular-nums">%{Math.round(batteryPct)} şu an</span>
                <span>%80 hedef</span>
              </div>
            </div>

            {/* 3 Metrik (Geçen süre, Enerji, Şimdiki tutar) */}
            <div className="grid grid-cols-3 gap-4 pt-5 border-t border-[#2C2C2E]">
              <div>
                <span className="text-[11px] text-[#A1A1A6] block">Geçen süre</span>
                <span className="text-base sm:text-lg font-semibold text-[#F5F5F7] tabular-nums mt-0.5 block">
                  {elapsedMinutes} dk
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#A1A1A6] block">Enerji (tahmini)</span>
                <span className="text-base sm:text-lg font-semibold text-[#F5F5F7] tabular-nums mt-0.5 block">
                  {energyKwh.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#A1A1A6] block">Şimdiki tutar</span>
                <span className="text-base sm:text-lg font-semibold text-[#F5F5F7] tabular-nums mt-0.5 block">
                  ₺{currentCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Kural 2: 22 kW istasyon + 11 kW araç limit notu */}
            {sessionLimitNote && (
              <div className="p-3 rounded-2xl bg-[#141416] border border-[#2C2C2E] text-xs text-[#A1A1A6] flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C] shrink-0"></span>
                <span>{sessionLimitNote}</span>
              </div>
            )}

            {/* Bilgilendirme Notu */}
            <div className="pt-4 border-t border-[#2C2C2E]/60 text-xs text-[#A1A1A6] leading-relaxed">
              Tahmini bitiş süresi toplam {sessionTotalMinutes} dk. Enerji ve tutar, araç bataryası ve cihaz gücünden hesaplanan tahmindir. Fiyat ₺5,10 / kWh ve rezervasyon boyunca sabit.
            </div>

            {/* Bildirim Test Kısayolları (Demo Deneyimi) */}
            <div className="pt-2 border-t border-[#2C2C2E]/40 flex items-center justify-between text-[10px] text-[#A1A1A6]">
              <span>Bildirim simülasyonu:</span>
              <div className="flex space-x-1.5">
                <button
                  type="button"
                  onClick={() => triggerNotification('ten_min')}
                  className="px-2 py-0.5 rounded bg-[#141416] hover:bg-[#202023] border border-[#2C2C2E] hover:border-[#3A3A3C] transition-all"
                >
                  10 dk kala
                </button>
                <button
                  type="button"
                  onClick={() => triggerNotification('finished')}
                  className="px-2 py-0.5 rounded bg-[#141416] hover:bg-[#202023] border border-[#2C2C2E] hover:border-[#3A3A3C] transition-all"
                >
                  Bitti
                </button>
                <button
                  type="button"
                  onClick={() => triggerNotification('idle_fee')}
                  className="px-2 py-0.5 rounded bg-[#141416] hover:bg-[#202023] border border-[#2C2C2E] hover:border-[#3A3A3C] transition-all"
                >
                  İşgal başladı
                </button>
              </div>
            </div>
          </div>

          {/* Eylem Butonları */}
          <div className="space-y-3 pt-1">
            <button
              onClick={() => setIsCompletedModalOpen(true)}
              className="w-full py-4 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-sm transition-all shadow-sm"
            >
              Şarjı bitir
            </button>

            <button
              onClick={() => setIsEmergencyModalOpen(true)}
              disabled={isEmergencyConfirmed}
              className={`w-full py-3.5 rounded-full bg-[#1C1C1E] border border-[#3A3A3C] hover:border-[#555558] text-[#F5F5F7] font-medium text-sm transition-all ${
                isEmergencyConfirmed ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              Acil destek
            </button>

            <p className="text-[11px] text-[#A1A1A6] text-center leading-normal">
              Acil destek şarjı durdurur ve tutarı dondurur. Basmadan önce onayını isteriz.
            </p>
          </div>
        </div>

        {/* SAĞ KARTLAR (5 Kolon) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Ev Sahibi Kartı */}
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl p-6 space-y-4">
            <span className="text-[11px] text-[#A1A1A6] uppercase tracking-wider font-medium block">
              Ev sahibi
            </span>

            <div>
              <h3 className="font-semibold text-base text-[#F5F5F7]">
                {stationName}
              </h3>
              <p className="text-xs text-[#A1A1A6] mt-0.5">
                Bağımsız garaj · Kablo garaj girişinde
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setIsMessageModalOpen(true)}
                className="py-2.5 px-3 rounded-full bg-[#000000] border border-[#2C2C2E] hover:border-[#3A3A3C] text-xs text-[#F5F5F7] font-medium transition-all flex items-center justify-center space-x-1.5"
              >
                <i data-lucide="message-square" className="w-3.5 h-3.5 text-[#A1A1A6]"></i>
                <span>Mesaj gönder</span>
              </button>

              <button
                onClick={() => setShowDirectionsModal(true)}
                className="py-2.5 px-3 rounded-full bg-[#000000] border border-[#2C2C2E] hover:border-[#3A3A3C] text-xs text-[#F5F5F7] font-medium transition-all flex items-center justify-center space-x-1.5"
              >
                <i data-lucide="navigation" className="w-3.5 h-3.5 text-[#A1A1A6]"></i>
                <span>Yol tarifi</span>
              </button>
            </div>
          </div>

          {/* Bitiş Hatırlatması Kartı (Dinamik Sürücü Kademesinden Okunur) */}
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl p-6 space-y-2.5">
            <div className="flex items-center space-x-2">
              <i data-lucide="clock" className="w-4 h-4 text-[#A1A1A6]"></i>
              <h3 className="font-semibold text-sm text-[#F5F5F7]">
                Bitiş hatırlatması
              </h3>
            </div>
            <p className="text-xs text-[#A1A1A6] leading-relaxed">
              Şarj bitmeden 10 dakika önce bildirim alırsın. Bitişten 15 dakika sonra işgal ücreti başlar; {driverTier.name} üyeliğinle {driverTier.freeIdleMinutes > 0 ? `${driverTier.freeIdleText} ücretsiz` : 'ücretsiz işgal süresi bulunmaz'}. {driverTier.cashbackPercent > 0 && `Bu seans tamamlandığında %${driverTier.cashbackPercent} Para Puan iadesi hesabına eklenecektir.`}
            </p>
          </div>
        </div>
      </div>

      {/* MODAL: Acil Destek & Onay */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] p-6 max-w-md w-full space-y-5 border border-[#3A3A3C] rounded-2xl relative shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-[#141416] border border-[#2C2C2E] flex items-center justify-center text-amber-400">
              <i data-lucide="alert-triangle" className="w-5 h-5"></i>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#F5F5F7]">Şarjı durdurmak istediğine emin misin?</h3>
              <p className="text-xs text-[#A1A1A6] mt-1 leading-relaxed">
                Acil destek şarjı anında durdurur ve tutarı dondurur. Tekrarlayan haksız kullanımlar sistem tarafından kayıt altına alınabilir.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141416] border border-[#2C2C2E] text-xs space-y-1.5">
              <div className="flex justify-between text-[#A1A1A6]">
                <span>Dondurulacak tutar:</span>
                <span className="text-[#F5F5F7] font-semibold tabular-nums">₺{currentCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[#A1A1A6]">
                <span>Tüketilen enerji:</span>
                <span className="text-[#F5F5F7] font-semibold tabular-nums">{energyKwh.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleTriggerEmergency}
                className="w-full py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all shadow-sm"
              >
                Evet, şarjı durdur ve dondur
              </button>
              <button
                onClick={() => setIsEmergencyModalOpen(false)}
                className="w-full py-3 rounded-full bg-[#141416] hover:bg-[#202023] border border-[#2C2C2E] text-[#A1A1A6] hover:text-white font-medium text-xs transition-all"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Şarjı Bitir Özeti */}
      {isCompletedModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] p-7 max-w-md w-full space-y-6 border border-[#3A3A3C] rounded-2xl text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-[#141416] border border-[#2C2C2E] flex items-center justify-center mx-auto text-[#30C27C]">
              <i data-lucide="check" className="w-6 h-6"></i>
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#F5F5F7]">Şarj tamamlandı.</h3>
              <p className="text-xs text-[#A1A1A6] mt-1">{stationName} · {carModel}</p>
            </div>

            <div className="bg-[#141416] p-4 rounded-2xl border border-[#2C2C2E] text-xs space-y-2.5 text-left">
              <div className="flex justify-between text-[#A1A1A6]">
                <span>Toplam süre</span>
                <span className="text-[#F5F5F7] font-semibold tabular-nums">{elapsedMinutes} dk</span>
              </div>
              <div className="flex justify-between text-[#A1A1A6]">
                <span>Tüketilen enerji</span>
                <span className="text-[#F5F5F7] font-semibold tabular-nums">{energyKwh.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh</span>
              </div>
              <div className="flex justify-between text-[#A1A1A6]">
                <span>Birim fiyat (sabit)</span>
                <span className="text-[#F5F5F7] font-semibold tabular-nums">₺5,10 / kWh</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#2C2C2E] text-[#A1A1A6]">
                <span className="text-[#F5F5F7] font-medium">Toplam tutar</span>
                <span className="text-base font-bold text-[#30C27C] tabular-nums">₺{currentCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setIsCompletedModalOpen(false);
                  onFinishSession({
                    durationMinutes: elapsedMinutes,
                    energyKwh: Number(energyKwh.toFixed(1)),
                    unitPrice: fixedRatePerKwh,
                    subtotal: Number(currentCost.toFixed(2)),
                    endReason: isEmergencyConfirmed ? 'emergency_stop' : 'normal',
                    stationId: activeSession?.id || 'st-01',
                    stationName: stationName,
                    carModel: carModel
                  }, false);
                }}
                className="w-full py-3.5 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all shadow-sm"
              >
                Tamam ve Keşfet'e dön
              </button>

              <button
                onClick={() => {
                  setIsCompletedModalOpen(false);
                  onFinishSession({
                    durationMinutes: elapsedMinutes,
                    energyKwh: Number(energyKwh.toFixed(1)),
                    unitPrice: fixedRatePerKwh,
                    subtotal: Number(currentCost.toFixed(2)),
                    endReason: isEmergencyConfirmed ? 'emergency_stop' : 'normal',
                    stationId: activeSession?.id || 'st-01',
                    stationName: stationName,
                    carModel: carModel
                  }, true);
                }}
                className="w-full py-3 rounded-full bg-[#1C1C1E] border border-[#3A3A3C] hover:border-[#555558] text-[#F5F5F7] font-medium text-xs transition-all"
              >
                Ev Sahibi Seans Özetini İncele (Demo)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ev Sahibine Mesaj Gönder */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] p-6 max-w-md w-full space-y-4 border border-[#3A3A3C] rounded-2xl relative">
            <button
              onClick={() => setIsMessageModalOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1A6] hover:text-white font-bold text-sm"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-[#F5F5F7]">Ev sahibine mesaj gönder</h3>
            <p className="text-xs text-[#A1A1A6]">{stationName} ev sahibine doğrudan iletilir.</p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setMessageText('10 dakikaya şarjım bitiyor, kabloyu topluyorum.')}
                className="w-full text-left p-2.5 rounded-xl bg-[#141416] border border-[#2C2C2E] hover:border-[#3A3A3C] text-xs text-[#A1A1A6] hover:text-[#F5F5F7] transition-all"
              >
                "10 dakikaya şarjım bitiyor, kabloyu topluyorum."
              </button>
              <button
                onClick={() => setMessageText('Garaj kapısı kilitli, açabilir misiniz?')}
                className="w-full text-left p-2.5 rounded-xl bg-[#141416] border border-[#2C2C2E] hover:border-[#3A3A3C] text-xs text-[#A1A1A6] hover:text-[#F5F5F7] transition-all"
              >
                "Garaj kapısı kilitli, açabilir misiniz?"
              </button>
            </div>

            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Mesajınızı yazın..."
              rows={3}
              className="w-full p-3 rounded-xl bg-[#000000] border border-[#2C2C2E] text-xs text-[#F5F5F7] focus:outline-none focus:border-[#30C27C] resize-none"
            ></textarea>

            <button
              onClick={() => {
                setIsMessageModalOpen(false);
                setMessageSentToast(true);
                setTimeout(() => setMessageSentToast(false), 3000);
              }}
              className="w-full py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all"
            >
              Gönder
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Yol Tarifi & Adres */}
      {showDirectionsModal && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] p-6 max-w-md w-full space-y-4 border border-[#3A3A3C] rounded-2xl relative">
            <button
              onClick={() => setShowDirectionsModal(false)}
              className="absolute top-4 right-4 text-[#A1A1A6] hover:text-white font-bold text-sm"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-[#F5F5F7]">İstasyon adresi ve yol tarifi</h3>
            <div className="p-4 rounded-xl bg-[#141416] border border-[#2C2C2E] space-y-2">
              <span className="text-[11px] text-[#30C27C] font-medium block">Rezervasyonla Onaylanan Kesin Adres</span>
              <p className="text-xs font-semibold text-[#F5F5F7]">{approxOrExact}</p>
              <p className="text-[11px] text-[#A1A1A6]">Kablo garaj girişinde duvara montedir. Giriş şifresi: #8942</p>
            </div>
            <button
              onClick={() => {
                setShowDirectionsModal(false);
                window.open(`https://maps.google.com/?q=${encodeURIComponent(approxOrExact)}`, '_blank');
              }}
              className="w-full py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all flex items-center justify-center space-x-1.5"
            >
              <i data-lucide="navigation" className="w-3.5 h-3.5"></i>
              <span>Haritada Aç</span>
            </button>
          </div>
        </div>
      )}

      {/* Toast Bildirimi */}
      {messageSentToast && (
        <div className="fixed bottom-6 right-6 z-[1100] bg-[#1C1C1E] border border-[#30C27C] text-[#F5F5F7] px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs">
          <i data-lucide="check" className="w-4 h-4 text-[#30C27C]"></i>
          <span>Ev sahibine mesaj iletildi.</span>
        </div>
      )}
    </div>
  );
};

// --- REZERVASYONLAR VE SEANSLAR TEK MERKEZLİ MOCK VERİ MODELİ ---
const createRelativeReservations = (now = new Date()) => {
  const formatHourMin = (d) => d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const formatDateTR = (d) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  // 1. ses-101: Bekleyen seans
  // Resmi TOGG T10X Long Range batarya kapasitesi 88.5 kWh (%20 -> %80 = 53.1 kWh)
  // Süre: 53,1 / 11 × 1,1 ≈ 319 dk (5 sa 19 dk)
  const ses101Calc = calculateChargingSession(22, 11, 53.1);
  const session101Minutes = ses101Calc.durationMinutes; // 319 dk

  // Gün hesabı: bitiş = 02:24'ün, şimdiden en az 6 saat önce kalan en son tekrarı
  const sixHoursAgo = new Date(now.getTime() - 6 * 3600 * 1000);
  let session101End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 2, 24, 0, 0);
  if (session101End.getTime() > sixHoursAgo.getTime()) {
    session101End.setDate(session101End.getDate() - 1);
  }
  // Başlangıç saati: Bitiş − 319 dk (saat: 21:05)
  const session101Start = new Date(session101End.getTime() - session101Minutes * 60 * 1000);

  // Gün ve ay isimleri şimdiye göre dinamik türetilir (sabit "15 Ekim" / "16 Ekim" kalmaz)
  const endDay = session101End.getDate();
  const endMonth = session101End.toLocaleDateString('tr-TR', { month: 'long' });
  const startDay = session101Start.getDate();
  const startMonth = session101Start.toLocaleDateString('tr-TR', { month: 'long' });
  const dateRangeStr = startMonth === endMonth
    ? (startDay !== endDay ? `${startDay}–${endDay} ${endMonth}` : `${endDay} ${endMonth}`)
    : `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
  const startDateStr = `${startDay} ${startMonth}`;
  const endDateStr = `${endDay} ${endMonth}`;
  const startTimeStr = '21:05';
  const endTimeStr = '02:24';
  const timeRangeStr = `${startTimeStr} – ${endTimeStr}`;
  const displayRange = `${dateRangeStr} · ${timeRangeStr}`;

  // 48 saat otomatik onay kontrolü: kalan süresi = 48 saat − (şimdi − bitiş)
  const autoApprovalDeadline = new Date(session101End.getTime() + 48 * 3600 * 1000);
  const remainingMs = autoApprovalDeadline.getTime() - now.getTime();
  const isAutoApproved = remainingMs <= 0;
  const remHours = Math.max(0, Math.floor(remainingMs / (3600 * 1000)));
  const remMinutes = Math.max(0, Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000)));
  const autoApprovalRemaining = isAutoApproved ? 'Süre doldu (otomatik onaylandı)' : `${remHours} sa ${remMinutes} dk`;

  const subtotal101 = Number((53.1 * 5.10).toFixed(2)); // 270.81
  const comm101 = Number((subtotal101 * 0.10).toFixed(2)); // 27.08
  const net101 = Number((subtotal101 - comm101).toFixed(2)); // 243.73

  const getPastDateStr = (daysAgo) => {
    const d = new Date(now.getTime() - daysAgo * 24 * 3600 * 1000);
    return `${d.getDate()} ${d.toLocaleDateString('tr-TR', { month: 'long' })}`;
  };
  const upDate = new Date(now.getTime() + 2 * 24 * 3600 * 1000);
  const upDateStr = `${upDate.getDate()} ${upDate.toLocaleDateString('tr-TR', { month: 'long' })}`;

  return [
    {
      id: 'ses-101',
      stationId: 'st-01',
      stationName: 'Moda, müstakil garaj',
      carModel: 'TOGG T10X',
      driverName: 'Örnek Sürücü',
      driverTier: getDriverTier(18), // Altın sürücü
      startDate: session101Start,
      endDate: session101End,
      startDateStr,
      endDateStr,
      startTimeStr,
      endTimeStr,
      dateStr: dateRangeStr,
      timeRangeStr,
      displayRange,
      durationMinutes: session101Minutes,
      energyKwh: 53.1,
      unitPrice: 5.10, // Gece tarifesi (6.80 * 0.75)
      tariffLabel: 'gece tarifesi, ×0,75',
      subtotal: subtotal101,
      commissionRate: 0.10, // Süper ev sahibi %10
      commissionAmount: comm101,
      netHostEarnings: net101,
      status: isAutoApproved ? 'approved' : 'pending_approval',
      endReason: 'normal',
      photos: {
        arrival: {
          url: '/public/images/socket-arrival.svg',
          timestamp: '21:05'
        },
        departure: {
          url: '/public/images/socket-departure.svg',
          timestamp: '02:24'
        }
      },
      autoApprovalRemaining,
      autoApprovalDeadline: autoApprovalDeadline.toISOString(),
      disputeReason: null,
      disputeNote: null,
      chargingLimitNote: ses101Calc.limitNote
    },
    {
      id: 'ses-102',
      stationId: 'st-01',
      stationName: 'Moda, müstakil garaj',
      carModel: 'Hyundai Ioniq 5',
      driverName: 'Örnek Sürücü',
      driverTier: getDriverTier(42), // Platin sürücü
      startDateStr: upDateStr,
      endDateStr: upDateStr,
      startTimeStr: '14:00',
      endTimeStr: '16:30',
      dateStr: upDateStr,
      timeRangeStr: '14:00 – 16:30',
      displayRange: `${upDateStr} · 14:00 – 16:30`,
      durationMinutes: 150,
      energyKwh: 55.0,
      unitPrice: 6.80,
      tariffLabel: 'standart tarife',
      subtotal: 374.00,
      commissionRate: 0.10,
      commissionAmount: 37.40,
      netHostEarnings: 336.60,
      status: 'upcoming',
      endReason: null,
      photos: null,
      autoApprovalRemaining: null,
      disputeReason: null,
      disputeNote: null
    },
    {
      id: 'ses-103',
      stationId: 'st-01',
      stationName: 'Moda, müstakil garaj',
      carModel: 'Porsche Taycan',
      driverName: 'Örnek Sürücü',
      driverTier: getDriverTier(8), // Gümüş sürücü
      dateStr: getPastDateStr(3),
      timeRangeStr: '18:15 – 19:55',
      displayRange: `${getPastDateStr(3)} · 18:15 – 19:55`,
      durationMinutes: 100,
      energyKwh: 42.0,
      unitPrice: 8.16,
      tariffLabel: 'yoğun saat, ×1,20',
      subtotal: 342.72,
      commissionRate: 0.10,
      commissionAmount: 34.27,
      netHostEarnings: 308.45,
      status: 'paid',
      endReason: 'normal',
      photos: {
        arrival: {
          url: '/public/images/socket-arrival.svg',
          timestamp: '18:15'
        },
        departure: null
      },
      autoApprovalRemaining: null,
      disputeReason: null,
      disputeNote: null
    },
    {
      id: 'ses-104',
      stationId: 'st-01',
      stationName: 'Moda, müstakil garaj',
      carModel: 'Hyundai Ioniq 5',
      driverName: 'Örnek Sürücü',
      driverTier: getDriverTier(18), // Altın sürücü
      dateStr: getPastDateStr(5),
      timeRangeStr: '11:00 – 13:10',
      displayRange: `${getPastDateStr(5)} · 11:00 – 13:10`,
      durationMinutes: 130,
      energyKwh: 48.0,
      unitPrice: 6.80,
      tariffLabel: 'standart tarife',
      subtotal: 326.40,
      commissionRate: 0.10,
      commissionAmount: 32.64,
      netHostEarnings: 293.76,
      status: 'paid',
      endReason: 'normal',
      photos: {
        arrival: {
          url: '/public/images/socket-arrival.svg',
          timestamp: '11:00'
        },
        departure: null
      },
      autoApprovalRemaining: null,
      disputeReason: null,
      disputeNote: null
    },
    {
      id: 'ses-105',
      stationId: 'st-01',
      stationName: 'Moda, müstakil garaj',
      carModel: 'TOGG T10X',
      driverName: 'Örnek Sürücü',
      driverTier: getDriverTier(45), // Platin sürücü
      dateStr: getPastDateStr(7),
      timeRangeStr: '01:15 – 06:34',
      displayRange: `${getPastDateStr(7)} · 01:15 – 06:34`,
      durationMinutes: 319,
      energyKwh: 53.1,
      unitPrice: 6.80,
      tariffLabel: 'standart tarife',
      subtotal: 361.08,
      commissionRate: 0.10,
      commissionAmount: 36.11,
      netHostEarnings: 324.97,
      status: 'paid',
      endReason: 'normal',
      photos: {
        arrival: {
          url: '/public/images/socket-arrival.svg',
          timestamp: '01:15'
        },
        departure: null
      },
      autoApprovalRemaining: null,
      disputeReason: null,
      disputeNote: null
    },
    {
      id: 'ses-106',
      stationId: 'st-01',
      stationName: 'Moda, müstakil garaj',
      carModel: 'Renault Megane E-Tech',
      driverName: 'Örnek Sürücü',
      driverTier: getDriverTier(10), // Gümüş sürücü
      dateStr: getPastDateStr(9),
      timeRangeStr: '15:20 – 17:10',
      displayRange: `${getPastDateStr(9)} · 15:20 – 17:10`,
      durationMinutes: 110,
      energyKwh: 38.0,
      unitPrice: 6.80,
      tariffLabel: 'standart tarife',
      subtotal: 258.40,
      commissionRate: 0.10,
      commissionAmount: 25.84,
      netHostEarnings: 232.56,
      status: 'paid',
      endReason: 'normal',
      photos: null,
      autoApprovalRemaining: null,
      disputeReason: null,
      disputeNote: null
    },
    {
      id: 'ses-107',
      stationId: 'st-01',
      stationName: 'Moda, müstakil garaj',
      carModel: 'Mercedes EQE',
      driverName: 'Örnek Sürücü',
      driverTier: getDriverTier(22), // Altın sürücü
      dateStr: getPastDateStr(12),
      timeRangeStr: '13:00 – 15:30',
      displayRange: `${getPastDateStr(12)} · 13:00 – 15:30`,
      durationMinutes: 150,
      energyKwh: 55.0,
      unitPrice: 6.80,
      tariffLabel: 'standart tarife',
      subtotal: 374.00,
      commissionRate: 0.10,
      commissionAmount: 37.40,
      netHostEarnings: 336.60,
      status: 'paid',
      endReason: 'normal',
      photos: null,
      autoApprovalRemaining: null,
      disputeReason: null,
      disputeNote: null
    },
    {
      id: 'ses-108',
      stationId: 'st-01',
      stationName: 'Moda, müstakil garaj',
      carModel: 'BMW i4',
      driverName: 'Örnek Sürücü',
      driverTier: getDriverTier(3), // Bronz sürücü
      dateStr: getPastDateStr(14),
      timeRangeStr: '09:30 – 11:30',
      displayRange: `${getPastDateStr(14)} · 09:30 – 11:30`,
      durationMinutes: 120,
      energyKwh: 40.0,
      unitPrice: 6.80,
      tariffLabel: 'standart tarife',
      subtotal: 272.00,
      commissionRate: 0.10,
      commissionAmount: 27.20,
      netHostEarnings: 244.80,
      status: 'paid',
      endReason: 'normal',
      photos: null,
      autoApprovalRemaining: null,
      disputeReason: null,
      disputeNote: null
    },
    {
      id: 'ses-109',
      stationId: 'st-01',
      stationName: 'Moda, müstakil garaj',
      carModel: 'Volvo EX30',
      driverName: 'Örnek Sürücü',
      driverTier: getDriverTier(25), // Altın sürücü
      dateStr: getPastDateStr(16),
      timeRangeStr: '19:00 – 21:05',
      displayRange: `${getPastDateStr(16)} · 19:00 – 21:05`,
      durationMinutes: 125,
      energyKwh: 45.0,
      unitPrice: 6.80,
      tariffLabel: 'standart tarife',
      subtotal: 306.00,
      commissionRate: 0.10,
      commissionAmount: 30.60,
      netHostEarnings: 275.40,
      status: 'paid',
      endReason: 'normal',
      photos: null,
      autoApprovalRemaining: null,
      disputeReason: null,
      disputeNote: null
    },
    {
      id: 'ses-110',
      stationId: 'st-01',
      stationName: 'Moda, müstakil garaj',
      carModel: 'TOGG T10X',
      driverName: 'Örnek Sürücü',
      driverTier: getDriverTier(50), // Platin sürücü
      dateStr: getPastDateStr(19),
      timeRangeStr: '00:30 – 05:49',
      displayRange: `${getPastDateStr(19)} · 00:30 – 05:49`,
      durationMinutes: 319,
      energyKwh: 53.1,
      unitPrice: 6.80,
      tariffLabel: 'standart tarife',
      subtotal: 361.08,
      commissionRate: 0.10,
      commissionAmount: 36.11,
      netHostEarnings: 324.97,
      status: 'paid',
      endReason: 'normal',
      photos: null,
      autoApprovalRemaining: null,
      disputeReason: null,
      disputeNote: null
    }
  ];
};

const INITIAL_RESERVATIONS = createRelativeReservations();

// --- 5.2 SEANS ÖZETİ VE İTİRAZ — EV SAHİBİ BİLEŞENİ (/seans-ozeti) ---
const SeansOzetiView = ({
  session,
  onBack,
  onApproveSession,
  onDisputeSession
}) => {
  const [isDisputeModalOpen, setIsDisputeModalOpen] = React.useState(false);
  const [disputeReason, setDisputeReason] = React.useState('Süre yanlış');
  const [disputeNote, setDisputeNote] = React.useState('');
  const [actionToast, setActionToast] = React.useState(null);
  const [isApproving, setIsApproving] = React.useState(false);

  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [session, isDisputeModalOpen, actionToast]);

  if (!session) {
    return (
      <div className="pt-12 text-center text-[#A1A1A6] space-y-4">
        <p>Görüntülenecek seans kaydı bulunamadı.</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-full bg-[#1C1C1E] text-white text-xs border border-[#3A3A3C]"
        >
          ← Rezervasyonlar'a Dön
        </button>
      </div>
    );
  }

  const handleApprove = () => {
    if (isApproving) return;
    setIsApproving(true);
    onApproveSession(session.id);
    setActionToast('Seans onaylandı. Tutar anında çekilebilir bakiyenize aktarıldı.');
    setTimeout(() => {
      setActionToast(null);
      setIsApproving(false);
    }, 4000);
  };

  const handleSubmitDispute = (e) => {
    e.preventDefault();
    onDisputeSession(session.id, disputeReason, disputeNote);
    setIsDisputeModalOpen(false);
    setActionToast('İtirazınız iletildi. Durum: İncelemede.');
    setTimeout(() => setActionToast(null), 4000);
  };

  const isEmergency = session.endReason === 'emergency_stop';

  return (
    <div className="pt-2 pb-16 w-full space-y-8">
      {/* 1. Geri Bağlantı */}
      <div className="pt-4 pb-2">
        <button
          onClick={onBack}
          className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors flex items-center space-x-1.5 font-normal cursor-pointer"
        >
          <span>← Rezervasyonlar</span>
        </button>
      </div>

      {/* 2. Başlık ve Alt Metin */}
      <div className="space-y-2">
        {isEmergency && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
            <i data-lucide="alert-triangle" className="w-3.5 h-3.5"></i>
            <span>Acil durdurma ile sonlandırıldı.</span>
          </div>
        )}

        <h1 className="hero-title text-4xl sm:text-5xl font-bold tracking-tight text-[#F5F5F7]">
          Seans özeti.
        </h1>
        <p className="text-[#A1A1A6] text-xs sm:text-sm">
          {session.stationName} · {session.displayRange || `${session.dateStr} · ${session.timeRangeStr}`}
        </p>
      </div>

      {/* 3. İki Kolonlu Düzen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* SOL KOLON: Sana Yatacak Tutar ve Döküm (7 Kolon) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl p-6 sm:p-8 space-y-6">
            <span className="text-xs text-[#A1A1A6] font-medium tracking-wide block">
              Sana yatacak tutar
            </span>

            {/* Büyük Net Kazanç Rakamı */}
            <div className="text-4xl sm:text-5xl font-bold text-[#F5F5F7] tracking-tight tabular-nums">
              ₺{session.netHostEarnings.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            {/* Döküm Satırları (Kutusuz, İnce Çizgili) */}
            <div className="divide-y divide-[#2C2C2E] border-t border-b border-[#2C2C2E] text-xs">
              <div className="py-3 flex justify-between items-center">
                <span className="text-[#A1A1A6]">Süre</span>
                <span className="font-semibold text-[#F5F5F7] tabular-nums">{session.durationMinutes} dk</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-[#A1A1A6]">Enerji (tahmini)</span>
                <span className="font-semibold text-[#F5F5F7] tabular-nums">
                  {session.energyKwh.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh
                </span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-[#A1A1A6]">Birim fiyat ({session.tariffLabel || 'gece tarifesi, ×0,75'})</span>
                <span className="font-semibold text-[#F5F5F7] tabular-nums">
                  ₺{session.unitPrice.toFixed(2).replace('.', ',')} / kWh
                </span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-[#A1A1A6]">Ara tutar</span>
                <span className="font-semibold text-[#F5F5F7] tabular-nums">
                  ₺{session.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="py-3 flex justify-between items-center text-amber-400">
                <span>Platform komisyonu (%{Math.round(session.commissionRate * 100)})</span>
                <span className="font-semibold tabular-nums">
                  –₺{session.commissionAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Kural 2: 22 kW istasyon + 11 kW araç limit uyarısı */}
            {session.chargingLimitNote && (
              <div className="p-3 rounded-2xl bg-[#141416] border border-[#2C2C2E] text-xs text-[#A1A1A6] flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C] shrink-0"></span>
                <span>{session.chargingLimitNote}</span>
              </div>
            )}

            {/* Not */}
            <p className="text-xs text-[#A1A1A6] leading-relaxed">
              Enerji, araç bataryası ve cihaz gücünden hesaplanan tahmindir. Rakamlar sence yanlışsa itiraz edebilirsin.
            </p>
          </div>
        </div>

        {/* SAĞ KOLON: Fotoğraflar ve Onay Kartı (5 Kolon) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Kart 1: Sürücünün Çektiği Fotoğraflar */}
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl p-6 space-y-4">
            <span className="text-xs text-[#A1A1A6] font-medium tracking-wide block">
              Sürücünün çektiği fotoğraflar
            </span>

            <div className="grid grid-cols-2 gap-3">
              {/* Gelişte */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-[#A1A1A6] block">
                  Gelişte · {session.photos?.arrival?.timestamp || '23:18'}
                </span>
                {session.photos?.arrival?.url ? (
                  <div className="relative rounded-2xl overflow-hidden border border-[#2C2C2E] aspect-[4/3] bg-black">
                    <img
                      src={session.photos.arrival.url}
                      alt="Geliş fotoğrafı"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#2C2C2E] aspect-[4/3] bg-[#141416] flex items-center justify-center p-2 text-center">
                    <span className="text-[11px] text-[#555558]">Fotoğraf yüklenmedi</span>
                  </div>
                )}
              </div>

              {/* Çıkışta */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-[#A1A1A6] block">
                  Çıkışta · {session.photos?.departure?.timestamp || '01:47'}
                </span>
                {session.photos?.departure?.url ? (
                  <div className="relative rounded-2xl overflow-hidden border border-[#2C2C2E] aspect-[4/3] bg-black">
                    <img
                      src={session.photos.departure.url}
                      alt="Çıkış fotoğrafı"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#2C2C2E] aspect-[4/3] bg-[#141416] flex items-center justify-center p-2 text-center">
                    <span className="text-[11px] text-[#555558]">Fotoğraf yüklenmedi</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-[#A1A1A6] leading-relaxed pt-1">
              Fotoğraflar anlaşmazlık olursa kanıt olarak saklanır.
            </p>
          </div>

          {/* Kart 2: Seansı Onaylıyor musun? */}
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl p-6 space-y-4">
            <h3 className="font-semibold text-sm text-[#F5F5F7]">
              Seansı onaylıyor musun?
            </h3>

            {session.status === 'pending_approval' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] text-[#30C27C] font-medium block">
                    Otomatik onaya {session.autoApprovalRemaining || '47 sa 12 dk'} kaldı
                  </span>
                  <p className="text-xs text-[#A1A1A6] leading-relaxed">
                    48 saat içinde yanıt vermezsen seans otomatik onaylanır ve tutar hemen çekilebilir bakiyene geçer. İtiraz edersen destek ekibi inceler.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    disabled={isApproving}
                    onClick={handleApprove}
                    className="w-full py-3.5 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all shadow-sm disabled:opacity-60 disabled:cursor-wait"
                  >
                    {isApproving ? 'Onaylanıyor...' : 'Onayla'}
                  </button>

                  <button
                    disabled={isApproving}
                    onClick={() => setIsDisputeModalOpen(true)}
                    className="w-full py-2.5 rounded-full bg-[#1C1C1E] border border-[#3A3A3C] hover:border-[#555558] text-[#F5F5F7] font-medium text-xs transition-all disabled:opacity-60"
                  >
                    İtiraz et
                  </button>

                  <div className="mt-3 p-3 rounded-2xl border border-dashed border-[#3A3A3C] bg-[#141416] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-[#A1A1A6] font-medium">
                      <span>Demo kontrolü</span>
                      <span className="text-[#30C27C]">Simülasyon</span>
                    </div>
                    <button
                      disabled={isApproving}
                      onClick={() => {
                        if (isApproving) return;
                        setIsApproving(true);
                        onApproveSession(session.id);
                        setActionToast('48 saat süre simüle edildi: Seans otomatik onaylandı ve çekilebilir bakiyeye aktarıldı.');
                        setTimeout(() => {
                          setActionToast(null);
                          setIsApproving(false);
                        }, 4000);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[11px] text-[#A1A1A6] hover:text-[#F5F5F7] transition-all cursor-pointer font-medium text-center leading-normal break-words disabled:opacity-60"
                    >
                      {isApproving ? 'Onaylanıyor...' : '(Demo: 48 saati simüle et ve otomatik onayla)'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {session.status === 'approved' && (
              <div className="p-4 rounded-2xl bg-[#30C27C]/10 border border-[#30C27C]/30 text-[#30C27C] text-xs space-y-1">
                <div className="flex items-center space-x-1.5 font-semibold">
                  <i data-lucide="check" className="w-4 h-4"></i>
                  <span>Seans onaylandı</span>
                </div>
                <p className="text-[11px] text-[#A1A1A6]">
                  Tutar anında çekilebilir bakiyenize aktarıldı. Kazançlar sayfasından banka hesabınıza aktarabilirsiniz.
                </p>
              </div>
            )}

            {session.status === 'paid' && (
              <div className="p-4 rounded-2xl bg-[#30C27C]/10 border border-[#30C27C]/30 text-[#30C27C] text-xs space-y-1">
                <div className="flex items-center space-x-1.5 font-semibold">
                  <i data-lucide="check-circle" className="w-4 h-4"></i>
                  <span>Ödendi</span>
                </div>
                <p className="text-[11px] text-[#A1A1A6]">
                  ₺{session.netHostEarnings.toFixed(2).replace('.', ',')} tutarındaki kazanç hesabınıza aktarıldı.
                </p>
              </div>
            )}

            {session.status === 'disputed' && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs space-y-2">
                <div className="flex items-center space-x-1.5 font-semibold">
                  <i data-lucide="alert-triangle" className="w-4 h-4"></i>
                  <span>İtiraz edildi (İncelemede)</span>
                </div>
                <div className="text-[11px] text-[#A1A1A6] space-y-0.5">
                  <p><span className="text-[#F5F5F7]">Neden:</span> {session.disputeReason}</p>
                  {session.disputeNote && <p><span className="text-[#F5F5F7]">Notunuz:</span> "{session.disputeNote}"</p>}
                </div>
                <p className="text-[11px] text-[#A1A1A6] pt-1 border-t border-amber-500/20">
                  Destek ekibi fotoğrafları ve sayaç kayıtlarını 24 saat içinde inceleyerek sizinle iletişime geçecektir.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: İtiraz Et */}
      {isDisputeModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] p-6 max-w-md w-full space-y-4 border border-[#3A3A3C] rounded-2xl relative shadow-2xl">
            <button
              onClick={() => setIsDisputeModalOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1A6] hover:text-white font-bold text-sm"
            >
              ✕
            </button>

            <div>
              <h3 className="text-base font-bold text-[#F5F5F7]">Seansa itiraz et</h3>
              <p className="text-xs text-[#A1A1A6] mt-0.5">
                Uyuşmazlık durumunda seans dondurulur ve destek ekibi telemetriyi inceler.
              </p>
            </div>

            <form onSubmit={handleSubmitDispute} className="space-y-4 pt-1">
              <div className="space-y-2">
                <label className="text-xs text-[#A1A1A6] block font-medium">İtiraz Nedeni:</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Süre yanlış', 'Hasar var', 'Diğer'].map((reason) => (
                    <button
                      type="button"
                      key={reason}
                      onClick={() => setDisputeReason(reason)}
                      className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        disputeReason === reason
                          ? 'bg-[#F5F5F7] text-black border-white'
                          : 'bg-[#141416] text-[#A1A1A6] border-[#2C2C2E] hover:border-[#3A3A3C]'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#A1A1A6] block font-medium">Açıklama / Detaylar:</label>
                <textarea
                  value={disputeNote}
                  onChange={(e) => setDisputeNote(e.target.value)}
                  placeholder="Sayacın okuduğu farklı bir değer veya oluşan hasar hakkında bilgi verin..."
                  rows={3}
                  required
                  className="w-full p-3 rounded-xl bg-[#000000] border border-[#2C2C2E] text-xs text-[#F5F5F7] focus:outline-none focus:border-[#30C27C] resize-none"
                ></textarea>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all shadow-sm"
                >
                  İtirazı Gönder
                </button>
                <button
                  type="button"
                  onClick={() => setIsDisputeModalOpen(false)}
                  className="w-full py-2.5 rounded-full bg-[#141416] text-[#A1A1A6] hover:text-white border border-[#2C2C2E] text-xs font-medium"
                >
                  Vazgeç
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bildirim Toast */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-[1100] bg-[#1C1C1E] border border-[#30C27C] text-[#F5F5F7] px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs">
          <i data-lucide="check" className="w-4 h-4 text-[#30C27C]"></i>
          <span>{actionToast}</span>
        </div>
      )}
    </div>
  );
};

// --- REZERVASYONLAR LİSTESİ BİLEŞENİ (/host-reservations) ---
const HostReservationsView = ({
  reservations,
  onSelectReservation,
  onAddNewSchedule
}) => {
  const [activeSubTab, setActiveSubTab] = React.useState('pending'); // 'upcoming' | 'pending' | 'past'

  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [activeSubTab, reservations]);

  // Sekmelere göre filtreleme
  const upcomingList = reservations.filter(r => r.status === 'upcoming');
  const pendingList = reservations.filter(r => r.status === 'pending_approval');
  const pastList = reservations.filter(r => r.status === 'approved' || r.status === 'paid' || r.status === 'disputed');

  const currentList = activeSubTab === 'upcoming'
    ? upcomingList
    : activeSubTab === 'pending'
    ? pendingList
    : pastList;

  const emptyMessages = {
    upcoming: 'Yaklaşan bir rezervasyon bulunmuyor.',
    pending: 'Onay bekleyen seans bulunmuyor. Tüm seanslar işlendi.',
    past: 'Henüz geçmiş bir seans kaydı bulunmuyor.'
  };

  return (
    <div className="pt-2 pb-16 w-full space-y-8">
      {/* 1. Başlık */}
      <div className="pt-4 space-y-1">
        <h1 className="hero-title text-4xl sm:text-5xl font-bold tracking-tight text-[#F5F5F7]">
          Rezervasyonlar.
        </h1>
        <p className="text-[#A1A1A6] text-xs sm:text-sm">
          İstasyonlarına ait tüm seanslar, onay bekleyen kayıtlar ve geçmiş kazançlar.
        </p>
      </div>

      {/* 2. Sekmeler (Yaklaşan, Onay bekleyen, Geçmiş) */}
      <div className="flex border-b border-[#2C2C2E] space-x-5 sm:space-x-8 text-xs font-medium overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`pb-3 transition-colors relative flex items-center space-x-2 shrink-0 ${
            activeSubTab === 'pending' ? 'text-[#F5F5F7]' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
          }`}
        >
          <span>Onay bekleyen</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30">
            {pendingList.length}
          </span>
          {activeSubTab === 'pending' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F5F5F7]"></div>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('upcoming')}
          className={`pb-3 transition-colors relative flex items-center space-x-2 shrink-0 ${
            activeSubTab === 'upcoming' ? 'text-[#F5F5F7]' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
          }`}
        >
          <span>Yaklaşan</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#1C1C1E] text-[#A1A1A6]">
            {upcomingList.length}
          </span>
          {activeSubTab === 'upcoming' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F5F5F7]"></div>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('past')}
          className={`pb-3 transition-colors relative flex items-center space-x-2 shrink-0 ${
            activeSubTab === 'past' ? 'text-[#F5F5F7]' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
          }`}
        >
          <span>Son seanslar</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#1C1C1E] text-[#A1A1A6]">
            {pastList.length}
          </span>
          {activeSubTab === 'past' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F5F5F7]"></div>
          )}
        </button>
      </div>

      {/* 3. Rezervasyonlar Listesi (Kutusuz, İnce Çizgili Satırlar) */}
      {currentList.length === 0 ? (
        <div className="py-16 text-center text-[#A1A1A6] text-xs bg-[#1C1C1E]/40 border border-[#2C2C2E] rounded-2xl p-8 space-y-2">
          <p>{emptyMessages[activeSubTab]}</p>
          {activeSubTab === 'upcoming' && (
            <button
              onClick={onAddNewSchedule}
              className="mt-3 px-4 py-2 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#F5F5F7] border border-[#3A3A3C] text-xs font-medium"
            >
              Müsaitlik takvimini düzenle
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-[#2C2C2E] border-t border-b border-[#2C2C2E]">
          {currentList.map((item) => {
            const isDisputed = item.status === 'disputed';
            const isApproved = item.status === 'approved';
            const isPaid = item.status === 'paid';
            const isPending = item.status === 'pending_approval';

            return (
              <div
                key={item.id}
                onClick={() => onSelectReservation(item)}
                className="py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#1C1C1E]/30 px-2 rounded-xl transition-all cursor-pointer group"
              >
                {/* Sol Blok: Tarih, İstasyon, Sürücü */}
                <div className="space-y-1 sm:max-w-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-[#F5F5F7] tabular-nums">
                      {item.displayRange || `${item.dateStr} · ${item.timeRangeStr}`}
                    </span>
                  </div>
                  <div className="text-xs text-[#A1A1A6]">
                    {item.stationName} · {item.carModel}
                  </div>
                  <div className="flex items-center space-x-2 pt-0.5">
                    <span className="text-xs text-[#F5F5F7] font-medium">{item.driverName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.driverTier?.badgeBg || 'bg-[#1C1C1E] text-[#A1A1A6]'}`}>
                      {item.driverTier?.name || 'Sürücü'}
                    </span>
                  </div>
                </div>

                {/* Orta Blok: Süre & Tüketim */}
                <div className="text-left sm:text-center text-xs space-y-0.5">
                  <span className="text-[#A1A1A6] block text-[11px]">Süre ve enerji</span>
                  <span className="font-medium text-[#F5F5F7] tabular-nums block">
                    {item.durationMinutes} dk · {item.energyKwh.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh
                  </span>
                </div>

                {/* Sağ Blok: Net Tutar & Durum Rozeti */}
                <div className="flex items-center justify-between sm:justify-end space-x-4">
                  <div className="text-right">
                    <span className="text-xs text-[#A1A1A6] block text-[11px]">Net kazanç</span>
                    <span className="text-sm font-bold text-[#F5F5F7] tabular-nums block">
                      ₺{item.netHostEarnings.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Durum Rozeti */}
                  <div className="min-w-[100px] text-right">
                    {isPending && (
                      <span className="inline-block text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                        Onay bekliyor
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-block text-[11px] px-2.5 py-1 rounded-full bg-[#30C27C]/10 text-[#30C27C] border border-[#30C27C]/30 font-medium">
                        Onaylandı
                      </span>
                    )}
                    {isPaid && (
                      <span className="inline-block text-[11px] px-2.5 py-1 rounded-full bg-[#30C27C]/10 text-[#30C27C] border border-[#30C27C]/30 font-medium">
                        Ödendi
                      </span>
                    )}
                    {isDisputed && (
                      <span className="inline-block text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                        İncelemede
                      </span>
                    )}
                    {item.status === 'upcoming' && (
                      <span className="inline-block text-[11px] px-2.5 py-1 rounded-full bg-[#1C1C1E] text-[#A1A1A6] border border-[#2C2C2E] font-medium">
                        Yaklaşan
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-[#555558] group-hover:text-[#F5F5F7] transition-colors pl-1">
                    →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- 5.3 BEKLEME LİSTESİ — SÜRÜCÜ BİLEŞENİ (/bekleme) ---
const BeklemeView = ({
  location = 'Üsküdar',
  onBack,
  onSelectStation
}) => {
  const [selectedSocket, setSelectedSocket] = React.useState('Type 2'); // 'Type 2' | 'CCS2' | 'all'
  const [emailInput, setEmailInput] = React.useState('');
  const [emailError, setEmailError] = React.useState(null);
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  const KNOWN_DISTRICTS = [
    'Üsküdar', 'Beşiktaş', 'Şişli', 'Kadıköy', 'Ataşehir', 'Bakırköy', 'Beyoğlu',
    'Sarıyer', 'Maltepe', 'Kartal', 'Pendik', 'Fatih', 'Beykoz', 'Tuzla',
    'Kağıthane', 'Zeytinburnu', 'Küçükçekmece', 'Büyükçekmece', 'Başakşehir',
    'Çekmeköy', 'Ümraniye', 'Moda', 'Fenerbahçe'
  ];

  const trimmedLoc = (location || '').trim();
  const isKnownDistrict = Boolean(trimmedLoc && KNOWN_DISTRICTS.some(d => d.toLowerCase() === trimmedLoc.toLowerCase()));

  const getDynamicTitle = () => {
    if (!trimmedLoc || !isKnownDistrict) {
      return 'Bu bölgede henüz şarj noktası yok.';
    }
    const lastVowel = (trimmedLoc.match(/[aıoueiöü]/gi) || []).pop()?.toLowerCase() || 'a';
    const isBackVowel = ['a', 'ı', 'o', 'u'].includes(lastVowel);
    const suffix = isBackVowel ? "'da" : "'de";
    return `${trimmedLoc}${suffix} henüz şarj noktası yok.`;
  };

  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [isSubscribed, isInviteModalOpen, copiedLink]);

  const handleSubscribe = (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput || !emailRegex.test(emailInput.trim())) {
      setEmailError('Lütfen geçerli bir e-posta adresi girin (örn. ad@ornek.com).');
      return;
    }
    setEmailError(null);
    setIsSubscribed(true);
  };

  const handleCopyInvite = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="pt-2 pb-16 w-full space-y-8">
      {/* 1. Geri Dön Linki */}
      <div className="pt-4 pb-2">
        <button
          onClick={onBack}
          className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors flex items-center space-x-1.5 font-normal cursor-pointer"
        >
          <span>← Keşfet'e dön</span>
        </button>
      </div>

      {/* 2. Başlık ve Alt Satır (Dinamik İlçe veya Genel Başlık) */}
      <div className="space-y-1">
        <h1 className="hero-title text-4xl sm:text-5xl font-bold tracking-tight text-[#F5F5F7]">
          {getDynamicTitle()}
        </h1>
        <p className="text-[#A1A1A6] text-xs sm:text-sm">
          İlk ev sahibi katılınca sana haber verelim.
        </p>
      </div>

      {/* 3. Ana Kartlar Grid (Sol: Bekleme Listesi, Sağ: Ev Sahibi Davet Et) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* SOL KART: Bekleme Listesi (7 Kolon) */}
        <div className="lg:col-span-7 bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl p-6 sm:p-8 space-y-5">
          <span className="text-xs text-[#A1A1A6] font-medium tracking-wide block">
            Bekleme listesi
          </span>

          {!isSubscribed ? (
            <form onSubmit={handleSubscribe} className="space-y-4">
              {/* Konum Alanı */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#A1A1A6] block font-medium">Talep edilen konum</label>
                <div className="w-full bg-[#141416] border border-[#2C2C2E] rounded-2xl px-4 py-3 text-xs text-[#F5F5F7] flex items-center justify-between">
                  <span>{isKnownDistrict ? `${trimmedLoc}, İstanbul` : (trimmedLoc || 'İstanbul')}</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                </div>
              </div>

              {/* Soket Tipi Çipleri */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#A1A1A6] block font-medium">İhtiyacın olan soket tipi</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'Type 2', label: 'Type 2' },
                    { id: 'CCS2', label: 'CCS2' },
                    { id: 'all', label: 'Fark etmez' }
                  ].map((socket) => (
                    <button
                      type="button"
                      key={socket.id}
                      onClick={() => setSelectedSocket(socket.id)}
                      className={`py-2 px-3.5 rounded-full text-xs font-medium border transition-all ${
                        selectedSocket === socket.id
                          ? 'bg-[#F5F5F7] text-black border-white'
                          : 'bg-[#141416] text-[#A1A1A6] border-[#2C2C2E] hover:border-[#3A3A3C]'
                      }`}
                    >
                      {socket.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* İletişim Alanı */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#A1A1A6] block font-medium">Bildirim e-postası</label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="ad@ornek.com"
                  className="w-full bg-[#000000] border border-[#2C2C2E] rounded-2xl px-4 py-3 text-xs text-[#F5F5F7] focus:outline-none focus:border-white transition-colors"
                />
                {emailError && (
                  <p className="text-xs text-red-400 mt-1">{emailError}</p>
                )}
                <p className="text-[11px] text-[#A1A1A6] mt-1.5 leading-normal">
                  Demo: e-posta adresin yalnızca bölgede istasyon açıldığında haber verme amacıyla saklanır.
                </p>
              </div>

              {/* Haber Ver Butonu */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all shadow-sm"
                >
                  Haber ver
                </button>
                <p className="text-[11px] text-[#A1A1A6] text-center leading-normal">
                  Bildirimle haber veririz. İstediğin zaman listeden çıkabilirsin.
                </p>
              </div>
            </form>
          ) : (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#141416] border border-[#2C2C2E] flex items-center justify-center mx-auto text-[#30C27C]">
                <i data-lucide="check" className="w-6 h-6"></i>
              </div>
              <h3 className="font-semibold text-base text-[#F5F5F7]">Listeye eklendin!</h3>
              <p className="text-xs text-[#A1A1A6] max-w-sm mx-auto">
                {trimmedLoc || 'Bu bölgede'} yeni bir şarj noktası onaylandığında <span className="text-[#F5F5F7] font-medium">{emailInput}</span> adresine anında bildirim göndereceğiz.
              </p>
              <button
                type="button"
                onClick={() => setIsSubscribed(false)}
                className="text-[11px] text-[#A1A1A6] hover:text-[#F5F5F7] underline pt-2"
              >
                Bilgileri güncelle
              </button>
            </div>
          )}
        </div>

        {/* SAĞ KART: Ev Sahibi Davet Et (5 Kolon) */}
        <div className="lg:col-span-5 bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl p-6 sm:p-8 space-y-4">
          <h3 className="font-semibold text-base sm:text-lg text-[#F5F5F7]">
            Bir ev sahibi tanıyor musun?
          </h3>
          <p className="text-xs text-[#A1A1A6] leading-relaxed">
            Soketi olan bir komşunu ya da arkadaşını davet et. Katılırsa ikiniz de ilk ay komisyonsuz kazanırsınız.
          </p>

          <div className="pt-2">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="w-full py-3 rounded-full bg-[#1C1C1E] border border-[#3A3A3C] hover:border-[#555558] text-[#F5F5F7] font-medium text-xs transition-all flex items-center justify-center space-x-2"
            >
              <i data-lucide="share-2" className="w-3.5 h-3.5 text-[#A1A1A6]"></i>
              <span>Davet et</span>
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#141416] border border-[#2C2C2E] text-[11px] text-[#A1A1A6] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[#30C27C] font-medium block">Komisyonsuz başlangıç</span>
              <span className="px-2 py-0.5 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] text-[10px] text-[#A1A1A6]">Örnek kampanya</span>
            </div>
            <p>Davet ettiğin ev sahibi ilk seansını tamamladığında her iki tarafın hesabına ₺100 şarj kredisi <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-[#1C1C1E] border border-[#2C2C2E] text-[#A1A1A6] font-normal ml-1">Örnek kampanya</span> tanımlanır.</p>
          </div>
        </div>
      </div>

      {/* 4. Alt Liste: "Şimdilik en yakın seçenekler" */}
      <div className="pt-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-[#F5F5F7] tracking-tight">
          Şimdilik en yakın seçenekler
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Seçenek 1: Moda, müstakil garaj */}
          <div className="p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] hover:border-[#3A3A3C] transition-all flex flex-col justify-between space-y-4 group">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#141416] text-[#30C27C] border border-[#2C2C2E] font-medium">
                  6,2 km uzakta
                </span>
                <span className="text-xs font-semibold text-[#F5F5F7] tabular-nums">
                  ₺6,80 / kWh
                </span>
              </div>
              <h4 className="font-semibold text-sm text-[#F5F5F7] group-hover:text-white">
                Moda, müstakil garaj
              </h4>
              <p className="text-xs text-[#A1A1A6]">
                Type 2 · 22 kW · Kadıköy
              </p>
            </div>

            <button
              onClick={() => onSelectStation('st-01')}
              className="w-full py-2.5 rounded-full bg-[#141416] hover:bg-[#202023] border border-[#2C2C2E] hover:border-[#3A3A3C] text-xs font-medium text-[#F5F5F7] transition-all flex items-center justify-center space-x-1.5"
            >
              <span>İncele ve randevu al</span>
              <span>→</span>
            </button>
          </div>

          {/* Seçenek 2: Ataşehir, site garajı */}
          <div className="p-5 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] hover:border-[#3A3A3C] transition-all flex flex-col justify-between space-y-4 group">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#141416] text-[#A1A1A6] border border-[#2C2C2E] font-medium">
                  7,9 km uzakta
                </span>
                <span className="text-xs font-semibold text-[#F5F5F7] tabular-nums">
                  ₺6,50 / kWh
                </span>
              </div>
              <h4 className="font-semibold text-sm text-[#F5F5F7] group-hover:text-white">
                Ataşehir, site garajı
              </h4>
              <p className="text-xs text-[#A1A1A6]">
                Type 2 · 11 kW · Ataşehir
              </p>
            </div>

            <button
              onClick={() => onSelectStation('st-03')}
              className="w-full py-2.5 rounded-full bg-[#141416] hover:bg-[#202023] border border-[#2C2C2E] hover:border-[#3A3A3C] text-xs font-medium text-[#F5F5F7] transition-all flex items-center justify-center space-x-1.5"
            >
              <span>İncele ve randevu al</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Davet Modalı (Sahte Alan Adı: demo.chargerent.local) */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] p-6 max-w-md w-full space-y-4 border border-[#3A3A3C] rounded-2xl relative shadow-2xl">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1A6] hover:text-white font-bold text-sm"
            >
              ✕
            </button>

            <div>
              <h3 className="text-base font-bold text-[#F5F5F7]">Komşunu ChargeRent'e davet et</h3>
              <p className="text-xs text-[#A1A1A6] mt-0.5">
                Davet linkinle üye olan ev sahipleri ilk ay %0 komisyonla kazanır.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#000000] border border-[#2C2C2E] flex items-center justify-between text-xs text-[#A1A1A6]">
              <span className="truncate pr-2 font-mono text-[11px] text-[#F5F5F7]">
                demo.chargerent.local/davet/uskudar-komsu
              </span>
              <button
                onClick={handleCopyInvite}
                className="px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#3A3A3C] text-[#F5F5F7] hover:bg-[#2C2C2E] text-xs font-medium flex-shrink-0"
              >
                {copiedLink ? 'Kopyalandı' : 'Kopyala'}
              </button>
            </div>

            <p className="text-[11px] text-[#A1A1A6]">
              Bu linki WhatsApp gruplarında veya komşunla paylaşabilirsin.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// --- EV SAHİBİ HAKEDİŞLER VE CÜZDAN MODELİ VE GÖRÜNÜMÜ ---
// Kural 5: Geçmiş banka transfer tarihlerini Pazartesi 09:00 olarak dinamik üret
const createRelativePayoutTransfers = (now = new Date()) => {
  const getPastMonday = (weeksAgo) => {
    const d = new Date(now.getTime());
    const day = d.getDay(); // 0: Paz, 1: Pzt, ...
    let diff = (day === 0 ? 6 : day - 1);
    if (day === 1 && now.getHours() < 9) {
      diff = 7;
    }
    d.setDate(d.getDate() - diff - (weeksAgo * 7));
    d.setHours(9, 0, 0, 0);
    const dayNum = d.getDate();
    const monthName = d.toLocaleDateString('tr-TR', { month: 'long' });
    const year = d.getFullYear();
    const dateStr = `${dayNum} ${monthName} ${year}`;
    const ym = `${year}${String(d.getMonth() + 1).padStart(2, '0')}${String(dayNum).padStart(2, '0')}`;
    return { dateStr, ym };
  };

  const m0 = getPastMonday(0);
  const m1 = getPastMonday(1);
  const m2 = getPastMonday(2);
  const m3 = getPastMonday(3);

  return [
    {
      id: 'tr-901',
      refCode: `REF-${m0.ym}-8912`,
      dateStr: m0.dateStr,
      timeStr: '09:00',
      bankName: 'Örnek Banka',
      shortBankLabel: 'Örnek Banka · ••0000',
      maskedIban: 'TR00 •••• •••• •••• •••• 0000',
      amount: 2844.27,
      status: 'completed'
    },
    {
      id: 'tr-902',
      refCode: `REF-${m1.ym}-7721`,
      dateStr: m1.dateStr,
      timeStr: '09:00',
      bankName: 'Örnek Banka',
      shortBankLabel: 'Örnek Banka · ••0000',
      maskedIban: 'TR00 •••• •••• •••• •••• 0000',
      amount: 2710.00,
      status: 'completed'
    },
    {
      id: 'tr-903',
      refCode: `REF-${m2.ym}-6540`,
      dateStr: m2.dateStr,
      timeStr: '09:00',
      bankName: 'Örnek Banka',
      shortBankLabel: 'Örnek Banka · ••0000',
      maskedIban: 'TR00 •••• •••• •••• •••• 0000',
      amount: 2760.00,
      status: 'completed'
    },
    {
      id: 'tr-904',
      refCode: `REF-${m3.ym}-5412`,
      dateStr: m3.dateStr,
      timeStr: '09:00',
      bankName: 'Örnek Banka',
      shortBankLabel: 'Örnek Banka · ••0000',
      maskedIban: 'TR00 •••• •••• •••• •••• 0000',
      amount: 2680.00,
      status: 'completed'
    }
  ];
};

const INITIAL_PAYOUT_TRANSFERS = createRelativePayoutTransfers();

const INITIAL_BANK_ACCOUNT = {
  bankName: 'Örnek Banka',
  iban: 'TR00 0000 0000 0000 0000 0000 00',
  maskedIban: 'TR00 •••• •••• •••• •••• 0000',
  accountHolder: 'Örnek Ev Sahibi',
  isFastEligible: true
};

const HostPayoutsView = ({
  reservations,
  transfers = INITIAL_PAYOUT_TRANSFERS,
  bankAccount = INITIAL_BANK_ACCOUNT,
  setBankAccount,
  withdrawableTotal = 1650.00,
  pendingTotal = 243.73,
  transferredTotal = 10994.27,
  onExecuteTransfer,
  onBackToDashboard,
  onNavigateToReservation
}) => {
  const [activeTab, setActiveTab] = React.useState('transfers'); // 'transfers' | 'sessions'
  const [autoWeekly, setAutoWeekly] = React.useState(true);
  const pastSessions = React.useMemo(() => reservations.filter((r) => r.status === 'paid' || r.status === 'approved'), [reservations]);
  
  // Modals & Forms
  const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false);
  const [isEditIbanModalOpen, setIsEditIbanModalOpen] = React.useState(false);
  const [customAmount, setCustomAmount] = React.useState('');
  const [transferError, setTransferError] = React.useState(null);
  const [isTransferring, setIsTransferring] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState(null);
  const [copiedIban, setCopiedIban] = React.useState(false);

  // Edit IBAN Form State
  const [editForm, setEditForm] = React.useState({
    bankName: bankAccount.bankName,
    iban: bankAccount.iban,
    accountHolder: bankAccount.accountHolder
  });

  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [activeTab, isTransferModalOpen, isEditIbanModalOpen, transfers, autoWeekly]);

  const handleCopyIban = () => {
    navigator.clipboard.writeText(bankAccount.iban.replace(/\s+/g, ''));
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
  };

  const handleStartTransfer = () => {
    setCustomAmount(withdrawableTotal.toFixed(2));
    setTransferError(null);
    setIsTransferModalOpen(true);
  };

  const handleConfirmTransfer = (e) => {
    e.preventDefault();
    if (isTransferring) return; // Çift tıklamaya karşı kilit

    setTransferError(null);

    const valStr = String(customAmount).trim();
    if (!valStr) {
      setTransferError('Lütfen aktarılacak bir tutar girin.');
      return;
    }

    // 2 ondalık kontrolü
    if (!/^\d+(\.\d{1,2})?$/.test(valStr)) {
      setTransferError('Lütfen en fazla 2 ondalık basamak içeren geçerli bir tutar girin (örn. 150.50).');
      return;
    }

    const amountNum = parseFloat(valStr);

    if (isNaN(amountNum) || amountNum <= 0) {
      setTransferError('Aktarılacak tutar 0\'dan büyük olmalıdır.');
      return;
    }

    if (amountNum < 50) {
      setTransferError('Minimum çekim tutarı ₺50,00\'dir.');
      return;
    }

    if (amountNum > withdrawableTotal) {
      setTransferError(`Girilen tutar çekilebilir bakiyeden (₺${withdrawableTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) fazla olamaz.`);
      return;
    }

    setIsTransferring(true);

    setTimeout(() => {
      const now = new Date();
      const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const refCode = `REF-${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newTransfer = {
        id: `tr-${Date.now()}`,
        refCode,
        dateStr,
        timeStr,
        bankName: bankAccount.bankName,
        maskedIban: bankAccount.maskedIban,
        amount: amountNum,
        status: 'completed',
        channel: 'Aktarım simülasyonu'
      };

      if (onExecuteTransfer) {
        onExecuteTransfer(newTransfer);
      }

      setIsTransferring(false);
      setIsTransferModalOpen(false);
      setToastMessage(`₺${amountNum.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${bankAccount.bankName} hesabına aktarım simülasyonu ile gönderildi.`);

      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    }, 1200);
  };

  const handleSaveIban = (e) => {
    e.preventDefault();
    const cleanIban = editForm.iban.trim().toUpperCase();
    const last4 = cleanIban.slice(-4) || '0000';
    const updated = {
      bankName: editForm.bankName.trim() || 'Örnek Banka',
      iban: cleanIban,
      maskedIban: `TR00 •••• •••• •••• •••• ${last4}`,
      accountHolder: editForm.accountHolder.trim() || 'Örnek Ev Sahibi',
      isFastEligible: true
    };
    if (setBankAccount) {
      setBankAccount(updated);
    }
    setIsEditIbanModalOpen(false);
  };

  return (
    <div className="pt-2 pb-16 space-y-8 w-full">
      {/* 1. Üst Navigasyon & Başlık Satırı */}
      {onBackToDashboard && (
        <div className="pt-4 pb-2">
          <button
            onClick={onBackToDashboard}
            className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors flex items-center space-x-1.5 font-normal cursor-pointer"
          >
            <span>← Genel bakışa dön</span>
          </button>
        </div>
      )}

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="hero-title text-4xl sm:text-5xl font-bold text-[#F5F5F7] tracking-tight">
              Kazançlar.
            </h1>
            <p className="text-base text-[#A1A1A6] mt-2">
              Tamamlanan ve onaylanan seans kazançlarını banka hesabına aktar.
            </p>
          </div>

          <button
            disabled={withdrawableTotal < 50}
            onClick={handleStartTransfer}
            className={`font-semibold text-xs px-6 py-2.5 rounded-full transition-all self-start sm:self-auto shrink-0 shadow-sm ${
              withdrawableTotal >= 50
                ? 'bg-[#F5F5F7] hover:bg-white text-black cursor-pointer'
                : 'bg-[#1C1C1E] text-[#555558] border border-[#2C2C2E] cursor-not-allowed'
            }`}
          >
            Banka hesabına aktar
          </button>
        </div>
      </div>

      {/* 2. Üç Metrik (Kutusuz, İnce Çizgili - Tek Kayıt Defterinden Hesaplanır) */}
      <div className="border-t border-b border-[#2C2C2E] py-6 sm:py-8 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-0">
        {/* Metrik 1: Çekilebilir Bakiye */}
        <div className="md:pr-8 md:border-r border-[#2C2C2E]">
          <span className="text-xs text-[#A1A1A6] block font-medium">Çekilebilir bakiye</span>
          <span className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-[#F5F5F7] block mt-2 tabular-nums tracking-tight truncate">
            ₺{withdrawableTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-[#A1A1A6] block mt-1.5">
            Onaylanmış net seans kazançları
          </span>
        </div>

        {/* Metrik 2: Bekleyen Bakiye */}
        <div className="md:px-8 md:border-r border-[#2C2C2E]">
          <span className="text-xs text-[#A1A1A6] block font-medium">Bekleyen bakiye</span>
          <span className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-[#F5F5F7] block mt-2 tabular-nums tracking-tight truncate">
            ₺{pendingTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-[#A1A1A6] block mt-1.5">
            Onay veya inceleme bekleyen seanslar.
          </span>
        </div>

        {/* Metrik 3: Toplam Aktarılan */}
        <div className="md:pl-8">
          <span className="text-xs text-[#A1A1A6] block font-medium">Son 30 günde aktarılan</span>
          <span className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-[#F5F5F7] block mt-2 tabular-nums tracking-tight truncate">
            ₺{transferredTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-[#A1A1A6] block mt-1.5">
            {bankAccount.bankName} hesabına aktarıldı
          </span>
        </div>
      </div>

      {/* 3. İki Kolonlu Ana Bölüm: Sol (Transfer ve Seans Geçmişi), Sağ (Kayıtlı Banka Hesabı & Ayarlar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sol Kolon (8 Kolon) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Sekme Butonları */}
          <div className="flex items-center space-x-6 border-b border-[#2C2C2E] pb-3 text-xs font-medium overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('transfers')}
              className={`transition-colors pb-1 border-b-2 -mb-[13px] shrink-0 ${
                activeTab === 'transfers'
                  ? 'text-[#F5F5F7] border-white font-semibold'
                  : 'text-[#A1A1A6] border-transparent hover:text-white'
              }`}
            >
              Banka transferleri (son 30 gün, {transfers.length})
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`transition-colors pb-1 border-b-2 -mb-[13px] ${
                activeTab === 'sessions'
                  ? 'text-[#F5F5F7] border-white font-semibold'
                  : 'text-[#A1A1A6] border-transparent hover:text-white'
              }`}
            >
              Son seanslar ({pastSessions.length})
            </button>
          </div>

          {/* Sekme 1: Banka Transferleri Listesi */}
          {activeTab === 'transfers' && (
            <div className="space-y-4">
              {/* Kural 5: Tek üst bilgilendirme notu */}
              <div className="p-3.5 rounded-2xl bg-[#141416] border border-[#2C2C2E] flex items-center space-x-2.5 text-xs text-[#A1A1A6]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C] shrink-0"></span>
                <span>Demo: aktarımlar her Pazartesi 09:00'da kayıtlı hesaba gönderilir.</span>
              </div>

              <div className="divide-y divide-[#2C2C2E] border-t border-b border-[#2C2C2E]">
                {transfers.map((item) => (
                  <div
                    key={item.id}
                    className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-[#1C1C1E]/30 px-2 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="font-semibold text-[#F5F5F7]">
                          {item.shortBankLabel || `${item.bankName || 'Örnek Banka'} · ••0000`}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-[#A1A1A6]">
                        <span>{item.dateStr}, {item.timeStr}</span>
                        <span>·</span>
                        <span className="font-mono text-[10px] text-[#77777A]">{item.refCode}</span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                      <span className="text-base font-bold text-[#F5F5F7] tabular-nums">
                        ₺{item.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <div className="flex items-center space-x-1.5 text-xs text-[#30C27C]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C]"></span>
                        <span className="font-medium text-[11px]">Tamamlandı</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sekme 2: Seans Hakediş Dökümü (Rezervasyonlardan Net Kazançlar) */}
          {activeTab === 'sessions' && (
            <div className="divide-y divide-[#2C2C2E] border-t border-b border-[#2C2C2E]">
              {pastSessions.map((res) => {
                const isPaid = res.status === 'paid';
                const isApproved = res.status === 'approved';
                const isPending = res.status === 'pending_approval';
                const isDisputed = res.status === 'disputed';

                return (
                  <div
                    key={res.id}
                    onClick={() => onNavigateToReservation ? onNavigateToReservation(res) : null}
                    className="py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-[#1C1C1E]/30 px-2 transition-colors cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-[#F5F5F7] group-hover:text-white">
                          {res.stationName}
                        </span>
                        <span className="text-xs text-[#555558]">·</span>
                        <span className="text-xs text-[#A1A1A6]">{res.carModel}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1C1C1E] text-[#A1A1A6] border border-[#2C2C2E]">
                          {res.driverTier?.name || 'Sürücü'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-[#A1A1A6]">
                        <span>{res.dateStr}</span>
                        <span>·</span>
                        <span>{res.timeRangeStr}</span>
                        <span>·</span>
                        <span>{res.energyKwh} kWh</span>
                        <span>·</span>
                        <span className="text-[#77777A]">-%{Math.round((res.commissionRate || 0.10) * 100)} komisyon kesintisi</span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                      <span className="text-sm font-bold text-[#F5F5F7] tabular-nums">
                        +₺{(res.netHostEarnings || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <div className="text-right">
                        {isPaid && (
                          <span className="text-[11px] text-[#30C27C] flex items-center space-x-1 justify-end">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C]"></span>
                            <span>Hesaba aktarıldı</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="text-[11px] text-[#30C27C] flex items-center space-x-1 justify-end">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C]"></span>
                            <span>Çekilebilir (onaylandı)</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="text-[11px] text-[#A1A1A6] flex items-center space-x-1 justify-end">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#555558]"></span>
                            <span>Onay bekliyor</span>
                          </span>
                        )}
                        {isDisputed && (
                          <div>
                            <span className="text-[11px] text-amber-400 flex items-center space-x-1 justify-end">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              <span>İncelemede (itiraz)</span>
                            </span>
                            <span className="text-[10px] text-[#77777A] block mt-0.5">
                              Tutar bekleyen bakiyede tutuluyor
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sağ Kolon (4 Kolon) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Kayıtlı Banka Hesabı Kartı */}
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A1A1A6] font-medium tracking-wide">
                Kayıtlı banka hesabı
              </span>
              <button
                onClick={() => {
                  setEditForm({
                    bankName: bankAccount.bankName,
                    iban: bankAccount.iban,
                    accountHolder: bankAccount.accountHolder
                  });
                  setIsEditIbanModalOpen(true);
                }}
                className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] underline transition-colors"
              >
                Düzenle
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#F5F5F7]">{bankAccount.bankName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#141416] text-[#A1A1A6] border border-[#2C2C2E] font-medium">
                  Aktarım simülasyonu
                </span>
              </div>
              <p className="text-xs text-[#A1A1A6]">{bankAccount.accountHolder}</p>
            </div>

            <div className="p-3 rounded-2xl bg-[#141416] border border-[#2C2C2E] flex items-center justify-between">
              <span className="text-xs font-mono text-[#F5F5F7] tracking-wider select-all">
                {bankAccount.maskedIban}
              </span>
              <button
                onClick={handleCopyIban}
                className="p-1.5 text-[#A1A1A6] hover:text-white transition-colors"
                title="IBAN Kopyala"
              >
                {copiedIban ? (
                  <span className="text-[10px] text-[#30C27C]">Kopyalandı</span>
                ) : (
                  <i data-lucide="copy" className="w-3.5 h-3.5"></i>
                )}
              </button>
            </div>
          </div>

          {/* Otomatik Aktarım Kartı */}
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-[#F5F5F7]">Otomatik haftalık aktarım</h4>
                <p className="text-[11px] text-[#A1A1A6] mt-0.5">Her Pazartesi 09:00</p>
              </div>
              <button
                type="button"
                onClick={() => setAutoWeekly(!autoWeekly)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                  autoWeekly ? 'bg-[#30C27C]' : 'bg-[#2C2C2E]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    autoWeekly ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-[#A1A1A6] leading-relaxed">
              Çekilebilir bakiyeniz her Pazartesi sabahı otomatik olarak banka hesabınıza aktarım simülasyonu ile transfer edilir.
            </p>
          </div>

          {/* Sıfır Komisyon Bilgi Kutusu */}
          <div className="p-5 rounded-2xl bg-[#141416] border border-[#2C2C2E] space-y-1.5 text-xs">
            <div className="flex items-center space-x-1.5 text-[#F5F5F7] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#30C27C]"></span>
              <span>Transfer ücreti: ₺0 (demo)</span>
            </div>
            <p className="text-[#A1A1A6] leading-relaxed">
              Demo sürümde banka transferleri ve aktarım simülasyonu için işlem ücreti alınmaz. Hesabınıza geçen tutardan hiçbir kesinti yapılmaz.
            </p>
          </div>
        </div>
      </div>

      {/* Transfer Modalı */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] p-6 max-w-md w-full space-y-5 border border-[#3A3A3C] rounded-3xl relative shadow-2xl">
            <button
              onClick={() => !isTransferring && setIsTransferModalOpen(false)}
              disabled={isTransferring}
              className="absolute top-4 right-4 text-[#A1A1A6] hover:text-white font-bold text-sm"
            >
              ✕
            </button>

            <div>
              <h3 className="text-lg font-bold text-[#F5F5F7]">Banka hesabına aktar</h3>
              <p className="text-xs text-[#A1A1A6] mt-0.5">
                Onaylanan net kazancını aktarım simülasyonu ile banka hesabına gönder.
              </p>
            </div>

            <form onSubmit={handleConfirmTransfer} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A1A1A6]">Aktarılacak tutar (min ₺50)</span>
                  <button
                    type="button"
                    disabled={isTransferring}
                    onClick={() => {
                      setCustomAmount(withdrawableTotal.toFixed(2));
                      setTransferError(null);
                    }}
                    className="text-xs text-[#F5F5F7] underline hover:text-white"
                  >
                    Tümünü çek (₺{withdrawableTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-sm text-[#A1A1A6] font-medium">₺</span>
                  <input
                    type="number"
                    step="0.01"
                    min="50"
                    max={withdrawableTotal}
                    value={customAmount}
                    disabled={isTransferring}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      if (transferError) setTransferError(null);
                    }}
                    required
                    className="w-full bg-[#141416] border border-[#2C2C2E] rounded-2xl pl-8 pr-4 py-3 text-sm font-semibold text-[#F5F5F7] tabular-nums focus:outline-none focus:border-white transition-colors"
                    placeholder="50.00"
                  />
                </div>
                {transferError && (
                  <p className="text-xs text-red-400 mt-1">{transferError}</p>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-[#141416] border border-[#2C2C2E] space-y-1 text-xs">
                <span className="text-[#A1A1A6] block text-[11px]">Hedef banka hesabı</span>
                <p className="font-semibold text-[#F5F5F7]">{bankAccount.bankName} · {bankAccount.accountHolder}</p>
                <p className="text-[#A1A1A6] font-mono text-[11px]">{bankAccount.maskedIban}</p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isTransferring}
                  onClick={() => setIsTransferModalOpen(false)}
                  className="flex-1 py-3 rounded-full bg-[#141416] border border-[#2C2C2E] hover:border-[#3A3A3C] text-xs font-medium text-[#A1A1A6] hover:text-white transition-all disabled:opacity-50"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="flex-1 py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black text-xs font-semibold transition-all shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-75 disabled:cursor-wait"
                >
                  {isTransferring ? (
                    <span className="flex items-center space-x-2">
                      <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                      <span>Aktarılıyor...</span>
                    </span>
                  ) : (
                    <span>Aktarımı onayla</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IBAN Düzenleme Modalı */}
      {isEditIbanModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] p-6 max-w-md w-full space-y-5 border border-[#3A3A3C] rounded-3xl relative shadow-2xl">
            <button
              onClick={() => setIsEditIbanModalOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1A6] hover:text-white font-bold text-sm"
            >
              ✕
            </button>

            <div>
              <h3 className="text-lg font-bold text-[#F5F5F7]">Banka hesabını düzenle</h3>
              <p className="text-xs text-[#A1A1A6] mt-0.5">
                Kazançlarının yatırılacağı vadesiz Türk Lirası hesabını güncelle.
              </p>
            </div>

            <form onSubmit={handleSaveIban} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-[#A1A1A6] block font-medium">Banka Adı</label>
                <input
                  type="text"
                  value={editForm.bankName}
                  onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                  required
                  className="w-full bg-[#141416] border border-[#2C2C2E] rounded-2xl px-4 py-3 text-xs text-[#F5F5F7] focus:outline-none focus:border-white transition-colors"
                  placeholder="Örn: Örnek Banka"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#A1A1A6] block font-medium">Hesap Sahibi Adı Soyadı</label>
                <input
                  type="text"
                  value={editForm.accountHolder}
                  onChange={(e) => setEditForm({ ...editForm, accountHolder: e.target.value })}
                  required
                  className="w-full bg-[#141416] border border-[#2C2C2E] rounded-2xl px-4 py-3 text-xs text-[#F5F5F7] focus:outline-none focus:border-white transition-colors"
                  placeholder="Örn: Örnek Ev Sahibi"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#A1A1A6] block font-medium">IBAN Numarası</label>
                <input
                  type="text"
                  value={editForm.iban}
                  onChange={(e) => setEditForm({ ...editForm, iban: e.target.value })}
                  required
                  className="w-full bg-[#141416] border border-[#2C2C2E] rounded-2xl px-4 py-3 text-xs font-mono text-[#F5F5F7] focus:outline-none focus:border-white transition-colors"
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditIbanModalOpen(false)}
                  className="flex-1 py-3 rounded-full bg-[#141416] border border-[#2C2C2E] hover:border-[#3A3A3C] text-xs font-medium text-[#A1A1A6] hover:text-white transition-all"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black text-xs font-semibold transition-all shadow-sm"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Başarı Bildirimi Toast'u */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[1000] bg-[#1C1C1E] border border-[#30C27C]/40 text-[#F5F5F7] px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 animate-fade-in text-xs">
          <span className="w-2 h-2 rounded-full bg-[#30C27C]"></span>
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-[#A1A1A6] hover:text-white text-xs ml-2">
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

// --- YAPAY ZEKA ROTA PLANLAYICI ---
const AiRoutePlanner = ({ stations, onSelectStationForBooking }) => {
  const [startPoint, setStartPoint] = React.useState('Kadıköy, İstanbul');
  const [endPoint, setEndPoint] = React.useState('Nilüfer, Bursa');
  const [initialBatteryPct, setInitialBatteryPct] = React.useState(35);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [routeResult, setRouteResult] = React.useState(null);

  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [routeResult, isCalculating]);

  const handlePlanRoute = (e) => {
    e.preventDefault();
    setIsCalculating(true);

    setTimeout(() => {
      setIsCalculating(false);
      setRouteResult({
        totalDistanceKm: 155,
        totalTravelTimeHours: '1 sa 45 dk',
        estimatedBatteryUsedKwh: 38.5,
        recommendedStops: [
          {
            stopIndex: 1,
            distanceFromStartKm: 155,
            locationName: 'Bursa Nilüfer AC Şarj Noktası',
            stationObj: stations[1] || stations[0],
            arrivalBatteryPct: 24,
            chargeDurationMins: 45,
            departureBatteryPct: 80,
            cost: 112.00
          }
        ]
      });
    }, 800);
  };

  return (
    <div className="pt-2 pb-16 space-y-8 w-full">
      {/* 1. Başlık */}
      <div className="pt-6 pb-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#F5F5F7] tracking-tight">Rota planlayıcı</h1>
        <p className="text-sm text-[#A1A1A6] mt-1.5">
          Kalkış ve varış noktana göre güzergahındaki en uygun şarj duraklarını listele.
        </p>
      </div>

      {/* 2. Rota Formu */}
      <form onSubmit={handlePlanRoute} className="p-6 rounded-[24px] bg-[#141416] border border-[#2C2C2E] space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[#A1A1A6] block font-medium mb-1.5">Kalkış konumu</label>
            <input
              type="text"
              placeholder="Örn: Kadıköy, İstanbul"
              value={startPoint}
              onChange={(e) => setStartPoint(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#000000] border border-[#2C2C2E] text-xs text-[#F5F5F7] focus:border-[#3A3A3C] outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-[#A1A1A6] block font-medium mb-1.5">Varış konumu</label>
            <input
              type="text"
              placeholder="Örn: Nilüfer, Bursa"
              value={endPoint}
              onChange={(e) => setEndPoint(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#000000] border border-[#2C2C2E] text-xs text-[#F5F5F7] focus:border-[#3A3A3C] outline-none"
            />
          </div>
        </div>

        <div className="border-t border-[#2C2C2E] pt-4 space-y-1.5">
          <div className="flex justify-between text-xs text-[#A1A1A6]">
            <span>Mevcut batarya</span>
            <span className="text-[#F5F5F7] font-medium tabular-nums">%{initialBatteryPct}</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={initialBatteryPct}
            onChange={(e) => setInitialBatteryPct(Number(e.target.value))}
            className="w-full accent-white cursor-pointer"
          />
        </div>

        <button
          type="submit"
          disabled={isCalculating}
          className="w-full py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all shadow-sm"
        >
          {isCalculating ? 'Rota hesaplanıyor...' : 'Rotayı planla'}
        </button>
      </form>

      {/* 3. Rota Sonucu */}
      {routeResult && (
        <div className="p-6 rounded-[24px] bg-[#141416] border border-[#2C2C2E] space-y-5">
          <div className="flex items-center justify-between border-b border-[#2C2C2E] pb-4">
            <div>
              <h3 className="font-semibold text-base text-[#F5F5F7]">{startPoint} → {endPoint}</h3>
              <p className="text-xs text-[#A1A1A6] mt-0.5 tabular-nums">
                {routeResult.totalDistanceKm} km · {routeResult.totalTravelTimeHours}
              </p>
            </div>
            <div className="flex items-center text-xs text-[#A1A1A6]">
              <span>Tahmini tüketim:</span>
              <strong className="text-[#F5F5F7] ml-1 tabular-nums">{routeResult.estimatedBatteryUsedKwh} kWh</strong>
              <InfoTip id="kwh" />
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs text-[#A1A1A6] font-medium block">Önerilen şarj durağı</span>
            {routeResult.recommendedStops.map((stop) => (
              <div
                key={stop.stopIndex}
                className="p-4 rounded-2xl bg-[#000000] border border-[#2C2C2E] flex items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[10px] text-[#A1A1A6] font-semibold">
                      {stop.stopIndex}
                    </span>
                    <h4 className="font-semibold text-sm text-[#F5F5F7]">{stop.locationName}</h4>
                  </div>
                  <p className="text-xs text-[#A1A1A6]">
                    Giriş %{stop.arrivalBatteryPct} → Çıkış %{stop.departureBatteryPct} · {stop.chargeDurationMins} dk şarj
                  </p>
                </div>

                <button
                  onClick={() => onSelectStationForBooking(stop.stationObj)}
                  className="px-5 py-2 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#F5F5F7] border border-[#3A3A3C] font-medium text-xs transition-all whitespace-nowrap"
                >
                  Randevu al
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- SİSTEM MİMARİSİ ---
const SystemArchitecture = () => {
  const [selectedNode, setSelectedNode] = React.useState(ARCHITECTURE_NODES[0]);

  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [selectedNode]);

  return (
    <div className="pt-2 pb-16 space-y-8 max-w-4xl mx-auto">
      {/* 1. Başlık */}
      <div className="pt-6 pb-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#F5F5F7] tracking-tight">Sistem mimarisi</h1>
        <p className="text-sm text-[#A1A1A6] mt-1.5">
          Mikroservisler ve veri akışı altyapısı.
        </p>
      </div>

      <div className="space-y-6">
        {/* Modül Seçim Çipleri */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {ARCHITECTURE_NODES.map((node) => {
            const isSelected = selectedNode.id === node.id;
            return (
              <button
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`px-4 py-2 rounded-full text-xs transition-all whitespace-nowrap font-medium ${
                  isSelected
                    ? 'bg-[#F5F5F7] text-black font-semibold'
                    : 'bg-[#141416] border border-[#2C2C2E] text-[#A1A1A6] hover:text-[#F5F5F7] hover:border-[#3A3A3C]'
                }`}
              >
                {node.title.split(' ')[0]}
              </button>
            );
          })}
        </div>

        {/* Detay Kartı */}
        <div className="p-7 rounded-[24px] bg-[#141416] border border-[#2C2C2E] space-y-4">
          <div className="flex items-center justify-between border-b border-[#2C2C2E] pb-4">
            <div>
              <span className="text-xs text-[#A1A1A6] block">{selectedNode.category}</span>
              <h3 className="text-xl font-bold text-[#F5F5F7] mt-0.5">{selectedNode.title}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#A1A1A6]">
              <i data-lucide={selectedNode.icon} className="w-5 h-5"></i>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#A1A1A6] leading-relaxed">
            {selectedNode.description}
          </p>

          <div className="p-4 rounded-2xl bg-[#000000] border border-[#2C2C2E] text-xs text-[#F5F5F7] space-y-1">
            <span className="text-[#A1A1A6] block text-[11px] font-medium">Teknik Yapılandırma</span>
            <code className="text-xs text-[#F5F5F7] block">{selectedNode.techDetails}</code>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 5 ADIMLI REHBERLİ DEMO TURU BİLEŞENİ ---
const TOUR_STEPS = [
  {
    stepIndex: 1,
    tab: 'map',
    role: 'driver',
    title: 'İstasyon bul',
    description: 'Mahallendeki komşularının müsait duvar tipi şarj cihazlarını haritada veya listede incele. Fiyatlar ve güç değerleri şeffaftır.',
    targetInfo: 'Keşfet'
  },
  {
    stepIndex: 2,
    tab: 'booking',
    role: 'driver',
    title: 'Rezerve et',
    description: 'Geliş saatini ve aracının batarya kapasitesini seç. Fiyat hesaplansın, kesin adres onay sonrası güvenle açılsın.',
    targetInfo: 'Rezervasyon'
  },
  {
    stepIndex: 3,
    tab: 'seans',
    role: 'driver',
    title: 'Canlı şarj',
    description: 'Anlık voltaj, güç ve aktarılan enerjiyi canlı izle. Ev sahibiyle sohbet edebilirsin.',
    targetInfo: 'Canlı şarj'
  },
  {
    stepIndex: 4,
    tab: 'seans-ozeti',
    role: 'host',
    title: 'Seansı onayla',
    description: 'Ev sahibi olarak sürücünün giriş ve çıkış fotoğraflarını ve tüketim dökümünü kontrol et, seansı tek tıkla onayla.',
    targetInfo: 'Seans özeti'
  },
  {
    stepIndex: 5,
    tab: 'host-payouts',
    role: 'host',
    title: 'Kazancı gör',
    description: 'Net seans kazancı anında çekilebilir bakiyeye yansır. Banka transferleri ve seans dökümü tek defterden izlenir.',
    targetInfo: 'Kazançlar'
  }
];

const GuidedTourOverlay = ({ currentStep, onNext, onClose, totalSteps, activeTab, userRole, onResumeTour }) => {
  if (currentStep === null || currentStep === undefined) return null;
  const stepData = TOUR_STEPS[currentStep];
  if (!stepData) return null;
  const isLast = currentStep === totalSteps - 1;
  const isOffPage = (activeTab !== stepData.tab || userRole !== stepData.role);

  if (isOffPage) {
    return (
      <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-[1200] pointer-events-auto">
        <div className="bg-[#1C1C1E]/95 backdrop-blur-xl border border-[#3A3A3C] px-3.5 py-2.5 rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.85)] flex items-center space-x-2.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#30C27C] animate-pulse"></span>
          <button
            onClick={onResumeTour}
            className="font-semibold text-[#F5F5F7] hover:text-white transition-colors cursor-pointer flex items-center space-x-1"
          >
            <span>Turu sürdür</span>
            <span className="text-[#A1A1A6] font-normal">({stepData.stepIndex}/{totalSteps} · {stepData.targetInfo})</span>
          </button>
          <button
            onClick={onClose}
            aria-label="Turu kapat"
            className="text-[#A1A1A6] hover:text-white transition-colors ml-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 sm:bottom-6 left-0 sm:left-auto right-0 sm:right-6 z-[1200] max-w-sm w-full sm:w-[calc(100vw-3rem)] p-3 sm:p-0 pointer-events-auto">
      <div className="bg-[#1C1C1E]/95 backdrop-blur-xl border border-[#3A3A3C] p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#30C27C] animate-pulse"></span>
            <span className="text-[11px] font-semibold text-[#30C27C]">
              Rehberli tur · {stepData.stepIndex} / {totalSteps}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[11px] text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors cursor-pointer px-2 py-0.5 rounded-full hover:bg-[#2C2C2E]"
          >
            Turu kapat ✕
          </button>
        </div>

        <div>
          <h4 className="font-bold text-sm text-[#F5F5F7]">
            {stepData.title}
          </h4>
          <p className="text-xs text-[#A1A1A6] mt-1 leading-relaxed">
            {stepData.description}
          </p>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#2C2C2E]/60">
          <span className="text-[10px] text-[#77777A] font-medium">
            {stepData.targetInfo}
          </span>
          <button
            onClick={onNext}
            className="px-4 py-2 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
          >
            <span>{isLast ? 'Turu bitir' : 'İleri'}</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- KULLANICI GİRİŞ VE KAYIT MODALI (BACKEND ENTEGRASYONU) ---
// Kural: window.API_BASE_URL tanımlı değilse ve sayfa localhost/127.0.0.1 üzerinde açılmamışsa backend devre dışı sayılır.
const isLocalhostHost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]'
);
const CONFIGURED_API_URL = typeof window !== 'undefined' && window.API_BASE_URL
  ? window.API_BASE_URL
  : (isLocalhostHost ? 'http://localhost:8000' : null);

const AuthModal = ({ isOpen, onClose, onAuthSuccess, initialRole = 'driver' }) => {
  if (!isOpen) return null;
  const isBackendActive = Boolean(CONFIGURED_API_URL);
  const [tab, setTab] = React.useState('login'); // 'login' | 'register'
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [role, setRole] = React.useState(initialRole);
  const [phone, setPhone] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [backendStatus, setBackendStatus] = React.useState(isBackendActive ? 'checking' : 'offline');

  // Sunucu erişilebilirlik kontrolü: Yalnızca API adresi geçerliyse istek atılır
  React.useEffect(() => {
    if (!isBackendActive || !CONFIGURED_API_URL) {
      setBackendStatus('offline');
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);

    fetch(`${CONFIGURED_API_URL}/api/health`, {
      signal: controller.signal,
      credentials: 'include'
    })
      .then((res) => {
        if (res.ok) {
          if (isMounted) setBackendStatus('online');
        } else {
          if (isMounted) setBackendStatus('offline');
        }
      })
      .catch(() => {
        if (isMounted) setBackendStatus('offline');
      })
      .finally(() => {
        clearTimeout(timer);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [isBackendActive]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isBackendActive || !CONFIGURED_API_URL) {
      setBackendStatus('offline');
      setError('Bu demo sürümde hesap oluşturma kapalı. Demo profiliyle gezebilirsin.');
      return;
    }

    setLoading(true);
    const endpoint = tab === 'login' ? `${CONFIGURED_API_URL}/api/login` : `${CONFIGURED_API_URL}/api/register`;
    const payload = tab === 'login'
      ? { email, password }
      : { email, password, full_name: fullName, role, phone };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'chargerent'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'İşlem başarısız oldu.');
      } else {
        onAuthSuccess(data.user);
        onClose();
      }
    } catch (err) {
      setBackendStatus('offline');
      setError('Bu demo sürümde hesap oluşturma kapalı. Demo profiliyle gezebilirsin.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoRole = 'host') => {
    setError('');
    const demoEmail = demoRole === 'host' ? 'ornek.evsahibi@example.com' : 'ornek.surucu@example.com';
    const demoName = demoRole === 'host' ? 'Örnek Ev Sahibi' : 'Örnek Sürücü';

    if (!isBackendActive || !CONFIGURED_API_URL) {
      // Backend kapalıysa / statik moddaysa doğrudan yerel demo profiline geç
      onAuthSuccess({ email: demoEmail, full_name: demoName, role: demoRole });
      onClose();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${CONFIGURED_API_URL}/api/demo-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'chargerent'
        },
        credentials: 'include',
        body: JSON.stringify({ role: demoRole })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onAuthSuccess(data.user);
        onClose();
      } else {
        // Fallback demo oturumu
        onAuthSuccess({ email: demoEmail, full_name: demoName, role: demoRole });
        onClose();
      }
    } catch (err) {
      // Çevrimdışı / statik modda doğrudan demo girişi sağla
      onAuthSuccess({ email: demoEmail, full_name: demoName, role: demoRole });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1C1C1E] p-6 max-w-sm w-full space-y-4 border border-[#3A3A3C] rounded-2xl relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A1A1A6] hover:text-white font-bold text-sm cursor-pointer"
        >
          ✕
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#30C27C]/10 border border-[#30C27C]/30 text-[#30C27C] text-[11px] font-medium">
            <LucideIcon name="shield-check" className="w-3.5 h-3.5" />
            <span>ChargeRent Hesabı</span>
          </div>
          <h3 className="font-bold text-base text-[#F5F5F7]">
            {backendStatus === 'offline'
              ? 'Demo Modu'
              : (tab === 'login' ? 'Giriş Yap' : 'Yeni Hesap Oluştur')}
          </h3>
          <p className="text-xs text-[#A1A1A6]">
            {backendStatus === 'offline'
              ? 'Statik ortamda demo profiliyle platformu test edin.'
              : (tab === 'login' ? 'Kayıtlı hesabınla oturum aç ve istasyonları yönet.' : 'Sürücü veya ev sahibi olarak katıl.')}
          </p>
        </div>

        {/* Backend Ulaşılamazsa (Çevrimdışı / Statik Ortam) */}
        {backendStatus === 'offline' ? (
          <div className="space-y-4 pt-1">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs space-y-1.5">
              <div className="flex items-center space-x-2 font-semibold">
                <span>⚡</span>
                <span>Statik Demo Sürümü</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Bu demo sürümde hesap oluşturma kapalı. Demo profiliyle gezebilirsin.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('host')}
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#30C27C] hover:bg-[#28a768] text-black font-semibold text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>🏠 Örnek Ev Sahibi Olarak Gez</span>
                <span>→</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('driver')}
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#141416] hover:bg-[#202024] border border-[#2C2C2E] text-[#F5F5F7] font-semibold text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>⚡ Örnek Sürücü Olarak Gez</span>
                <span>→</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Seçimi */}
            <div className="grid grid-cols-2 p-1 bg-[#141416] rounded-xl border border-[#2C2C2E] text-xs font-medium">
              <button
                type="button"
                onClick={() => { setTab('login'); setError(''); }}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${tab === 'login' ? 'bg-[#2C2C2E] text-[#F5F5F7] shadow-sm font-semibold' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'}`}
              >
                Giriş Yap
              </button>
              <button
                type="button"
                onClick={() => { setTab('register'); setError(''); }}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${tab === 'register' ? 'bg-[#2C2C2E] text-[#F5F5F7] shadow-sm font-semibold' : 'text-[#A1A1A6] hover:text-[#F5F5F7]'}`}
              >
                Kayıt Ol
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              {tab === 'register' && (
                <div>
                  <label className="text-[11px] text-[#A1A1A6] block mb-1">Ad Soyad</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Örn: Ahmet Yılmaz"
                    className="w-full p-2.5 rounded-xl bg-[#141416] border border-[#2C2C2E] text-xs text-[#F5F5F7] focus:border-[#30C27C] outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] text-[#A1A1A6] block mb-1">E-posta</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ad@ornek.com"
                  className="w-full p-2.5 rounded-xl bg-[#141416] border border-[#2C2C2E] text-xs text-[#F5F5F7] focus:border-[#30C27C] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#A1A1A6] block mb-1">Şifre</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 rounded-xl bg-[#141416] border border-[#2C2C2E] text-xs text-[#F5F5F7] focus:border-[#30C27C] outline-none"
                />
                {tab === 'register' && (
                  <p className="text-[10px] text-amber-400/90 mt-1.5 flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>Şifreni başka bir hesapta kullandığın şifreyle aynı yapma.</span>
                  </p>
                )}
              </div>

              {tab === 'register' && (
                <div>
                  <label className="text-[11px] text-[#A1A1A6] block mb-1">Rol</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('driver')}
                      className={`p-2 rounded-xl border text-xs text-left cursor-pointer transition-all ${role === 'driver' ? 'border-[#30C27C] bg-[#30C27C]/10 text-[#30C27C] font-semibold' : 'border-[#2C2C2E] bg-[#141416] text-[#A1A1A6]'}`}
                    >
                      ⚡ Sürücü
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('host')}
                      className={`p-2 rounded-xl border text-xs text-left cursor-pointer transition-all ${role === 'host' ? 'border-[#30C27C] bg-[#30C27C]/10 text-[#30C27C] font-semibold' : 'border-[#2C2C2E] bg-[#141416] text-[#A1A1A6]'}`}
                    >
                      🏠 Ev Sahibi
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all shadow-sm cursor-pointer mt-2 disabled:opacity-50"
              >
                {loading ? 'Lütfen bekleyin...' : (tab === 'login' ? 'Giriş Yap' : 'Kayıt Ol')}
              </button>

              {tab === 'register' && (
                <p className="text-[10px] text-[#71717A] text-center mt-2 leading-relaxed">
                  Şifren geri döndürülemez biçimde özetlenerek saklanır.
                </p>
              )}
            </form>

            {tab === 'login' && (
              <div className="pt-2 border-t border-[#2C2C2E]/60 space-y-1.5">
                <span className="text-[10px] text-[#77777A] block text-center">Veya tek tıkla demo hesabıyla gir:</span>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('host')}
                  disabled={loading}
                  className="w-full p-2.5 rounded-xl bg-[#141416] hover:bg-[#202024] border border-[#2C2C2E] text-left transition-all flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="font-semibold text-xs text-[#F5F5F7] block">Örnek Ev Sahibi ile Gir</span>
                    <span className="text-[10px] text-[#A1A1A6]">ornek.evsahibi@example.com · Süper ev sahibi</span>
                  </div>
                  <span className="text-xs text-[#30C27C] font-medium">Giriş →</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('driver')}
                  disabled={loading}
                  className="w-full p-2.5 rounded-xl bg-[#141416] hover:bg-[#202024] border border-[#2C2C2E] text-left transition-all flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="font-semibold text-xs text-[#F5F5F7] block">Örnek Sürücü ile Gir</span>
                    <span className="text-[10px] text-[#A1A1A6]">ornek.surucu@example.com · Elektrikli araç sürücüsü</span>
                  </div>
                  <span className="text-xs text-[#30C27C] font-medium">Giriş →</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// --- EV SAHİBİ GELİR HESAPLAYICI MODALI ---
const EarningsCalculatorModal = ({ isOpen, onClose, onBecomeHost }) => {
  if (!isOpen) return null;

  const [powerKw, setPowerKw] = React.useState(11);
  const [weeklySessions, setWeeklySessions] = React.useState(4);
  const [pricePerKwh, setPricePerKwh] = React.useState(7.0);

  const avgKwh = 33;
  const monthlySessions = Math.round(weeklySessions * (52 / 12));
  const monthlyEnergyKwh = monthlySessions * avgKwh;
  const monthlyGross = monthlyEnergyKwh * pricePerKwh;
  const monthlyNet = Math.round(monthlyGross * 0.85);
  const monthlySuperHostNet = Math.round(monthlyGross * 0.90);
  const yearlyNet = monthlyNet * 12;

  return (
    <div className="fixed inset-0 z-[1100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1C1C1E] p-6 sm:p-7 max-w-lg w-full space-y-6 border border-[#3A3A3C] rounded-3xl relative max-h-[90vh] overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#A1A1A6] hover:text-white font-bold text-sm"
        >
          ✕
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#30C27C]/10 border border-[#30C27C]/30 text-[#30C27C] text-[11px] font-medium">
            <LucideIcon name="calculator" className="w-3.5 h-3.5" />
            <span>Ev sahibi gelir hesaplayıcı</span>
          </div>
          <h3 className="font-bold text-lg sm:text-xl text-[#F5F5F7]">
            Şarj cihazının aylık potansiyeli
          </h3>
          <p className="text-xs text-[#A1A1A6] leading-relaxed">
            Boş duran duvar şarj cihazını komşularınla paylaşarak elde edebileceğin net kazancı hesapla.
          </p>
        </div>

        {/* Girdiler */}
        <div className="space-y-4 bg-[#141416] p-4.5 rounded-2xl border border-[#2C2C2E]">
          {/* Haftalık Seans Sayısı */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#A1A1A6] font-medium">Haftalık paylaşım seansı:</span>
              <span className="text-[#F5F5F7] font-bold">{weeklySessions} seans / hafta ({monthlySessions} seans / ay)</span>
            </div>
            <input
              type="range"
              min="1"
              max="14"
              value={weeklySessions}
              onChange={(e) => setWeeklySessions(Number(e.target.value))}
              className="w-full accent-[#30C27C] bg-[#2C2C2E] h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#77777A]">
              <span>1 seans</span>
              <span>4 seans</span>
              <span>14 seans</span>
            </div>
          </div>

          {/* kWh Başına Fiyat */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-xs">
              <span className="text-[#A1A1A6] font-medium">Birim satış fiyatı:</span>
              <span className="text-[#30C27C] font-bold tabular-nums">₺{pricePerKwh.toFixed(2).replace('.', ',')} / kWh</span>
            </div>
            <input
              type="range"
              min="5"
              max="10"
              step="0.25"
              value={pricePerKwh}
              onChange={(e) => setPricePerKwh(Number(e.target.value))}
              className="w-full accent-[#30C27C] bg-[#2C2C2E] h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#77777A]">
              <span>₺5,00</span>
              <span>₺7,00</span>
              <span>₺10,00</span>
            </div>
          </div>

          {/* Tek satır varsayım */}
          <div className="pt-1 text-[11px] text-[#A1A1A6] border-t border-[#2C2C2E]/60">
            Varsayım: seans başına ~33 kWh
          </div>
        </div>

        {/* Sonuç Kartı */}
        <div className="bg-[#000000] p-5 rounded-2xl border border-[#2C2C2E] space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs text-[#A1A1A6] block">Tahmini aylık gelir (komisyon sonrası, elektrik maliyeti hariç)</span>
              <span className="text-2xl sm:text-3xl font-bold text-[#F5F5F7] tabular-nums mt-0.5 block tracking-tight">
                ₺{monthlyNet.toLocaleString('tr-TR')}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#A1A1A6] block">Yıllık potansiyel</span>
              <span className="text-sm font-semibold text-[#30C27C] tabular-nums mt-0.5 block">
                ₺{yearlyNet.toLocaleString('tr-TR')}
              </span>
            </div>
          </div>

          {/* Tek satır Süper ev sahibi potansiyeli */}
          <div className="pt-2 border-t border-[#2C2C2E]/80 text-[11px] text-[#A1A1A6] flex items-center justify-between">
            <span>Süper ev sahibi olursan (%10 komisyon): ₺{monthlySuperHostNet.toLocaleString('tr-TR')}</span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <button
            onClick={() => {
              onClose();
              if (onBecomeHost) onBecomeHost();
            }}
            className="w-full py-3.5 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all cursor-pointer shadow-sm"
          >
            Ev sahibi ol ve istasyon ekle
          </button>
          <p className="text-[11px] text-[#77777A] text-center">
            Hesaplama simülasyondur; elektrik maliyeti ve tarife saatine göre kazanç değişkenlik gösterebilir.
          </p>
        </div>
      </div>
    </div>
  );
};

// --- ANA UYGULAMA CONTAINER ---
function App() {
  const [activeTab, setActiveTab] = React.useState('map');
  const [userRole, setUserRole] = React.useState('driver'); // 'driver' | 'host'
  const [stations, setStations] = React.useState(getInitialStoredStations);
  const [selectedStation, setSelectedStation] = React.useState(INITIAL_STATIONS[0]);
  const [activeSession, setActiveSession] = React.useState(null);
  const [availability, setAvailability] = React.useState(getStoredAvailability);
  const [selectedScheduleStationId, setSelectedScheduleStationId] = React.useState('st-01');
  const [availabilityVersion, setAvailabilityVersion] = React.useState(0);
  const notifyAvailabilityChanged = () => setAvailabilityVersion(v => v + 1);

  // Kural 2: Eklenen ve güncellenen istasyonlar localStorage'da saklanır
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATIONS, JSON.stringify(stations));
    } catch (e) {
      console.error('Failed to save stations to localStorage:', e);
    }
  }, [stations]);

  // Kural 1: İstasyon doğrulamasını simüle etme fonksiyonu
  const handleSimulateVerify = (stationId) => {
    setStations(prev => {
      const updated = prev.map(s => {
        if (s.id === stationId) {
          return {
            ...s,
            status: 'approved',
            isPendingVerification: false,
            isAvailable: true,
            statusText: 'Bugün müsait'
          };
        }
        return s;
      });
      try {
        localStorage.setItem(STORAGE_KEY_STATIONS, JSON.stringify(updated));
      } catch (e) {
        console.error('Kayıt hatası:', e);
      }
      return updated;
    });
    notifyAvailabilityChanged();
  };

  const handleStationAdded = (newSt) => {
    setStations(prev => {
      const updated = [newSt, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_STATIONS, JSON.stringify(updated));
      } catch (e) {
        console.error('İstasyon kaydedilemedi (localStorage kotası):', e);
        throw e;
      }
      return updated;
    });
    notifyAvailabilityChanged();
  };

  // Kural 2: /istasyonlarim/:id/takvim URL senkronizasyonu ve doğrudan Host/Sekme hash routing
  React.useEffect(() => {
    const handleUrlSync = () => {
      const hash = window.location.hash || '';
      const path = window.location.pathname || '';
      const search = window.location.search || '';
      const match = hash.match(/#\/?istasyonlarim\/([a-zA-Z0-9_-]+)\/takvim/) ||
                    path.match(/\/istasyonlarim\/([a-zA-Z0-9_-]+)\/takvim/);
      if (match && match[1]) {
        setSelectedScheduleStationId(match[1]);
        setUserRole('host');
        setActiveTab('host-schedule');
      } else if (hash.includes('host') || search.includes('role=host') || search.includes('tab=host')) {
        setUserRole('host');
        if (hash.includes('host-stations') || search.includes('tab=host-stations')) {
          setActiveTab('host-stations');
        } else if (hash.includes('host-payouts') || search.includes('tab=host-payouts')) {
          setActiveTab('host-payouts');
        } else if (hash.includes('host-reservations') || search.includes('tab=host-reservations')) {
          setActiveTab('host-reservations');
        } else if (hash.includes('host-add-station') || search.includes('tab=host-add-station')) {
          setActiveTab('host-add-station');
        } else {
          setActiveTab('host');
        }
      } else if (hash.includes('seans') || search.includes('tab=seans')) {
        setUserRole('driver');
        setActiveTab('seans');
      }
    };
    handleUrlSync();
    window.addEventListener('hashchange', handleUrlSync);
    window.addEventListener('popstate', handleUrlSync);
    return () => {
      window.removeEventListener('hashchange', handleUrlSync);
      window.removeEventListener('popstate', handleUrlSync);
    };
  }, []);

  const handleOpenScheduleForStation = (st) => {
    setSelectedScheduleStationId(st.id);
    setUserRole('host');
    setActiveTab('host-schedule');
    window.location.hash = `#/istasyonlarim/${st.id}/takvim`;
  };

  const handleBackFromSchedule = () => {
    setActiveTab('host-stations');
    if (window.location.hash.includes('/takvim')) {
      window.location.hash = '';
    }
  };

  // Tek merkezli rezervasyonlar ve seans geçmişi state'i ("şimdi"ye göre taze üretilir)
  const [reservations, setReservations] = React.useState(() => createRelativeReservations(new Date()));
  const [selectedReservation, setSelectedReservation] = React.useState(() => createRelativeReservations(new Date())[0]);
  const [beklemeLocation, setBeklemeLocation] = React.useState('Üsküdar');

  // Tek merkezli finansal kayıt defteri state'i ("şimdi"ye göre taze üretilir)
  const [payoutTransfers, setPayoutTransfers] = React.useState(() => createRelativePayoutTransfers(new Date()));
  const [bankAccount, setBankAccount] = React.useState(INITIAL_BANK_ACCOUNT);
  const [baseWithdrawable, setBaseWithdrawable] = React.useState(1650.00);

  // Gün değişimi kontrolü: Tarih değiştiğinde eski demo verisi yenilenir
  React.useEffect(() => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const storedDate = localStorage.getItem('chargerent_data_date');
      if (storedDate !== todayStr) {
        localStorage.setItem('chargerent_data_date', todayStr);
        setReservations(createRelativeReservations(new Date()));
        setPayoutTransfers(createRelativePayoutTransfers(new Date()));
      }
    } catch (e) {}
  }, []);

  // Müsaitlik durumunu her istasyonun kendi takvimine göre anlık yansıt
  const liveStations = React.useMemo(() => {
    return stations.map((st) => {
      const isPending = st.status === 'pending_verification' || st.isPendingVerification;
      const stAvail = getStoredAvailabilityForStation(st.id);
      const isStationOpen = isPending ? false : (stAvail?.isStationOpen ?? true);

      let statusText = st.statusText || 'Bugün müsait';
      if (isPending) {
        statusText = 'Doğrulama aşamasında';
      } else if (!isStationOpen) {
        statusText = 'Şu an kapalı (Ev sahibi kapattı)';
      } else if (st.id === 'st-01') {
        statusText = 'Bugün 14:00 sonrası müsait';
      }

      return {
        ...st,
        isAvailable: isStationOpen,
        statusText
      };
    });
  }, [stations, availabilityVersion]);

  // Aşama 2: Kademeli Sadakat & Para Puan State'i
  const [driverStats, setDriverStats] = React.useState({
    completedCharges: 18, // 18 şarj = Altın Sürücü Kademe
    rewardPointsBalance: 45.0, // ₺45.00 Para Puan Bakiyesi
    totalKwhCharged: 420.5
  });
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = React.useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = React.useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(() => {
    try {
      const saved = localStorage.getItem('chargerent_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Kural: Açılışta eski localStorage/sessionStorage belirteç kaydı varsa sil (Yalnızca httpOnly çerez kullanılır)
  React.useEffect(() => {
    try {
      localStorage.removeItem('chargerent_auth_token');
      sessionStorage.removeItem('chargerent_auth_token');
    } catch (e) {
      // ignore
    }
  }, []);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.removeItem('chargerent_auth_token');
      sessionStorage.removeItem('chargerent_auth_token');
      if (user) {
        localStorage.setItem('chargerent_user', JSON.stringify(user));
      }
    } catch (e) {
      // ignore
    }
    if (user && user.role === 'host') {
      setUserRole('host');
      setActiveTab('host');
    } else {
      setUserRole('driver');
      setActiveTab('map');
    }
  };

  const handleLogout = async () => {
    try {
      if (CONFIGURED_API_URL) {
        await fetch(`${CONFIGURED_API_URL}/api/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'chargerent'
          }
        });
      }
    } catch (e) {
      // ignore network errors
    }
    try {
      localStorage.removeItem('chargerent_user');
      localStorage.removeItem('chargerent_auth_token');
      sessionStorage.removeItem('chargerent_auth_token');
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
  };
  const [isEarningsModalOpen, setIsEarningsModalOpen] = React.useState(false);
  const [demoPageNotice, setDemoPageNotice] = React.useState(null);
  const [tourStep, setTourStep] = React.useState(null);

  const handleStartTour = () => {
    setTourStep(0);
    setUserRole(TOUR_STEPS[0].role);
    setActiveTab(TOUR_STEPS[0].tab);
  };

  const handleNextTourStep = () => {
    if (tourStep === null) return;
    if (tourStep < TOUR_STEPS.length - 1) {
      const next = tourStep + 1;
      setTourStep(next);
      const stepData = TOUR_STEPS[next];
      setUserRole(stepData.role);
      setActiveTab(stepData.tab);
      if (stepData.tab === 'booking') {
        setSelectedStation(liveStations[0]);
      } else if (stepData.tab === 'seans') {
        setActiveSession(liveStations[0]);
      } else if (stepData.tab === 'seans-ozeti') {
        setSelectedReservation(reservations[0]);
      }
    } else {
      setTourStep(null);
      setUserRole('driver');
      setActiveTab('map');
      try {
        sessionStorage.setItem('chargerent_tour_completed', 'true');
      } catch (e) {}
    }
  };

  const handleCloseTour = () => {
    setTourStep(null);
    try {
      sessionStorage.setItem('chargerent_tour_completed', 'true');
    } catch (e) {}
  };

  const handleResumeTour = () => {
    if (tourStep === null) return;
    const stepData = TOUR_STEPS[tourStep];
    if (!stepData) return;
    setUserRole(stepData.role);
    setActiveTab(stepData.tab);
    if (stepData.tab === 'booking') {
      setSelectedStation(liveStations[0]);
    } else if (stepData.tab === 'seans') {
      setActiveSession(liveStations[0]);
    } else if (stepData.tab === 'seans-ozeti') {
      setSelectedReservation(reservations[0]);
    }
  };

  const handleLogoClick = () => {
    setActiveTab(userRole === 'driver' ? 'map' : 'host');
    setIsLoyaltyModalOpen(false);
    setIsHowItWorksOpen(false);
    setIsLoginModalOpen(false);
    setIsEarningsModalOpen(false);
    setDemoPageNotice(null);
    setTourStep(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.location.hash) {
      window.location.hash = '';
    }
    try {
      window.history.replaceState(null, '', window.location.pathname + (window.location.search ? window.location.search : ''));
    } catch (e) {}
  };

  React.useEffect(() => {
    const handleSwitch = (e) => {
      if (e.detail) setActiveTab(e.detail);
    };
    window.addEventListener('switch-tab', handleSwitch);
    return () => window.removeEventListener('switch-tab', handleSwitch);
  }, []);

  React.useEffect(() => {
    if (tourStep !== null) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [tourStep]);

  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [activeTab, activeSession, userRole, isLoyaltyModalOpen, isHowItWorksOpen, isLoginModalOpen, availability, reservations, selectedReservation]);

  const handleBookClick = (st) => {
    setSelectedStation(st);
    setActiveTab('booking');
  };

  const handleStartChargingClick = (st) => {
    setActiveSession(st || liveStations[0]);
    setActiveTab('seans');
  };

  const handleStopCharging = () => {
    setActiveSession(null);
  };

  const handleAddNewStation = (newSt) => {
    setStations((prev) => [newSt, ...prev]);
  };

  // Sürücü seansı bitirdiğinde tek merkezli seans kaydı oluştur
  const handleFinishDriverSession = (sessionData, goToHostSummary = false) => {
    const hostStation = liveStations.find(s => s.id === sessionData.stationId) || liveStations[0];
    const hostCommRate = getHostCommissionRate(hostStation); // Süper Ev Sahibi %10, Standart %15
    const commAmount = Number((sessionData.subtotal * hostCommRate).toFixed(2));
    const netEarnings = Number((sessionData.subtotal - commAmount).toFixed(2));

    const now = new Date();
    const endStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const startMinsAgo = new Date(now.getTime() - sessionData.durationMinutes * 60000);
    const startStr = startMinsAgo.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const newRecord = {
      id: `ses-${Date.now()}`,
      stationId: sessionData.stationId,
      stationName: sessionData.stationName,
      carModel: sessionData.carModel,
      driverName: 'Örnek Sürücü',
      driverTier: getDriverTier(driverStats?.completedCharges ?? 18),
      dateStr: now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
      timeRangeStr: `${startStr} – ${endStr}`,
      durationMinutes: sessionData.durationMinutes,
      energyKwh: sessionData.energyKwh,
      unitPrice: sessionData.unitPrice,
      tariffLabel: 'gece tarifesi, ×0,75',
      subtotal: sessionData.subtotal,
      commissionRate: hostCommRate,
      commissionAmount: commAmount,
      netHostEarnings: netEarnings,
      status: 'pending_approval',
      endReason: sessionData.endReason || 'normal',
      photos: {
        arrival: {
          url: '/public/images/socket-arrival.svg',
          timestamp: startStr
        },
        departure: {
          url: '/public/images/socket-departure.svg',
          timestamp: endStr
        }
      },
      autoApprovalRemaining: '47 sa 59 dk',
      disputeReason: null,
      disputeNote: null
    };

    setReservations(prev => [newRecord, ...prev]);
    setSelectedReservation(newRecord);
    setActiveSession(null);

    if (goToHostSummary) {
      setUserRole('host');
      setActiveTab('seans-ozeti');
    } else {
      setActiveTab('map');
    }
  };

  const handleApproveSession = (sessionId) => {
    setReservations(prev => prev.map(item => {
      if (item.id === sessionId) {
        const updated = { ...item, status: 'approved' };
        if (selectedReservation?.id === sessionId) setSelectedReservation(updated);
        return updated;
      }
      return item;
    }));
  };

  const handleDisputeSession = (sessionId, reason, note) => {
    setReservations(prev => prev.map(item => {
      if (item.id === sessionId) {
        const updated = { ...item, status: 'disputed', disputeReason: reason, disputeNote: note };
        if (selectedReservation?.id === sessionId) setSelectedReservation(updated);
        return updated;
      }
      return item;
    }));
  };

  // Ev Sahibi Komisyon Oranı (Süper Ev Sahibi: %10, Standart: %15)
  const hostStation = liveStations[0] || stations[0];
  const hostCommissionRate = getHostCommissionRate(hostStation);

  // TEK SEANS KAYIT DEFTERİ HESAPLAMALARI (Tüm ekranlar için tek gerçek kaynak):
  // 1. Toplam aktarılan (Tamamlanan banka transferlerinin toplamı)
  const transferredTotal = React.useMemo(() => {
    return Number(payoutTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0).toFixed(2));
  }, [payoutTransfers]);

  // 2. Onaylanmış seansların net kazanç toplamı
  const approvedSessionsNet = React.useMemo(() => {
    return Number(reservations
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + (Number(r.netHostEarnings) || 0), 0).toFixed(2));
  }, [reservations]);

  // 3. Çekilebilir bakiye = Taban çekilebilir + Onaylanan seans kazançları
  const withdrawableTotal = React.useMemo(() => {
    return Number((baseWithdrawable + approvedSessionsNet).toFixed(2));
  }, [baseWithdrawable, approvedSessionsNet]);

  // 4. Bekleyen bakiye = Onay veya inceleme bekleyen seanslar (pending_approval + disputed)
  const pendingTotal = React.useMemo(() => {
    return Number(reservations
      .filter((r) => r.status === 'pending_approval' || r.status === 'disputed')
      .reduce((sum, r) => sum + (Number(r.netHostEarnings) || 0), 0).toFixed(2));
  }, [reservations]);

  // 5. Net Kazanç = Aktarılan + Çekilebilir + Bekleyen (Her ekranda tutarlı tek toplam)
  const netTotal = React.useMemo(() => {
    return Number((transferredTotal + withdrawableTotal + pendingTotal).toFixed(2));
  }, [transferredTotal, withdrawableTotal, pendingTotal]);

  // 6. Toplam Ciro (Brüt) = Net Kazanç / (1 - Komisyon Oranı)
  const grossTotal = React.useMemo(() => {
    return Number((netTotal / (1 - hostCommissionRate)).toFixed(2));
  }, [netTotal, hostCommissionRate]);

  // 7. Toplam Platform Komisyonu
  const commissionTotal = React.useMemo(() => {
    return Number((grossTotal - netTotal).toFixed(2));
  }, [grossTotal, netTotal]);

  // 8. İstatistiksel toplamlar
  // Kural 4: Ortalama birim fiyat (grossTotal / totalKwhShared) ~₺7,00 (6,9 - 7,1 aralığı)
  const totalKwhShared = React.useMemo(() => {
    const historicalKwh = 1713.8;
    const additionalKwh = reservations
      .filter((r) => r.id.startsWith('ses-') && !['ses-101', 'ses-102', 'ses-103'].includes(r.id))
      .reduce((sum, r) => sum + (Number(r.energyKwh) || 0), 0);
    return Number((historicalKwh + additionalKwh).toFixed(1));
  }, [reservations]);

  const totalCompletedSessions = React.useMemo(() => {
    const historicalCount = 184;
    const additionalCount = reservations
      .filter((r) => r.id.startsWith('ses-') && !['ses-101', 'ses-102', 'ses-103'].includes(r.id) && ['approved', 'paid'].includes(r.status))
      .length;
    return historicalCount + additionalCount;
  }, [reservations]);

  // 9. Çekim İşlemi Gerçekleştirme (Tek kayıt defterinden bakiye düşüşü ve transfer kaydı)
  const handleExecutePayoutTransfer = (newTransfer) => {
    setPayoutTransfers((prev) => [newTransfer, ...prev]);
    const amount = Number(newTransfer.amount) || 0;
    setBaseWithdrawable((prevBase) => {
      const currentApproved = reservations.filter((r) => r.status === 'approved').reduce((sum, r) => sum + (Number(r.netHostEarnings) || 0), 0);
      if (currentApproved > 0) {
        setReservations((resList) => resList.map((r) => r.status === 'approved' ? { ...r, status: 'paid' } : r));
        return Math.max(0, Number((prevBase + currentApproved - amount).toFixed(2)));
      }
      return Math.max(0, Number((prevBase - amount).toFixed(2)));
    });
  };

  // 10. Geliştirici çubuğu ve sekmeleri yalnızca localhost / 127.0.0.1 ve ?dev=1 (veya #dev=1) varken görünür
  const isLocalHost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '::1' ||
    window.location.hostname === ''
  );
  const isDevMode = typeof window !== 'undefined' && isLocalHost && (
    window.location.search.includes('dev=1') ||
    window.location.hash.includes('dev=1')
  );

  return (
    <div className="min-h-screen bg-[#000000] text-[#F5F5F7] flex flex-col justify-between selection:bg-white selection:text-black">
      <div>
        {/* Kural 7: En Üstteki Tek İnce Demo Uyarısı Şeridi (Genel bakış ve Rezervasyonlar için tek cümle) */}
        <div className="w-full bg-[#000000] border-b border-[#2C2C2E]/60 py-2.5 px-4 text-center text-[11px] text-[#A1A1A6] font-normal tracking-wide">
          {activeTab === 'host' || activeTab === 'host-reservations' || activeTab === 'seans-ozeti' || activeTab === 'host-stations' || activeTab === 'host-add-station'
            ? 'Demo sürüm. Rakamlar örnek veridir.'
            : activeTab === 'host-payouts'
            ? 'Demo sürüm. Ödeme ve banka transferleri simüle edilir.'
            : activeTab === 'host-schedule'
            ? 'Demo sürüm. Ayarlar yalnızca bu tarayıcıda saklanır.'
            : activeTab === 'seans'
            ? 'Demo sürüm. Ölçüm, ödeme ve bildirimler simüle edilir.'
            : activeTab === 'bekleme'
            ? 'Demo sürüm. Bildirimler simüle edilir.'
            : 'Demo sürüm. Ekrandaki ilanlar ve fiyatlar örnek veridir; doğal dil arama, ödeme ve cihaz bağlantısı simüledir.'}
        </div>

        {/* Ana Gezinme Barı */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={userRole}
          setUserRole={setUserRole}
          onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          activeSession={activeSession}
          onStartTour={handleStartTour}
          onLogoClick={handleLogoClick}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Kural 6: Ana İçerik ve Header aynı taşıyıcıda (max-w-[1280px] px-4 sm:px-6 lg:px-12) */}
        <main className={`max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-12 ${tourStep !== null ? 'pb-72' : 'pb-28 lg:pb-12'}`}>
          {activeTab === 'map' && (
            <StationMap
              stations={liveStations}
              setSelectedStation={setSelectedStation}
              onBookClick={handleBookClick}
              onStartChargingClick={handleStartChargingClick}
              onNavigateToSimdi={() => setActiveTab('simdi')}
              onNavigateToBekleme={(loc) => {
                setBeklemeLocation(loc || 'Üsküdar');
                setActiveTab('bekleme');
              }}
              onOpenEarningsModal={() => setIsEarningsModalOpen(true)}
              onStartTour={handleStartTour}
            />
          )}

          {activeTab === 'simdi' && (
            <SimdiLazimView
              stations={liveStations}
              availability={availability}
              onBack={() => setActiveTab('map')}
              onBookStation={(st) => {
                setSelectedStation(st);
                setActiveTab('booking');
              }}
              onViewOnMap={(st) => {
                setSelectedStation(st);
                setActiveTab('map');
              }}
            />
          )}

          {activeTab === 'seans' && (
            activeSession ? (
              <ChargingSessionWithChat
                activeSession={activeSession}
                driverStats={driverStats}
                onBack={() => setActiveTab('map')}
                onFinishSession={handleFinishDriverSession}
                totalHostSessions={totalCompletedSessions}
              />
            ) : (
              <div className="pt-20 pb-32 text-center max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center mx-auto text-2xl">
                  ⚡
                </div>
                <h2 className="text-2xl font-bold text-[#F5F5F7] tracking-tight">Henüz aktif seansın yok</h2>
                <p className="text-xs sm:text-sm text-[#A1A1A6] leading-relaxed">
                  Şu anda devam eden bir şarj seansı bulunmuyor. Haritadan uygun bir istasyon seçip hemen şarj başlatabilirsin.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('map')}
                    className="px-6 py-2.5 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all cursor-pointer shadow-sm"
                  >
                    İstasyonları Keşfet
                  </button>
                </div>
              </div>
            )
          )}

          {activeTab === 'host-reservations' && (
            <HostReservationsView
              reservations={reservations}
              onSelectReservation={(res) => {
                setSelectedReservation(res);
                setActiveTab('seans-ozeti');
              }}
              onAddNewSchedule={() => setActiveTab('host-stations')}
            />
          )}

          {activeTab === 'seans-ozeti' && (
            <SeansOzetiView
              session={selectedReservation || reservations[0]}
              onBack={() => setActiveTab('host-reservations')}
              onApproveSession={handleApproveSession}
              onDisputeSession={handleDisputeSession}
            />
          )}

          {activeTab === 'bekleme' && (
            <BeklemeView
              location={beklemeLocation}
              onBack={() => setActiveTab('map')}
              onSelectStation={(stId) => {
                const found = liveStations.find(s => s.id === stId) || liveStations[0];
                setSelectedStation(found);
                setActiveTab('booking');
              }}
            />
          )}

          {activeTab === 'host-payouts' && (
            <HostPayoutsView
              reservations={reservations}
              transfers={payoutTransfers}
              bankAccount={bankAccount}
              setBankAccount={setBankAccount}
              withdrawableTotal={withdrawableTotal}
              pendingTotal={pendingTotal}
              transferredTotal={transferredTotal}
              onExecuteTransfer={handleExecutePayoutTransfer}
              onBackToDashboard={() => setActiveTab('host')}
              onNavigateToReservation={(res) => {
                setSelectedReservation(res);
                setActiveTab('seans-ozeti');
              }}
            />
          )}

          {isDevMode && activeTab === 'telemetry' && (
            <TelemetryDashboard
              activeSession={activeSession}
              onStopCharging={handleStopCharging}
            />
          )}

          {activeTab === 'booking' && (
            <BookingWizard
              selectedStation={selectedStation}
              stations={liveStations}
              driverStats={driverStats}
              availability={availability}
              onOpenLoyaltyModal={() => setIsLoyaltyModalOpen(true)}
              onConfirmBooking={(st) => {
                setActiveSession(st || liveStations[0]);
                setActiveTab('seans');
              }}
            />
          )}

          {activeTab === 'host' && (
            <HostDashboard
              stations={liveStations}
              onAddNewStation={handleAddNewStation}
              onOpenSchedule={handleOpenScheduleForStation}
              onOpenPayouts={() => setActiveTab('host-payouts')}
              onOpenStations={() => setActiveTab('host-stations')}
              onOpenAddStation={() => setActiveTab('host-add-station')}
              grossTotal={grossTotal}
              netTotal={netTotal}
              commissionTotal={commissionTotal}
              hostCommissionRate={hostCommissionRate}
              totalKwhShared={totalKwhShared}
              totalSessions={totalCompletedSessions}
            />
          )}

          {activeTab === 'host-stations' && (
            <HostStationsView
              stations={liveStations}
              onOpenSchedule={handleOpenScheduleForStation}
              onOpenAddStation={() => setActiveTab('host-add-station')}
              onSimulateVerify={handleSimulateVerify}
              availabilityVersion={availabilityVersion}
            />
          )}

          {activeTab === 'host-add-station' && (
            <HostAddStationView
              onBack={() => setActiveTab('host-stations')}
              onStationAdded={handleStationAdded}
              onOpenSchedule={handleOpenScheduleForStation}
              onSimulateVerify={handleSimulateVerify}
            />
          )}

          {activeTab === 'host-schedule' && (
            (() => {
              const targetStation = liveStations.find(s => s.id === selectedScheduleStationId);
              if (!targetStation) {
                return (
                  <div className="pt-16 pb-24 text-center max-w-md mx-auto space-y-4">
                    <div className="w-16 h-16 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center mx-auto text-2xl">
                      🔍
                    </div>
                    <h2 className="text-2xl font-bold text-[#F5F5F7] tracking-tight">Bu istasyon bulunamadı.</h2>
                    <p className="text-xs sm:text-sm text-[#A1A1A6] leading-relaxed">
                      Aradığın istasyon kimliği ({selectedScheduleStationId}) sistemde mevcut değil veya silinmiş olabilir.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={handleBackFromSchedule}
                        className="px-6 py-2.5 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all cursor-pointer shadow-sm"
                      >
                        İstasyonlarıma dön
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <HostAvailabilitySchedule
                  station={targetStation}
                  onBack={handleBackFromSchedule}
                  onAvailabilityChange={() => notifyAvailabilityChanged()}
                />
              );
            })()
          )}

          {isDevMode && activeTab === 'route' && (
            <AiRoutePlanner
              stations={stations}
              onSelectStationForBooking={(st) => {
                setSelectedStation(st);
                setActiveTab('booking');
              }}
            />
          )}

          {isDevMode && activeTab === 'arch' && (
            <SystemArchitecture />
          )}
        </main>
      </div>

      {/* Nasıl Çalışır? Modalı */}
      {isHowItWorksOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] p-6 max-w-lg w-full space-y-5 border border-[#3A3A3C] rounded-2xl relative">
            <button
              onClick={() => setIsHowItWorksOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1A6] hover:text-white font-bold text-sm"
            >
              ✕
            </button>

            <div>
              <h3 className="font-bold text-lg text-[#F5F5F7]">Nasıl çalışır?</h3>
              <p className="text-xs text-[#A1A1A6] mt-1">ChargeRent ile komşunuzun boş şarj ünitesini kiralamak 3 adımda çok kolay.</p>
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex items-start space-x-3.5">
                <span className="w-6 h-6 rounded-full bg-[#2C2C2E] text-[#F5F5F7] font-semibold text-xs flex items-center justify-center shrink-0">1</span>
                <div>
                  <h4 className="font-semibold text-xs text-[#F5F5F7]">Konum ve saat seçin</h4>
                  <p className="text-xs text-[#A1A1A6] mt-0.5">Yakınınızdaki güvenilir şarj noktalarını inceleyin, araç modelinize ve ihtiyacınıza göre saat aralığı belirleyin.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5">
                <span className="w-6 h-6 rounded-full bg-[#2C2C2E] text-[#F5F5F7] font-semibold text-xs flex items-center justify-center shrink-0">2</span>
                <div>
                  <h4 className="font-semibold text-xs text-[#F5F5F7]">Rezervasyon yapın ve adres açılsın</h4>
                  <p className="text-xs text-[#A1A1A6] mt-0.5">Ev sahibi gizliliği gereği kesin kapı numarası ve garaj erişim şifresi rezervasyon onaylandıktan hemen sonra iletilir.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5">
                <span className="w-6 h-6 rounded-full bg-[#2C2C2E] text-[#F5F5F7] font-semibold text-xs flex items-center justify-center shrink-0">3</span>
                <div>
                  <h4 className="font-semibold text-xs text-[#F5F5F7]">Takın, şarj edin ve ayrılın</h4>
                  <p className="text-xs text-[#A1A1A6] mt-0.5">IoT sayaç telemetrisiyle tüketilen net kWh hesaplanır, kartınızdan otomatik tahsil edilir ve seans tamamlanır.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsHowItWorksOpen(false)}
              className="w-full py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all"
            >
              Anladım
            </button>
          </div>
        </div>
      )}

      {/* Giriş / Kayıt Modalı (Gerçek Backend Bağlantılı) */}
      <AuthModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialRole={userRole}
      />

      {/* Global Loyalty Tiers Modal */}
      <LoyaltyModal
        isOpen={isLoyaltyModalOpen}
        onClose={() => setIsLoyaltyModalOpen(false)}
        driverStats={driverStats}
      />

      {/* Ev Sahibi Gelir Hesaplayıcı Modalı */}
      <EarningsCalculatorModal
        isOpen={isEarningsModalOpen}
        onClose={() => setIsEarningsModalOpen(false)}
        onBecomeHost={() => {
          setUserRole('host');
          setActiveTab('host-add-station');
        }}
      />

      {/* 5 Adımlı Rehberli Demo Turu */}
      <GuidedTourOverlay
        currentStep={tourStep}
        onNext={handleNextTourStep}
        onClose={handleCloseTour}
        totalSteps={TOUR_STEPS.length}
        activeTab={activeTab}
        userRole={userRole}
        onResumeTour={handleResumeTour}
      />

      {/* Demo Sayfa Bilgilendirme Modalı */}
      {demoPageNotice && (
        <div className="fixed inset-0 z-[1300] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setDemoPageNotice(null)}
              className="absolute top-5 right-5 text-[#A1A1A6] hover:text-white font-bold text-sm"
            >
              ✕
            </button>
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-[#30C27C] block">
                Bilgilendirme
              </span>
              <h3 className="font-bold text-base text-[#F5F5F7]">{demoPageNotice.title}</h3>
            </div>
            <p className="text-xs text-[#A1A1A6] leading-relaxed">
              {demoPageNotice.message}
            </p>
            <div className="pt-2">
              <button
                onClick={() => setDemoPageNotice(null)}
                className="w-full py-2.5 rounded-full bg-[#F5F5F7] hover:bg-white text-black font-semibold text-xs transition-all cursor-pointer shadow-sm"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sade Minimal Footer (Ekran görüntüsüyle birebir) */}
      <footer className="mt-20 border-t border-[#2C2C2E] bg-[#000000] py-6">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A1A1A6]">
          <div 
            role="button"
            tabIndex={0}
            aria-label="ChargeRent ana sayfa"
            className="cursor-pointer select-none group flex items-center outline-none" 
            onClick={handleLogoClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleLogoClick();
              }
            }}
          >
            <span 
              className="font-bold text-[24px] text-[#F5F5F7] group-hover:text-white transition-colors tracking-tight leading-none select-none"
              style={{ letterSpacing: '-0.03em' }}
            >
              ChargeRent
            </span>
          </div>
          
          <div className="flex items-center space-x-4 text-xs">
            <button
              onClick={() => setDemoPageNotice({
                title: 'Gizlilik',
                message: 'Demo sürümde bu sayfa yok. Güvenlik politikası gereği kesin ev sahibi adresleri yalnızca onaylanan rezervasyonlar sonrasında sürücüye açılır.'
              })}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Gizlilik
            </button>
            <span>·</span>
            <button
              onClick={() => setDemoPageNotice({
                title: 'Kullanım koşulları',
                message: 'Demo sürümde bu sayfa yok. ChargeRent P2P şarj paylaşım platformunda standart topluluk kuralları ve sigorta güvencesi simüle edilmektedir.'
              })}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Kullanım koşulları
            </button>
            <span>·</span>
            <button
              onClick={() => setDemoPageNotice({
                title: 'Yardım',
                message: 'Demo sürümde bu sayfa yok. Süreçleri adım adım deneyimlemek için sağ üstteki "Nasıl çalışır?" rehberini veya "Demo turu" butonunu kullanabilirsiniz.'
              })}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Yardım
            </button>
            <span>·</span>
            <button
              onClick={() => {
                try {
                  Object.keys(localStorage).forEach((key) => {
                    if (key.startsWith('chargerent_')) {
                      localStorage.removeItem(key);
                    }
                  });
                  sessionStorage.clear();
                } catch (e) {}
                window.location.hash = '';
                window.location.reload();
              }}
              className="hover:text-white transition-colors cursor-pointer text-[#77777A]"
            >
              Demoyu sıfırla
            </button>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-12 mt-3 text-center sm:text-left text-[11px] text-[#555558]">
          Bağımsız bir demodur. Veriler örnektir; adı geçen markalarla bağlantısı yoktur.
        </div>

        {/* Demo Test Kısayolları (Yalnızca ?dev=1 ile gösterilir) */}
        {isDevMode && (
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-12 mt-4 pt-3 border-t border-[#1C1C1E] flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-[#555558]">
            <span>Geliştirici İnceleme (?dev=1):</span>
            <button onClick={() => {
              if (!activeSession) {
                setActiveSession(liveStations[0]);
              }
              setActiveTab('seans');
            }} className="hover:text-[#A1A1A6] underline font-medium text-[#A1A1A6]">
              Şarj Seansı
            </button>
            <button onClick={() => {
              setUserRole('host');
              setActiveTab('seans-ozeti');
            }} className="hover:text-[#A1A1A6] underline font-medium text-[#A1A1A6]">
              Seans Özeti (Ev Sahibi)
            </button>
            <button onClick={() => {
              setUserRole('host');
              setActiveTab('host-reservations');
            }} className="hover:text-[#A1A1A6] underline font-medium text-[#A1A1A6]">
              Rezervasyonlar Listesi
            </button>
            <button onClick={() => {
              setUserRole('host');
              setActiveTab('host-payouts');
            }} className="hover:text-[#A1A1A6] underline font-medium text-[#A1A1A6]">
              Kazançlar & Cüzdan
            </button>
            <button onClick={() => {
              setUserRole('driver');
              setBeklemeLocation('Üsküdar');
              setActiveTab('bekleme');
            }} className="hover:text-[#A1A1A6] underline font-medium text-[#A1A1A6]">
              Bekleme Listesi (Üsküdar)
            </button>
            <button onClick={() => setActiveTab('telemetry')} className="hover:text-[#A1A1A6] underline">
              Canlı Telemetri
            </button>
            <button onClick={() => setActiveTab('booking')} className="hover:text-[#A1A1A6] underline">
              Randevu Sihirbazı
            </button>
            <button onClick={() => setActiveTab('route')} className="hover:text-[#A1A1A6] underline">
              AI Rota
            </button>
            <button onClick={() => setActiveTab('arch')} className="hover:text-[#A1A1A6] underline">
              Sistem Mimarisi
            </button>
          </div>
        )}
      </footer>

      {/* Mobil Cihazlar İçin Alt Gezinme Çubuğu (iOS Style Bottom Dock) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />
    </div>
  );
}

// --- GLOBAL REACT ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ChargeRent UI yakalanan hata:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-[#F5F5F7] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-6 rounded-2xl max-w-md w-full space-y-4">
            <h2 className="text-lg font-bold text-white">Görünüm yenilendi</h2>
            <p className="text-xs text-[#A1A1A6]">
              Arayüz geçişi sırasında bir uyuşmazlık algılandı. Aşağıdaki butona basarak oturumuna güvenle devam edebilirsin.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.hash = '';
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs transition-all hover:bg-[#F5F5F7] cursor-pointer"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Render to DOM with ErrorBoundary protection
ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

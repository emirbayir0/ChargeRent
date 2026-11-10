import React, { useState, useEffect, useRef } from 'react';

/**
 * ChargingSessionWithChat
 * ChargeRent P2P EV Şarj Platformu — Canlı Şarj Telemetrisi & Akıllı Ev Sahibi Sohbeti
 * 
 * Apple Dark Minimalist Tasarım: #000000 zemin, #1C1C1E kartlar, #2C2C2E kenarlıklar, #30C27C zümrüt yeşili aksan.
 * Sentence case Türkçe arayüz.
 */
export const ChargingSessionWithChat = ({
  session,
  activeSession,
  station,
  driverStats,
  onBack,
  onFinishSession
}) => {
  // 1. İstasyon ve Seans Parametreleri
  const currentSession = session || activeSession || station || {
    id: 'st-01',
    name: 'Moda, müstakil garaj',
    address: 'Örnek Sk. No:1, Garaj kodu: #0000, Kadıköy / İstanbul',
    hostName: 'Örnek Ev Sahibi',
    hostAvatar: 'AB',
    powerKw: 11,
    carModel: 'TOGG T10X Long Range',
    pricePerKwh: 7.50
  };

  const stationName = currentSession?.name || 'Moda, müstakil garaj';
  const hostName = currentSession?.hostName || currentSession?.host?.name || 'Ahmet B.';
  const carModel = currentSession?.carModel || 'TOGG T10X Long Range';
  const stationAddress = currentSession?.address || currentSession?.exactAddress || 'Örnek Sk. No:1, Garaj kodu: #0000, Kadıköy / İstanbul';
  const baseRatePerKwh = 7.50; // Baz fiyat ₺7.50 / kWh
  const idleFeeRatePerMin = 2.50; // Dakika başına ₺2.50 ceza

  // 2. Canlı Telemetri State Yönetimi
  // status: 'idle' | 'charging' | 'completed' | 'idle_fee'
  const [status, setStatus] = useState('idle');
  const [soc, setSoc] = useState(20); // %20'den başlar
  const [voltage, setVoltage] = useState(230.2); // ~230V
  const [currentA, setCurrentA] = useState(0.0); // ~16A
  const [powerKw, setPowerKw] = useState(0.0); // ~11 kW
  const [energyKwh, setEnergyKwh] = useState(0.00); // 0.00 kWh başlangıç
  const [idleFee, setIdleFee] = useState(0.00); // Ceza tutarı
  const [toleranceCountdown, setToleranceCountdown] = useState(10); // 10 saniye tolerans
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [simSpeed, setSimSpeed] = useState(1); // 1x veya 3x hızlandırma

  // 3. Akıllı Sohbet & Mesajlaşma State Yönetimi
  const [messages, setMessages] = useState([
    {
      id: 'sys-init',
      sender: 'system',
      text: '⚡ Sistem: Güvenli eşleşme sağlandı. İstasyon (11 kW AC) şarja hazır.',
      timestamp: '14:30',
      type: 'system'
    },
    {
      id: 'host-welcome',
      sender: 'host',
      text: 'Merhaba! Garaja rahatça yanaşabilirsiniz, şarj ünitesi sol duvarda aktif. Sorun olursa buradan yazın.',
      timestamp: '14:31',
      type: 'normal'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isHostTyping, setIsHostTyping] = useState(false);
  const [safetyWarning, setSafetyWarning] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const messagesEndRef = useRef(null);

  // Otomatik mesaj kaydırma
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isHostTyping]);

  // Lucide ikonlarını güvenle yenile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.lucide) {
      window.lucide.createIcons();
    }
  }, [status, messages, isHostTyping, safetyWarning, showSummaryModal]);

  // Sistem bildirim balonu ekleme yardımcısı
  const addSystemLog = (text, type = 'system') => {
    const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [
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
  useEffect(() => {
    if (status !== 'charging') return;

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);

      // Voltaj: ~230V (228.2V - 231.8V küçük dalgalanma)
      const vJitter = (Math.random() * 3.2 - 1.6);
      setVoltage(Number((230.0 + vJitter).toFixed(1)));

      // Akım: ~16A (15.8A - 16.2A)
      const aJitter = (Math.random() * 0.4 - 0.2);
      setCurrentA(Number((16.0 + aJitter).toFixed(1)));

      // Anlık Güç: ~11 kW TOGG AC kabul gücü standardı
      const pJitter = (Math.random() * 0.2 - 0.1);
      setPowerKw(Number((11.0 + pJitter).toFixed(2)));

      // SoC artışı ve Aktarılan Enerji hesabı
      // TOGG 88.5 kWh batarya: %20 -> %80 = %60 = 53.1 kWh aktarımı
      // 1 SoC artışı = 0.885 kWh
      const step = simSpeed === 3 ? 3 : 1;
      
      setSoc(prevSoc => {
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
        setEnergyKwh(prevEnergy => Number((prevEnergy + addedKwh).toFixed(2)));
        return nextSoc;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, simSpeed]);

  // 5. Tolerans Süresi Geri Sayımı (completed modu — 10 saniye)
  useEffect(() => {
    if (status !== 'completed') return;

    const timer = setInterval(() => {
      setToleranceCountdown(prev => {
        if (prev <= 1) {
          // 10 saniyelik tolerans süresi doldu!
          setStatus('idle_fee');
          addSystemLog('⚠️ Sistem: 10 saniyelik tolerans süresi doldu. İşgal ücreti uygulanıyor (₺2.50/dk).', 'warning');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // 6. İşgal Ücreti Sayacı (idle_fee modu — saniye başına ₺2.50 / 60)
  useEffect(() => {
    if (status !== 'idle_fee') return;

    const feeInterval = setInterval(() => {
      setIdleFee(prev => Number((prev + (idleFeeRatePerMin / 60)).toFixed(2)));
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

    setMessages(prev => [...prev, driverMessage]);
    setInputText('');

    // Otomatik Ev Sahibi Yanıtı Simülasyonu (Ahmet B.) — 1.5 - 2 saniye gecikme
    setIsHostTyping(true);
    const lower = safeText.toLowerCase();

    let reply = 'Mesajınızı aldım, garaj civarındayım. Bir ihtiyacınız olursa buradayım.';
    if (lower.includes('bariyer') || lower.includes('kapı')) {
      reply = 'Hoş geldiniz! Garaj kapısını kumandayla hemen açtım, sol duvardaki sokete yanaşabilirsiniz.';
    } else if (lower.includes('başladı') || lower.includes('sorunsuz')) {
      reply = 'Harika, panodan kontrol ettim; 11 kW şarj akımı stabil iletiliyor. Rahatınıza bakın!';
    } else if (lower.includes('rötar') || lower.includes('gecik') || lower.includes('10 dk')) {
      reply = 'Hiç sorun değil, yeriniz ayrılmış durumda bekliyor. Geldiğinizde haberleşiriz.';
    } else if (hasLeak) {
      reply = 'Güvenlik uyarısını gördüm, ChargeRent politikası gereği tüm seans ve ödeme takibi uygulama üzerinden yürütülüyor.';
    }

    const delay = 1500 + Math.random() * 500;
    setTimeout(() => {
      setIsHostTyping(false);
      const hostTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [
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
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] transition-colors flex items-center space-x-1.5 font-normal"
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
                Telemetri motoru
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
                  <span>İşgal ücreti aktif (₺2.50/dk)</span>
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
                  <span className="text-[#F5F5F7] font-medium tabular-nums">%{Math.round(soc)}</span>
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
                  {voltage} V
                </span>
                <span className="text-[10px] text-[#A1A1A6] block">Şebeke gerilimi</span>
              </div>

              {/* Akım */}
              <div className="bg-[#141416] border border-[#2C2C2E] rounded-2xl p-3.5 space-y-1">
                <span className="text-[11px] text-[#A1A1A6] block">Akım</span>
                <span className="text-base sm:text-lg font-semibold text-[#F5F5F7] tabular-nums block">
                  {currentA} A
                </span>
                <span className="text-[10px] text-[#A1A1A6] block">Trifaze yük</span>
              </div>

              {/* Anlık Güç */}
              <div className="bg-[#141416] border border-[#2C2C2E] rounded-2xl p-3.5 space-y-1">
                <span className="text-[11px] text-[#A1A1A6] block">Anlık güç</span>
                <span className="text-base sm:text-lg font-semibold text-[#F5F5F7] tabular-nums block">
                  {powerKw} kW
                </span>
                <span className="text-[10px] text-[#30C27C] block">TOGG AC sınırı</span>
              </div>

              {/* Aktarılan Enerji */}
              <div className="bg-[#141416] border border-[#2C2C2E] rounded-2xl p-3.5 space-y-1">
                <span className="text-[11px] text-[#A1A1A6] block">Aktarılan enerji</span>
                <span className="text-base sm:text-lg font-semibold text-[#F5F5F7] tabular-nums block">
                  {energyKwh.toFixed(2)} kWh
                </span>
                <span className="text-[10px] text-[#A1A1A6] block">Sayaç artışı</span>
              </div>
            </div>

            {/* Fatura & Ücret Dökümü */}
            <div className="p-4 rounded-2xl bg-[#141416] border border-[#2C2C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs text-[#A1A1A6]">Fatura dökümü (Baz: ₺7,50 / kWh)</span>
                <div className="flex items-center space-x-3 text-xs text-[#F5F5F7]">
                  <span>Enerji: ₺{energyCost.toFixed(2)}</span>
                  {idleFee > 0 && (
                    <span className="text-red-400 font-semibold">
                      · İşgal cezası: ₺{idleFee.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right sm:text-right">
                <span className="text-[11px] text-[#A1A1A6] block">Toplam tutar</span>
                <span className="text-xl font-bold text-[#F5F5F7] tabular-nums">
                  ₺{totalAmount.toFixed(2)}
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
                  İstasyon tolerans süresi aşıldı. Lütfen aracınızı çekip soketi boşaltınız. Biriken ceza: ₺{idleFee.toFixed(2)}
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
                {currentSession?.hostAvatar || 'AB'}
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-semibold text-sm text-[#F5F5F7]">{hostName}</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#30C27C]/15 text-[#30C27C] font-medium">
                    Süper ev sahibi
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1A6] mt-0.5">
                  Çevrim içi · Genellikle 5 dk içinde yanıt verir
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-[#F5F5F7]">★ 4.95</span>
              <span className="text-[10px] text-[#A1A1A6] block">40+ seans</span>
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
              <span className="text-[10px] text-[#A1A1A6]">P2P Korumalı hat</span>
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
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSendMessage('Bariyerdeyim / Kapıdayım')}
                  className="px-2.5 py-1 rounded-full bg-[#141416] border border-[#2C2C2E] text-[#A1A1A6] hover:text-[#F5F5F7] hover:border-[#3A3A3C] whitespace-nowrap transition-all shrink-0"
                >
                  Bariyerdeyim / Kapıdayım
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('Garaj kapısını açabilir misiniz?')}
                  className="px-2.5 py-1 rounded-full bg-[#141416] border border-[#2C2C2E] text-[#A1A1A6] hover:text-[#F5F5F7] hover:border-[#3A3A3C] whitespace-nowrap transition-all shrink-0"
                >
                  Garaj kapısını açabilir misiniz?
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('Şarj sorunsuz başladı')}
                  className="px-2.5 py-1 rounded-full bg-[#141416] border border-[#2C2C2E] text-[#A1A1A6] hover:text-[#F5F5F7] hover:border-[#3A3A3C] whitespace-nowrap transition-all shrink-0"
                >
                  Şarj sorunsuz başladı
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('10 dk rötarlıyım')}
                  className="px-2.5 py-1 rounded-full bg-[#141416] border border-[#2C2C2E] text-[#A1A1A6] hover:text-[#F5F5F7] hover:border-[#3A3A3C] whitespace-nowrap transition-all shrink-0"
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
                <span className="text-[#F5F5F7] font-medium">{energyKwh.toFixed(2)} kWh</span>
              </div>
              <div className="flex justify-between text-[#A1A1A6]">
                <span>Birim fiyat</span>
                <span className="text-[#F5F5F7] font-medium">₺7,50 / kWh</span>
              </div>
              <div className="flex justify-between text-[#A1A1A6]">
                <span>Enerji tutarı</span>
                <span className="text-[#F5F5F7] font-medium">₺{energyCost.toFixed(2)}</span>
              </div>
              {idleFee > 0 && (
                <div className="flex justify-between text-red-400 font-semibold">
                  <span>İşgal cezası (₺2,50/dk)</span>
                  <span>₺{idleFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-[#F5F5F7] pt-2 border-t border-[#2C2C2E]/60">
                <span>Toplam tahsilat</span>
                <span className="text-[#30C27C]">₺{totalAmount.toFixed(2)}</span>
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

export default ChargingSessionWithChat;

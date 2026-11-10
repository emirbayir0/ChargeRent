// BookingWizard Component for VoltShare EV Platform
import { EV_MODELS } from '../data/mockData.js';

export const BookingWizard = ({ selectedStation, stations, onConfirmBooking }) => {
  const [stationId, setStationId] = React.useState(selectedStation ? selectedStation.id : stations[0]?.id || '');
  const [selectedEvId, setSelectedEvId] = React.useState(EV_MODELS[0].id);
  const [currentBatteryPct, setCurrentBatteryPct] = React.useState(20);
  const [targetBatteryPct, setTargetBatteryPct] = React.useState(80);
  const [bookingDate, setBookingDate] = React.useState('2026-10-02');
  const [bookingTime, setBookingTime] = React.useState('14:00');
  const [isSuccessModal, setIsSuccessModal] = React.useState(false);

  const activeStation = stations.find((s) => s.id === stationId) || stations[0];
  const activeEv = EV_MODELS.find((e) => e.id === selectedEvId) || EV_MODELS[0];

  // Calculation Math
  const neededBatteryPct = Math.max(0, targetBatteryPct - currentBatteryPct);
  const neededKwh = Number(((activeEv.batteryCapacity * neededBatteryPct) / 100).toFixed(2));
  
  // Effective charge speed is min of station max & car AC acceptance rate
  const effectivePowerKw = Math.min(activeStation.powerKw, activeEv.acKw || 11);
  const estimatedHours = (neededKwh / effectivePowerKw) * 1.1;
  const estimatedMinutes = Math.round(estimatedHours * 60);

  const totalPrice = Number((neededKwh * activeStation.pricePerKwh).toFixed(2));

  // Re-init icons
  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [selectedStation, activeEv, totalPrice]);

  const handleSubmitBooking = (e) => {
    e.preventDefault();
    setIsSuccessModal(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Wizard Header */}
      <div className="glass-panel p-6 rounded-3xl border-emerald-500/20 text-center space-y-2">
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
          SMART CHARGING CALCULATOR
        </span>
        <h2 className="font-display font-bold text-2xl text-white">Akıllı Şarj Randevu Sihirbazı</h2>
        <p className="text-xs text-slate-400 max-w-lg mx-auto">
          Aracınızı ve hedeflediğiniz şarj yüzdesini seçin. Sistem gerekli kWh enerjiyi, tahmini dolum süresini ve net tutarı anında hesaplasın.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left: Input Form */}
        <form onSubmit={handleSubmitBooking} className="md:col-span-7 glass-panel p-6 rounded-3xl space-y-5 border-emerald-500/20">
          
          {/* Station Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-300 block">1. Şarj İstasyonu Seçin</label>
            <select
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              className="w-full p-3 rounded-xl glass-input text-xs font-medium text-slate-200"
            >
              {stations.map((st) => (
                <option key={st.id} value={st.id} className="bg-slate-900 text-white">
                  {st.name} — {st.powerKw} kW ({st.plugType}) | ₺{st.pricePerKwh}/kWh
                </option>
              ))}
            </select>
          </div>

          {/* EV Model Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-300 block">2. Elektrikli Araç Modeliniz</label>
            <div className="grid grid-cols-2 gap-3">
              {EV_MODELS.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvId(ev.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                    selectedEvId === ev.id
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10'
                      : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span className="font-bold block text-sm">{ev.image}</span>
                  <span className="font-semibold block truncate mt-1 text-white">{ev.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono block">Kapasite: {ev.batteryCapacity} kWh</span>
                </div>
              ))}
            </div>
          </div>

          {/* Battery Percentage Sliders */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-mono">Mevcut Batarya Seviyesi:</span>
                <span className="font-mono font-bold text-amber-400">%{currentBatteryPct}</span>
              </div>
              <input
                type="range"
                min="5"
                max="90"
                value={currentBatteryPct}
                onChange={(e) => setCurrentBatteryPct(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-mono">Hedeflenen Batarya Seviyesi:</span>
                <span className="font-mono font-bold text-emerald-400">%{targetBatteryPct}</span>
              </div>
              <input
                type="range"
                min={currentBatteryPct + 5}
                max="100"
                value={targetBatteryPct}
                onChange={(e) => setTargetBatteryPct(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Date & Time Picker */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400 block">Tarih</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full p-2.5 rounded-xl glass-input text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400 block">Başlangıç Saati</label>
              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="w-full p-2.5 rounded-xl glass-input text-xs font-mono"
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/30 hover:scale-[1.02] transition-all flex items-center justify-center space-x-2"
          >
            <i data-lucide="check-circle" className="w-5 h-5 fill-slate-950"></i>
            <span>Rezervasyonu Onayla ve Takvime Ekle</span>
          </button>

        </form>

        {/* Right: Summary Card */}
        <div className="md:col-span-5 glass-panel-glow p-6 rounded-3xl space-y-6 border-emerald-500/30 flex flex-col justify-between">
          
          <div className="space-y-4">
            <h3 className="font-display font-bold text-lg text-white border-b border-white/10 pb-3 flex items-center space-x-2">
              <i data-lucide="calculator" className="w-5 h-5 text-emerald-400"></i>
              <span>Rezervasyon Özeti</span>
            </h3>

            {/* Selected Station Mini Card */}
            <div className="flex items-center space-x-3 bg-slate-900/60 p-3 rounded-xl border border-white/5">
              <img src={activeStation.stationImage} alt={activeStation.name || "Seçilen şarj istasyonu"} className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <span className="text-[10px] font-mono text-emerald-400">{activeStation.powerKw} kW • {activeStation.plugType}</span>
                <p className="font-bold text-xs text-white truncate">{activeStation.name}</p>
                <p className="text-[10px] text-slate-400">{activeStation.hostName}</p>
              </div>
            </div>

            {/* Metric Kpis */}
            <div className="space-y-3 pt-2">
              
              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                <span className="text-slate-400">Seçilen Araç:</span>
                <span className="font-bold text-white">{activeEv.name}</span>
              </div>

              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                <span className="text-slate-400">Yüklenecek Enerji:</span>
                <span className="font-bold font-mono text-cyan-400">+{neededKwh} kWh</span>
              </div>

              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                <span className="text-slate-400">Tahmini Şarj Süresi:</span>
                <span className="font-bold font-mono text-amber-400">~{estimatedMinutes} Dakika</span>
              </div>

              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                <span className="text-slate-400">kWh Birim Fiyatı:</span>
                <span className="font-bold font-mono text-slate-200">₺{activeStation.pricePerKwh.toFixed(2)}</span>
              </div>

            </div>
          </div>

          {/* Total Cost Highlight Box */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/40 text-center space-y-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Ödenecek Toplam Tutar</span>
            <span className="font-display font-extrabold text-3xl text-emerald-400 text-glow-emerald">₺{totalPrice}</span>
            <p className="text-[10px] text-slate-500">Şarj bitiminde kartınızdan otomatik tahsil edilir.</p>
          </div>

        </div>

      </div>

      {/* Booking Success Confirmation Modal */}
      {isSuccessModal && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-glow p-8 rounded-3xl max-w-md w-full text-center space-y-5 border-emerald-500/50">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
              <i data-lucide="check" className="w-8 h-8"></i>
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-bold text-2xl text-white">Rezervasyon Onaylandı!</h3>
              <p className="text-xs text-slate-300">
                <strong className="text-emerald-400">{activeStation.name}</strong> istasyonunda <strong className="text-white">{bookingDate} saat {bookingTime}</strong> için randevunuz oluşturuldu.
              </p>
            </div>

            <div className="glass-panel p-4 rounded-xl text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Araç:</span>
                <span className="text-white">{activeEv.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tahmini Enerji:</span>
                <span className="text-cyan-400">{neededKwh} kWh</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Toplam Tutar:</span>
                <span className="text-emerald-400 font-bold">₺{totalPrice}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsSuccessModal(false);
                onConfirmBooking(activeStation);
              }}
              className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/30"
            >
              Tamam — Canlı Telemetriye Git
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

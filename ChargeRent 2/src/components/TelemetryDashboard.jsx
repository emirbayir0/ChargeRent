// TelemetryDashboard Component for VoltShare EV Platform

export const TelemetryDashboard = ({ activeSession, onStopCharging }) => {
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

  // Simulated live WebSocket telemetry stream effect
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

  // Re-init icons
  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [telemetry, activeSession]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeSession) {
    return (
      <div className="glass-panel p-12 rounded-3xl text-center space-y-6 max-w-2xl mx-auto border-emerald-500/20 my-8">
        <div className="w-20 h-20 rounded-full bg-slate-900 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
          <i data-lucide="zap-off" className="w-10 h-10 text-slate-500"></i>
        </div>
        <div className="space-y-2">
          <h3 className="font-display font-bold text-2xl text-white">Aktif Şarj Oturumu Bulunmuyor</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Harita sekmesinden bir bireysel şarj istasyonu seçip <span className="text-emerald-400 font-semibold">"Hemen Şarj Et"</span> butonuna tıklayarak canlı OCPP telemetrisini başlatabilirsiniz.
          </p>
        </div>
      </div>
    );
  }

  // Calculate SVG stroke offset for ring
  const strokeDashoffset = 440 - (440 * telemetry.batteryPct) / 100;

  return (
    <div className="space-y-6">
      
      {/* Session Top Banner */}
      <div className="glass-panel-glow p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 border-emerald-500/40">
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img src={activeSession.stationImage} alt={activeSession.name || "Canlı şarj istasyonu"} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/50" />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 animate-ping"></span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-slate-950">
                OCPP 2.0.1 LIVE STREAM
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: #CHG-89421</span>
            </div>
            <h2 className="font-display font-bold text-xl text-white mt-1">{activeSession.name}</h2>
            <p className="text-xs text-slate-400 flex items-center space-x-2">
              <span>Ev Sahibi: <strong className="text-slate-200">{activeSession.hostName}</strong></span>
              <span>•</span>
              <span className="text-emerald-400 font-mono font-bold">{activeSession.powerKw} kW ({activeSession.plugType})</span>
            </p>
          </div>
        </div>

        {/* Emergency Stop Action */}
        <button
          onClick={onStopCharging}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-xs shadow-xl shadow-red-500/20 hover:scale-105 transition-all flex items-center space-x-2 border border-red-400/30"
        >
          <i data-lucide="square" className="w-4 h-4 fill-white"></i>
          <span>Şarj Oturumunu Sonlandır</span>
        </button>

      </div>

      {/* Main Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left: Circular Battery Gauge */}
        <div className="md:col-span-5 glass-panel p-8 rounded-3xl flex flex-col items-center justify-center relative border-emerald-500/20">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4">Batarya Doluluk Oranı</span>

          <div className="relative w-56 h-56 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" stroke="#1e293b" strokeWidth="12" fill="none" />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="url(#emerald-cyan-gradient)"
                strokeWidth="12"
                strokeDasharray="440"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="telemetry-ring"
              />
              <defs>
                <linearGradient id="emerald-cyan-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-display font-extrabold text-4xl text-white text-glow-emerald">
                %{telemetry.batteryPct}
              </span>
              <span className="text-xs font-mono text-emerald-400 mt-1 flex items-center space-x-1">
                <i data-lucide="zap" className="w-3.5 h-3.5 animate-pulse"></i>
                <span>{telemetry.currentKw} kW Şarj Ediliyor</span>
              </span>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10 text-center">
            <div>
              <span className="text-[11px] text-slate-400 font-mono block">Aktarılan Enerji</span>
              <span className="font-mono font-bold text-lg text-cyan-400">{telemetry.energyKwhAdded} kWh</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-mono block">Geçen Süre</span>
              <span className="font-mono font-bold text-lg text-slate-200">{formatTime(telemetry.elapsedSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Right: Metrics Grid & Power Curve */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Live Telemetry Tickers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div className="glass-panel p-4 rounded-2xl border-emerald-500/20">
              <span className="text-[11px] font-mono text-slate-400 block">Şarj Gücü</span>
              <span className="font-mono font-bold text-xl text-emerald-400">{telemetry.currentKw} kW</span>
              <span className="text-[10px] text-slate-500 block mt-1">Anlık Akış</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border-cyan-500/20">
              <span className="text-[11px] font-mono text-slate-400 block">Gerilim (Voltaj)</span>
              <span className="font-mono font-bold text-xl text-cyan-400">{telemetry.voltage} V</span>
              <span className="text-[10px] text-slate-500 block mt-1">Şebeke Voltajı</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border-amber-500/20">
              <span className="text-[11px] font-mono text-slate-400 block">Batarya Sıcaklığı</span>
              <span className="font-mono font-bold text-xl text-amber-400">{telemetry.tempC} °C</span>
              <span className="text-[10px] text-slate-500 block mt-1">Termal Durum (Optimum)</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border-purple-500/20">
              <span className="text-[11px] font-mono text-slate-400 block">Tutar Sayacı</span>
              <span className="font-mono font-bold text-xl text-purple-400">₺{telemetry.costSoFar}</span>
              <span className="text-[10px] text-slate-500 block mt-1">₺{activeSession.pricePerKwh}/kWh</span>
            </div>

          </div>

          {/* Live Power Curve SVG Chart */}
          <div className="glass-panel p-6 rounded-3xl space-y-3 border-emerald-500/20">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-sm text-white flex items-center space-x-2">
                <i data-lucide="trending-up" className="w-4 h-4 text-emerald-400"></i>
                <span>Canlı Güç Dalgalanma Eğrisi (kW)</span>
              </h4>
              <span className="text-xs font-mono text-emerald-400 animate-pulse">● REALTIME OCPP SOCKET STREAM</span>
            </div>

            {/* SVG Sparkline Graph */}
            <div className="h-40 w-full pt-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100">
                {/* Background Grid Lines */}
                <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                <line x1="0" y1="80" x2="300" y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />

                {/* Polyline Path */}
                {(() => {
                  const points = telemetry.powerHistory
                    .map((val, idx) => {
                      const x = (idx / (telemetry.powerHistory.length - 1)) * 300;
                      const y = 90 - (val / (activeSession.powerKw * 1.2)) * 80;
                      return `${x},${y}`;
                    })
                    .join(' ');

                  return (
                    <>
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                      />
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

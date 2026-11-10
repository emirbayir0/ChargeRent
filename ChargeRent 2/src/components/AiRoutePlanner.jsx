// AiRoutePlanner Component for VoltShare EV Platform

export const AiRoutePlanner = ({ stations, onSelectStationForBooking }) => {
  const [startPoint, setStartPoint] = React.useState('İstanbul (Kadıköy)');
  const [endPoint, setEndPoint] = React.useState('Bodrum (Yalıkavak)');
  const [initialBatteryPct, setInitialBatteryPct] = React.useState(35);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [routeResult, setRouteResult] = React.useState(null);

  // Re-init icons
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
        totalDistanceKm: 685,
        totalTravelTimeHours: '7 Sa 20 Dk',
        estimatedBatteryUsedKwh: 142.5,
        recommendedStops: [
          {
            stopIndex: 1,
            distanceFromStartKm: 240,
            locationName: 'Bursa Nilüfer Villa Charger',
            stationObj: stations[1] || stations[0],
            arrivalBatteryPct: 14,
            chargeDurationMins: 25,
            departureBatteryPct: 80,
            cost: 168.00
          },
          {
            stopIndex: 2,
            distanceFromStartKm: 480,
            locationName: 'İzmir Alsancak Fast DC',
            stationObj: stations[4] || stations[0],
            arrivalBatteryPct: 22,
            chargeDurationMins: 20,
            departureBatteryPct: 85,
            cost: 210.00
          }
        ]
      });
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* AI Planner Banner */}
      <div className="glass-panel-glow p-6 rounded-3xl border-cyan-500/40 text-center space-y-2">
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold">
          GPT-4o SMART GRID ROUTE OPTIMIZER
        </span>
        <h2 className="font-display font-bold text-2xl text-white">Yapay Zeka Destekli Rota & Şarj Planlayıcı</h2>
        <p className="text-xs text-slate-300 max-w-lg mx-auto">
          Uzun yola çıkmadan önce kalkış/varış noktanızı girin; AI rotadaki en ideal binek özel şarj duraklarını minimum bekleme süresiyle planlasın.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handlePlanRoute} className="glass-panel p-6 rounded-3xl border-white/10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-400">Kalkış Konumu</label>
            <input
              type="text"
              value={startPoint}
              onChange={(e) => setStartPoint(e.target.value)}
              className="w-full p-3 rounded-xl glass-input text-xs font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-400">Varış Konumu</label>
            <input
              type="text"
              value={endPoint}
              onChange={(e) => setEndPoint(e.target.value)}
              className="w-full p-3 rounded-xl glass-input text-xs font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-400">Mevcut Batarya (%{initialBatteryPct})</label>
            <input
              type="range"
              min="10"
              max="100"
              value={initialBatteryPct}
              onChange={(e) => setInitialBatteryPct(Number(e.target.value))}
              className="w-full mt-3 accent-cyan-400 cursor-pointer"
            />
          </div>

        </div>

        <button
          type="submit"
          disabled={isCalculating}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs shadow-xl shadow-cyan-500/20 hover:scale-[1.01] transition-all flex items-center justify-center space-x-2"
        >
          {isCalculating ? (
            <>
              <i data-lucide="loader" className="w-4 h-4 animate-spin"></i>
              <span>AI Optimizasyonu Yapılıyor...</span>
            </>
          ) : (
            <>
              <i data-lucide="sparkles" className="w-4 h-4 fill-slate-950"></i>
              <span>Rotayı Yapay Zeka İle Planla</span>
            </>
          )}
        </button>
      </form>

      {/* Results View */}
      {routeResult && (
        <div className="glass-panel p-6 rounded-3xl space-y-6 border-emerald-500/30 animate-in fade-in duration-300">
          
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-xs text-slate-400 font-mono">Planlanan Rota</span>
              <h3 className="font-display font-bold text-lg text-white">{startPoint} ➔ {endPoint}</h3>
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono">
              <div className="text-right">
                <span className="text-slate-400 block">Mesafe</span>
                <span className="font-bold text-cyan-400">{routeResult.totalDistanceKm} km</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Süre</span>
                <span className="font-bold text-emerald-400">{routeResult.totalTravelTimeHours}</span>
              </div>
            </div>
          </div>

          {/* Recommended Charging Stops */}
          <div className="space-y-4">
            <h4 className="font-display font-bold text-sm text-white flex items-center space-x-2">
              <i data-lucide="map-pin" className="w-4 h-4 text-emerald-400"></i>
              <span>Önerilen AI Şarj Durakları ({routeResult.recommendedStops.length} Durak)</span>
            </h4>

            <div className="space-y-4">
              {routeResult.recommendedStops.map((stop) => (
                <div key={stop.stopIndex} className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border-white/10">
                  <div className="flex items-center space-x-4 w-full sm:w-auto">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 font-bold font-mono flex items-center justify-center border border-cyan-500/30">
                      #{stop.stopIndex}
                    </div>

                    <div>
                      <h5 className="font-bold text-sm text-white">{stop.locationName}</h5>
                      <span className="text-xs text-slate-400 font-mono">Kalkıştan {stop.distanceFromStartKm}. km'de</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-xs font-mono w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-center">
                      <span className="text-slate-400 block text-[10px]">Batarya Değişimi</span>
                      <span className="text-amber-400 font-bold">%{stop.arrivalBatteryPct} ➔ %{stop.departureBatteryPct}</span>
                    </div>

                    <div className="text-center">
                      <span className="text-slate-400 block text-[10px]">Duraklama Süresi</span>
                      <span className="text-emerald-400 font-bold">~{stop.chargeDurationMins} Dk</span>
                    </div>

                    <button
                      onClick={() => onSelectStationForBooking(stop.stationObj)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold transition-all text-xs border border-emerald-500/30"
                    >
                      Randevu Al
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

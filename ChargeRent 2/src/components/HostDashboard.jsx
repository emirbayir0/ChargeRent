// HostDashboard Component for VoltShare EV Platform

export const HostDashboard = ({ stations, onAddNewStation }) => {
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [newStation, setNewStation] = React.useState({
    name: '',
    address: '',
    powerKw: 22,
    plugType: 'Type 2 AC',
    pricePerKwh: 7.50,
    availableHours: '08:00 - 22:00',
    description: ''
  });

  // Host metrics summary
  const totalHostEarnings = stations.reduce((acc, st) => acc + (st.totalEarned || 8500), 0);
  const totalKwhShared = Math.round(totalHostEarnings / 7.2);

  // Re-init icons
  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [isAddModalOpen, stations]);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const created = {
      id: 'st-' + Date.now(),
      ...newStation,
      hostName: 'Örnek Ev Sahibi',
      hostRating: 5.0,
      totalReviews: 1,
      lat: 41.0250,
      lng: 29.0400,
      status: 'Available',
      isSolarPowered: true,
      isFastCharger: newStation.powerKw >= 50,
      hostAvatar: '/public/images/station-1.svg',
      stationImage: '/public/images/station-1.svg',
      totalEarned: 0
    };
    onAddNewStation(created);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Host Metrics Header */}
      <div className="glass-panel p-6 rounded-3xl border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
        
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
              HOST MONETIZATION STUDIO
            </span>
            <span className="text-xs text-amber-400 font-mono">⭐ 4.95 Süper Ev Sahibi</span>
          </div>
          <h2 className="font-display font-bold text-2xl text-white">Ev Sahibi Gelir & İstasyon Yönetimi</h2>
          <p className="text-xs text-slate-400">Atıl kalan bireysel şarj soketinizi kiraya vererek aylık pasif gelir elde edin.</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-xl shadow-emerald-500/30 hover:scale-105 transition-all flex items-center space-x-2 whitespace-nowrap"
        >
          <i data-lucide="plus-circle" className="w-5 h-5 fill-slate-950"></i>
          <span>Yeni İstasyon Kiraya Ver</span>
        </button>

      </div>

      {/* Host Analytics KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        <div className="glass-panel p-6 rounded-3xl border-emerald-500/20 space-y-2">
          <span className="text-xs font-mono text-slate-400 block">Toplam Kazanç</span>
          <span className="font-display font-extrabold text-3xl text-emerald-400 text-glow-emerald">
            ₺{totalHostEarnings.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-400 font-mono block">↑ Geçen aya göre %24 artış</span>
        </div>

        <div className="glass-panel p-6 rounded-3xl border-cyan-500/20 space-y-2">
          <span className="text-xs font-mono text-slate-400 block">Paylaşılan Enerji</span>
          <span className="font-display font-extrabold text-3xl text-cyan-400">
            {totalKwhShared.toLocaleString()} kWh
          </span>
          <span className="text-[10px] text-cyan-400 font-mono block">~3.2 Ton CO₂ Karbon Tasarrufu</span>
        </div>

        <div className="glass-panel p-6 rounded-3xl border-purple-500/20 space-y-2">
          <span className="text-xs font-mono text-slate-400 block">Tamamlanan Oturum</span>
          <span className="font-display font-extrabold text-3xl text-purple-400">
            184 Oturum
          </span>
          <span className="text-[10px] text-purple-400 font-mono block">%99.2 Olumlu Sürücü Yorum Oranı</span>
        </div>

      </div>

      {/* Host Charger List */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-white flex items-center space-x-2">
          <i data-lucide="zap" className="w-5 h-5 text-emerald-400"></i>
          <span>Kiraya Verdiğiniz İstasyonlarınız ({stations.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stations.map((st) => (
            <div key={st.id} className="glass-panel p-5 rounded-2xl border-white/10 space-y-4 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <img src={st.stationImage} alt={st.name || "Şarj istasyonu"} className="w-16 h-16 rounded-xl object-cover" />
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {st.powerKw} kW • {st.plugType}
                    </span>
                    <h4 className="font-bold text-sm text-white mt-1">{st.name}</h4>
                    <p className="text-[11px] text-slate-400">{st.availableHours}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono text-slate-400 block">Kazanç</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">₺{(st.totalEarned || 12000).toLocaleString()}</span>
                </div>
              </div>

              {/* Status & Control Row */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-slate-300">Durum: <strong className="text-emerald-400">{st.status}</strong></span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">Birim Fiyat:</span>
                  <span className="text-white font-bold">₺{st.pricePerKwh}/kWh</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Charger Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleAddSubmit} className="glass-panel-glow p-6 rounded-3xl max-w-lg w-full space-y-4 border-emerald-500/40 relative">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <h3 className="font-display font-bold text-xl text-white">Yeni Şarj İstasyonu Ekle</h3>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300">İstasyon Başlığı</label>
              <input
                type="text"
                required
                placeholder="Örn: Kadıköy Moda Kapalı Garaj Wallbox"
                value={newStation.name}
                onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                className="w-full p-2.5 rounded-xl glass-input text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300">Açık Adres</label>
              <input
                type="text"
                required
                placeholder="Örn: Örnek Mah. Örnek Sk. No:1, Kadıköy / İstanbul"
                value={newStation.address}
                onChange={(e) => setNewStation({ ...newStation, address: e.target.value })}
                className="w-full p-2.5 rounded-xl glass-input text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Güç (kW)</label>
                <select
                  value={newStation.powerKw}
                  onChange={(e) => setNewStation({ ...newStation, powerKw: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                >
                  <option value={11} className="bg-slate-900">11 kW AC Wallbox</option>
                  <option value={22} className="bg-slate-900">22 kW AC Fast</option>
                  <option value={50} className="bg-slate-900">50 kW DC Fast</option>
                  <option value={150} className="bg-slate-900">150 kW Ultra DC</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Soket Tipi</label>
                <select
                  value={newStation.plugType}
                  onChange={(e) => setNewStation({ ...newStation, plugType: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                >
                  <option value="Type 2 AC" className="bg-slate-900">Type 2 AC</option>
                  <option value="CCS2 DC" className="bg-slate-900">CCS2 DC</option>
                  <option value="NACS" className="bg-slate-900">NACS (Kuzey Amerika)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">kWh Fiyatı (₺)</label>
                <input
                  type="number"
                  step="0.10"
                  value={newStation.pricePerKwh}
                  onChange={(e) => setNewStation({ ...newStation, pricePerKwh: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Müsait Saatler</label>
                <input
                  type="text"
                  value={newStation.availableHours}
                  onChange={(e) => setNewStation({ ...newStation, availableHours: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/30 mt-2"
            >
              İstasyon İlanını Yayınla
            </button>
          </form>
        </div>
      )}

    </div>
  );
};

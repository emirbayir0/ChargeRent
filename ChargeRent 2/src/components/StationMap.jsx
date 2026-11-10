// StationMap Component for VoltShare EV Platform

export const StationMap = ({ stations, setSelectedStation, onBookClick, onStartChargingClick }) => {
  const [filterPlug, setFilterPlug] = React.useState('All');
  const [filterPower, setFilterPower] = React.useState('All');
  const [filterSolarOnly, setFilterSolarOnly] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeStationModal, setActiveStationModal] = React.useState(null);

  const mapRef = React.useRef(null);
  const leafletMap = React.useRef(null);

  // Filter logic
  const filteredStations = React.useMemo(() => {
    return stations.filter((st) => {
      const matchPlug = filterPlug === 'All' || st.plugType.includes(filterPlug);
      const matchPower =
        filterPower === 'All' ||
        (filterPower === 'Fast' && st.powerKw >= 50) ||
        (filterPower === 'Standard' && st.powerKw < 50);
      const matchSolar = !filterSolarOnly || st.isSolarPowered;
      const matchSearch =
        st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.hostName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchPlug && matchPower && matchSolar && matchSearch;
    });
  }, [stations, filterPlug, filterPower, filterSolarOnly, searchQuery]);

  // Leaflet Map Initialization & Markers
  React.useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      // Center Istanbul
      leafletMap.current = L.map(mapRef.current, {
        center: [41.03, 29.02],
        zoom: 12,
        zoomControl: false
      });

      // Dark Matter Map Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; VoltShare EV Map',
        maxZoom: 19
      }).addTo(leafletMap.current);

      L.control.zoom({ position: 'topright' }).addTo(leafletMap.current);
    }

    // Clear existing markers
    leafletMap.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        leafletMap.current.removeLayer(layer);
      }
    });

    // Add Station Markers
    filteredStations.forEach((st) => {
      const iconHtml = `
        <div class="relative group cursor-pointer">
          <div class="w-10 h-10 rounded-2xl ${
            st.status === 'Available' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-amber-500 shadow-amber-500/50'
          } p-0.5 shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center text-slate-950 font-bold">
            <div class="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-white">
              <span class="text-xs font-mono font-bold ${st.status === 'Available' ? 'text-emerald-400' : 'text-amber-400'}">${st.powerKw}k</span>
            </div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-map-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const marker = L.marker([st.lat, st.lng], { icon: customIcon }).addTo(leafletMap.current);

      marker.on('click', () => {
        setActiveStationModal(st);
      });
    });
  }, [filteredStations]);

  // Re-initialize Lucide Icons
  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [filteredStations, activeStationModal]);

  return (
    <div className="space-y-6">
      
      {/* Top Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-4 border-emerald-500/20">
        
        {/* Search Input */}
        <div className="relative w-full lg:w-96">
          <i data-lucide="search" className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input
            type="text"
            placeholder="İstasyon adı, semt veya ev sahibi ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl glass-input text-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Plug Type */}
          <div className="flex items-center space-x-1 glass-panel p-1 rounded-xl text-xs">
            <span className="text-slate-400 px-2 font-mono">Soket:</span>
            {['All', 'Type 2', 'CCS2', 'NACS'].map((plug) => (
              <button
                key={plug}
                onClick={() => setFilterPlug(plug)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterPlug === plug
                    ? 'bg-emerald-500 text-black font-semibold shadow-md shadow-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {plug}
              </button>
            ))}
          </div>

          {/* Power Rating */}
          <div className="flex items-center space-x-1 glass-panel p-1 rounded-xl text-xs">
            <span className="text-slate-400 px-2 font-mono">Güç:</span>
            {['All', 'Fast', 'Standard'].map((pow) => (
              <button
                key={pow}
                onClick={() => setFilterPower(pow)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterPower === pow
                    ? 'bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {pow === 'Fast' ? '⚡ 50kW+ DC' : pow === 'Standard' ? '🔌 AC Wallbox' : 'Tümü'}
              </button>
            ))}
          </div>

          {/* Solar Filter Toggle */}
          <button
            onClick={() => setFilterSolarOnly(!filterSolarOnly)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center space-x-2 ${
              filterSolarOnly
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/20'
                : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
            }`}
          >
            <i data-lucide="sun" className="w-4 h-4 text-amber-400"></i>
            <span>Güneş Enerjisi (Solar)</span>
          </button>
        </div>

      </div>

      {/* Main Grid: Interactive Map + Station Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Interactive Map View */}
        <div className="lg:col-span-7 h-[600px] rounded-3xl overflow-hidden glass-panel border-emerald-500/20 relative">
          <div ref={mapRef} className="w-full h-full"></div>
          
          {/* Floating Map Legend */}
          <div className="absolute bottom-4 left-4 z-[400] glass-panel p-3 rounded-2xl text-xs flex items-center space-x-4 border-white/10">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-slate-300 font-mono text-[11px]">Müsait ({filteredStations.filter(s => s.status === 'Available').length})</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-slate-300 font-mono text-[11px]">Kullanımda / Rezerve</span>
            </div>
          </div>
        </div>

        {/* Station Cards Scroll List */}
        <div className="lg:col-span-5 h-[600px] overflow-y-auto pr-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-white flex items-center space-x-2">
              <span>Yakındaki Özel Şarj Noktaları</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {filteredStations.length} İstasyon
              </span>
            </h3>
          </div>

          {filteredStations.map((st) => (
            <div
              key={st.id}
              onClick={() => setActiveStationModal(st)}
              className="glass-panel p-5 rounded-2xl hover:border-emerald-500/40 transition-all duration-300 cursor-pointer group hover:shadow-xl hover:shadow-emerald-500/5 relative overflow-hidden"
            >
              {/* Solar Badge */}
              {st.isSolarPowered && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-black font-bold text-[10px] px-3 py-1 rounded-bl-xl font-mono flex items-center space-x-1">
                  <i data-lucide="sun" className="w-3 h-3"></i>
                  <span>SOLAR ECO</span>
                </div>
              )}

              <div className="flex items-start space-x-4">
                <img
                  src={st.stationImage}
                  alt={st.name}
                  className="w-20 h-20 rounded-xl object-cover ring-1 ring-white/10 group-hover:scale-105 transition-transform"
                />

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                      st.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {st.status === 'Available' ? '● MÜSAİT' : '● DOLU'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">⭐ {st.hostRating} ({st.totalReviews})</span>
                  </div>

                  <h4 className="font-display font-bold text-base text-white group-hover:text-emerald-400 transition-colors">
                    {st.name}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-1 flex items-center space-x-1">
                    <i data-lucide="map-pin" className="w-3.5 h-3.5 text-slate-500"></i>
                    <span>{st.address}</span>
                  </p>

                  {/* Specs Pill Row */}
                  <div className="pt-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold border border-cyan-500/30">
                        ⚡ {st.powerKw} kW
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        🔌 {st.plugType}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold font-mono text-emerald-400">₺{st.pricePerKwh.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 font-mono">/kWh</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Station Details & Quick Action Modal */}
      {activeStationModal && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-glow p-6 rounded-3xl max-w-lg w-full space-y-5 border-emerald-500/40 relative animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setActiveStationModal(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
            >
              ✕
            </button>

            {/* Station Header */}
            <div className="flex items-center space-x-4">
              <img src={activeStationModal.stationImage} alt={activeStationModal.name || "Şarj istasyonu"} className="w-24 h-24 rounded-2xl object-cover ring-2 ring-emerald-500/30" />
              <div>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  {activeStationModal.powerKw} kW Hızlı Şarj
                </span>
                <h3 className="font-display font-bold text-xl text-white mt-1">{activeStationModal.name}</h3>
                <p className="text-xs text-slate-400">{activeStationModal.address}</p>
              </div>
            </div>

            {/* Host info */}
            <div className="glass-panel p-3 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <img src={activeStationModal.hostAvatar} alt={activeStationModal.hostName || "Ev sahibi avatarı"} className="w-9 h-9 rounded-full object-cover" />
                <div>
                  <p className="font-bold text-white">{activeStationModal.hostName}</p>
                  <p className="text-slate-400">Onaylı Süper Ev Sahibi</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-amber-400 font-bold font-mono text-sm">⭐ {activeStationModal.hostRating}</span>
                <p className="text-[10px] text-slate-400">{activeStationModal.totalReviews} Değerlendirme</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-white/5">
              {activeStationModal.description}
            </p>

            {/* Price & Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div>
                <span className="text-xs text-slate-400 block font-mono">Birim Fiyat</span>
                <span className="text-xl font-bold font-mono text-emerald-400">₺{activeStationModal.pricePerKwh.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/kWh</span></span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const st = activeStationModal;
                    setActiveStationModal(null);
                    onBookClick(st);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-all border border-white/10 flex items-center space-x-2"
                >
                  <i data-lucide="calendar" className="w-4 h-4"></i>
                  <span>Randevu Al</span>
                </button>

                <button
                  onClick={() => {
                    const st = activeStationModal;
                    setActiveStationModal(null);
                    onStartChargingClick(st);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all flex items-center space-x-2"
                >
                  <i data-lucide="zap" className="w-4 h-4 fill-slate-950"></i>
                  <span>Hemen Şarj Et</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

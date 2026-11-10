// Navbar Component for VoltShare EV Platform

export const Navbar = ({ activeTab, setActiveTab, activeSession }) => {
  const tabs = [
    { id: 'map', label: 'Harita & İnanlar', icon: 'map-pin' },
    { id: 'telemetry', label: 'Canlı Telemetri', icon: 'activity', badge: activeSession ? 'CANLI' : null },
    { id: 'booking', label: 'Randevu Sihirbazı', icon: 'calendar' },
    { id: 'host', label: 'Ev Sahibi Paneli', icon: 'home' },
    { id: 'route', label: 'AI Rota Planlayıcı', icon: 'navigation' },
    { id: 'arch', label: 'System Architecture', icon: 'cpu', highlight: true }
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-emerald-500/20 bg-obsidian/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('map')}>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/30">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <i data-lucide="zap" className="w-6 h-6 text-emerald-400 fill-emerald-400/20 animate-pulse"></i>
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display font-extrabold text-2xl tracking-tight text-white">Volt<span className="text-emerald-400">Share</span></span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">P2P v2.4</span>
            </div>
            <p className="text-xs text-slate-400 font-sans font-normal">Bireysel EV Şarj & Telemetri Ağı</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 glass-panel p-1.5 rounded-2xl border-white/10">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2 rounded-xl font-medium text-xs sm:text-sm transition-all duration-300 flex items-center space-x-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                } ${tab.highlight ? 'border border-amber-500/40 text-amber-300 hover:bg-amber-500/10' : ''}`}
              >
                <i data-lucide={tab.icon} className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}></i>
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold font-mono bg-emerald-500 text-black rounded-full animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Status Badge & OCPP Indicator */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-mono text-slate-300 text-[11px]">OCPP 2.0.1: <span className="text-emerald-400 font-bold">ONLINE</span></span>
          </div>

          <div className="flex items-center space-x-3 pl-2 border-l border-white/10">
            <img
              src="/public/images/station-1.svg"
              alt="Kullanıcı avatarı"
              className="w-9 h-9 rounded-full ring-2 ring-emerald-500/40 object-cover"
            />
          </div>
        </div>

      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex items-center justify-around py-2 px-2 border-t border-white/10 bg-slate-950/90 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex flex-col items-center space-y-1 ${
              activeTab === tab.id ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400'
            }`}
          >
            <i data-lucide={tab.icon} className="w-4 h-4"></i>
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
};

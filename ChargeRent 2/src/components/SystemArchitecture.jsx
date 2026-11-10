// SystemArchitecture Component for LinkedIn Showcase

import { ARCHITECTURE_NODES } from '../data/mockData.js';

export const SystemArchitecture = () => {
  const [selectedNode, setSelectedNode] = React.useState(ARCHITECTURE_NODES[0]);

  // Re-init icons
  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [selectedNode]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* LinkedIn Pitch Banner */}
      <div className="glass-panel-glow p-8 rounded-3xl border-amber-500/40 text-center space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 font-bold text-xs px-4 py-1.5 rounded-bl-2xl font-mono">
          LINKEDIN SYSTEM DESIGN SHOWCASE
        </div>

        <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
          DISTRIBUTED SYSTEM ARCHITECTURE
        </span>
        <h2 className="font-display font-extrabold text-3xl text-white">Sistem Mimarisi & Mühendislik Detayları</h2>
        <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
          VoltShare EV platformu yüksek ölçeklenebilir, dağıtık ve düşük gecikmeli IoT telemetri mimarisi üzerine inşa edilmiştir. Mülakatlarda ve teknik sunumlarda incelenebilecek sistem parçaları:
        </p>
      </div>

      {/* System Diagram Flow Visualizer */}
      <div className="glass-panel p-6 rounded-3xl space-y-6 border-white/10">
        
        <h3 className="font-display font-bold text-lg text-white flex items-center space-x-2">
          <i data-lucide="layers" className="w-5 h-5 text-amber-400"></i>
          <span>Dağıtık Veri Akış Haritası (Data Flow Map)</span>
        </h3>

        {/* Horizontal Flow Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {ARCHITECTURE_NODES.map((node) => {
            const isSelected = selectedNode.id === node.id;
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer space-y-2 relative ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-xl shadow-amber-500/10 scale-105'
                    : 'glass-panel border-white/10 hover:border-white/20 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">{node.category}</span>
                  <i data-lucide={node.icon} className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}></i>
                </div>
                <h4 className="font-bold text-xs text-white truncate">{node.title}</h4>
                <p className="text-[10px] text-slate-400 line-clamp-2">{node.description}</p>
              </div>
            );
          })}
        </div>

        {/* Selected Node Technical Details Drawer */}
        <div className="glass-panel-glow p-6 rounded-2xl border-amber-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <i data-lucide={selectedNode.icon} className="w-5 h-5"></i>
              </div>
              <div>
                <span className="text-xs font-mono text-amber-400 font-bold">{selectedNode.category}</span>
                <h3 className="font-display font-bold text-xl text-white">{selectedNode.title}</h3>
              </div>
            </div>

            <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-900 text-slate-300 border border-white/10">
              HIGH SCALABILITY MODULE
            </span>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-white/5">
            {selectedNode.description}
          </p>

          <div className="space-y-1">
            <span className="text-xs font-mono text-slate-400">Teknik İmplementasyon Detayı:</span>
            <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/30 font-mono text-xs text-amber-300 overflow-x-auto">
              <code>{selectedNode.techDetails}</code>
            </div>
          </div>
        </div>

      </div>

      {/* Code Snippet Preview for Tech Lead Interviews */}
      <div className="glass-panel p-6 rounded-3xl space-y-4 border-emerald-500/20">
        <h3 className="font-display font-bold text-base text-white flex items-center space-x-2">
          <i data-lucide="code" className="w-5 h-5 text-emerald-400"></i>
          <span>PostGIS Sub-Second Geo-Query Example</span>
        </h3>

        <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
          <pre>{`-- PostGIS Geo-Radius Query for Available EV Charging Stations
SELECT st.id, st.name, st.power_kw, st.price_per_kwh,
       ST_Distance(st.location, ST_MakePoint($user_lng, $user_lat)::geography) AS distance_meters
FROM charging_stations st
JOIN station_sockets socket ON socket.station_id = st.id
WHERE ST_DWithin(st.location, ST_MakePoint($user_lng, $user_lat)::geography, 5000)
  AND socket.status = 'Available'
  AND st.power_kw >= 22
ORDER BY distance_meters ASC
LIMIT 20;`}</pre>
        </div>
      </div>

    </div>
  );
};

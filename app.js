const { useState, useEffect, useMemo } = React;

const API_BASE = "https://api.modrinth.com/v2";
const PROJECT_TYPES = [
  { id: 'mod', label: 'Mods', icon: '🧩' },
  { id: 'plugin', label: 'Plugins', icon: '⚙️' },
  { id: 'datapack', label: 'Datapacks', icon: '💾' },
  { id: 'shader', label: 'Shaders', icon: '☀️' },
  { id: 'resourcepack', label: 'Resource Packs', icon: '🎨' },
  { id: 'modpack', label: 'Modpacks', icon: '📦' },
  { id: 'server', label: 'Servers', icon: '🖥️' }
];

const App = () => {
  const [view, setView] = useState('setup'); 
  const [userDateStr, setUserDateStr] = useState('');
  const [selectedType, setSelectedType] = useState('modpack');
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const searchRes = await fetch(`${API_BASE}/search?limit=20&index=newest&facets=[["project_type:${selectedType}"]]`);
      if (!searchRes.ok) throw new Error("Search API failed");
      const searchData = await searchRes.json();

      const details = await Promise.all(searchData.hits.map(async (hit) => {
        try {
          const pRes = await fetch(`${API_BASE}/project/${hit.project_id}`);
          const pData = pRes.ok ? await pRes.json() : { published: hit.date_created };
          return {
            id: hit.project_id,
            title: hit.title,
            queued: new Date(pData.published),
            approved: new Date(hit.date_created)
          };
        } catch {
          return {
            id: hit.project_id,
            title: hit.title,
            queued: new Date(hit.date_created),
            approved: new Date(hit.date_created)
          };
        }
      }));

      setProjects(details.sort((a, b) => b.queued - a.queued));
    } catch (err) {
      setError("Rate limited or connection error. Try again in a sec.");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    setView('dashboard');
    fetchData();
  };

  const stats = useMemo(() => {
    if (projects.length < 2) return null;

    const waits = projects.map(p => p.approved.getTime() - p.queued.getTime()).sort((a, b) => a - b);
    const medianWaitMillis = waits[Math.floor(waits.length / 2)];
    const avgWaitDays = medianWaitMillis / (1000 * 60 * 60 * 24);

    const currentQueueFront = new Date(Date.now() - medianWaitMillis);
    const currentLagDays = avgWaitDays;

    let userStats = null;
    if (userDateStr) {
      const userDate = new Date(userDateStr);
      const gapMillis = userDate.getTime() - currentQueueFront.getTime();
      const gapDays = gapMillis / (1000 * 60 * 60 * 24);
      const estimatedApproval = new Date(userDate.getTime() + medianWaitMillis);
      
      userStats = {
        gapDays,
        estimatedApproval,
        isPassed: gapDays <= 0
      };
    }

    return { avgWaitDays, currentLagDays, currentQueueFront, userStats };
  }, [projects, userDateStr]);

  if (view === 'setup') {
    return (
      <div className="min-h-screen bg-[#0b0b0e] text-slate-300 flex items-center justify-center p-6 font-sans">
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <span className="text-3xl">🔮</span>
            <h1 className="text-3xl font-black text-white tracking-tighter">Queue<span className="text-blue-500">Oracle</span></h1>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">When did you queue it? (Optional)</label>
              <input 
                type="datetime-local" 
                value={userDateStr}
                onChange={(e) => setUserDateStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Project Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PROJECT_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${
                      selectedType === type.id 
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <span className="text-lg">{type.icon}</span>
                    <span className="text-xs font-bold truncate">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                onClick={() => { setUserDateStr(''); handleStart(); }}
                className="flex-1 py-4 rounded-xl font-bold border border-slate-700 hover:bg-slate-800 transition-colors"
              >
                Skip Date
              </button>
              <button 
                onClick={handleStart}
                className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
              >
                🚀 Analyze Queue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0e] text-slate-300 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('setup')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
              ⬅️ Back
            </button>
            <div>
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                {PROJECT_TYPES.find(t => t.id === selectedType)?.label} <span className="text-blue-500">Stats</span>
              </h1>
            </div>
          </div>
          <button onClick={fetchData} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors">
            🔄 Refresh
          </button>
        </header>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-3">
            ⚠️ {error}
          </div>
        )}

        {loading && !stats ? (
          <div className="text-center py-20 animate-pulse text-slate-500 font-bold tracking-widest uppercase">
            🚀 Crunching Modrinth API...
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 relative z-10">Avg Processing Time</p>
                <div className="text-5xl font-black text-white relative z-10">
                  {stats.avgWaitDays.toFixed(1)}<span className="text-lg text-slate-500 ml-1">d</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 relative z-10">Median wait time from upload to approval.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 relative z-10">Current Backlog Lag</p>
                <div className="text-5xl font-black text-white relative z-10">
                  {stats.currentLagDays.toFixed(1)}<span className="text-lg text-slate-500 ml-1">d</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 relative z-10">Current depth of the backlog queue.</p>
              </div>

              {stats.userStats && (
                <div className={`bg-slate-900 border rounded-3xl p-6 relative overflow-hidden ${stats.userStats.isPassed ? 'border-emerald-500/30' : 'border-blue-500/30'}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 relative z-10">Your Estimated ETA</p>
                  
                  {stats.userStats.isPassed ? (
                    <div>
                      <div className="text-3xl font-black text-emerald-400 leading-tight relative z-10">Any Minute Now</div>
                      <p className="text-xs text-slate-400 mt-2 relative z-10">The queue front has passed your submission date!</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl font-black text-blue-400 leading-tight relative z-10">
                        {stats.userStats.estimatedApproval.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <p className="text-xs text-slate-400 mt-2 relative z-10">
                        You are approx {stats.userStats.gapDays.toFixed(1)} days behind the front of the queue.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-4">Latest 20 Approvals ({PROJECT_TYPES.find(t => t.id === selectedType)?.label})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projects.map((p, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                    <div className="min-w-0 pr-4">
                      <h4 className="text-sm font-bold text-white truncate">{p.title}</h4>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 flex gap-2">
                        <span>Queued: {p.queued.toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                      <div className="text-xs font-black text-emerald-400">{((p.approved - p.queued) / (1000 * 60 * 60 * 24)).toFixed(1)}d</div>
                      <div className="text-[8px] uppercase font-bold text-slate-500">Wait</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
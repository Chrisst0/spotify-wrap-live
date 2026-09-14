import React, { useEffect, useState } from 'react';
import { Play, BarChart3, User, Music, Clock, LogOut, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalTime: 0,
    topTracks: [],
    activity: []
  });

  const fetchStats = async () => {
    try {
      const data = await (window as any).electronAPI.getStats();
      setStats(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const status = await (window as any).electronAPI.checkAuth();
        setIsAuthenticated(status);
        if (status) {
          await fetchStats();
        }
      } catch (e) {
        console.error('Init failed:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(fetchStats, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await (window as any).electronAPI.signIn();
      setIsAuthenticated(true);
      await fetchStats();
    } catch (e) {
      alert('Authentication failed. Please check the console.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-950 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-green-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center">
        <div className="mb-8 p-4 bg-green-500 rounded-full">
          <Music size={48} className="text-black" />
        </div>
        <h1 className="text-5xl font-black mb-4 tracking-tighter">Spotify Live Wrap</h1>
        <p className="text-zinc-400 mb-8 max-w-md text-lg">
          Your personal Spotify Wrapped, updated in real-time. Track every second of your musical journey.
        </p>
        <button 
          onClick={handleSignIn}
          className="bg-green-500 hover:bg-green-400 text-black font-bold py-4 px-8 rounded-full text-xl transition-all transform hover:scale-105 active:scale-95"
        >
          Connect Spotify
        </button>
      </div>
    );
  }

  const formatMs = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2">
            <Music className="text-green-500" /> Spotify Live Wrap
          </h1>
          <div className="flex items-center gap-2 text-zinc-500">
            <p>Real-time listening insights</p>
            {lastUpdated && (
              <span className="flex items-center gap-1 text-xs bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">
                <RefreshCw size={10} className="animate-spin-slow" />
                Last update: {lastUpdated}
              </span>
            )}
          </div>
        </div>
        <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
          <LogOut size={20} /> Sign Out
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard icon={<Clock className="text-blue-400" />} label="Total Time" value={formatMs(stats.totalTime)} sub="All time" />
        <StatCard icon={<Music className="text-green-400" />} label="Tracks Tracked" value={stats.topTracks.length.toString()} sub="Unique songs" />
        <StatCard icon={<User className="text-purple-400" />} label="Status" value="Live" sub="Tracking active" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <BarChart3 size={20} className="text-green-500" /> Listening Activity
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.activity}>
                <XAxis dataKey="day" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Line type="monotone" dataKey="duration" stroke="#22c55e" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Play size={20} className="text-green-500" /> Top Tracks (by Time)
          </h3>
          <div className="space-y-4">
            {stats.topTracks.map((track, i) => (
              <div key={i} className="flex items-center justify-between p-3 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <span className="text-zinc-600 font-mono w-4">{i + 1}</span>
                  <div className="overflow-hidden">
                    <p className="font-medium truncate">{track.name || `Track ${track.id.substring(0, 8)}...`}</p>
                    <p className="text-xs text-zinc-500 truncate">ID: {track.id}</p>
                  </div>
                </div>
                <span className="text-zinc-400 text-sm font-mono">{formatMs(track.duration)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode, label: string, value: string, sub: string }) {
  return (
    <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 hover:border-zinc-700 transition-all">
      <div className="mb-4">{icon}</div>
      <p className="text-zinc-500 text-sm font-medium">{label}</p>
      <h2 className="text-3xl font-black mb-1">{value}</h2>
      <p className="text-xs text-zinc-600">{sub}</p>
    </div>
  );
}

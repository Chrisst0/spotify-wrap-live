import React, { useEffect, useState } from 'react';
import { Play, BarChart3, User, Music, Clock, LogOut, RefreshCw, Cloud, PieChart, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'dashboard' | 'story'>('dashboard');
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalTime: 0,
    totalTracks: 0,
    totalArtists: 0,
    topTracks: [],
    topArtists: [],
    activity: [],
    topGenres: []
  });
  const [currentTrack, setCurrentTrack] = useState<{
    name: string;
    artist: string;
    albumArt: string;
    isPlaying: boolean;
  } | null>(null);

  const CLOUD_API_URL = 'http://92.4.165.12:3000'; 

  const fetchStats = async () => {
    try {
      const response = await fetch(`${CLOUD_API_URL}/stats`);
      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  const fetchCurrentTrack = async () => {
    try {
      const response = await fetch(`${CLOUD_API_URL}/current`);
      const data = await response.json();
      if (data.isPlaying && data.track) {
        setCurrentTrack({
          name: data.track.name,
          artist: data.track.artist,
          albumArt: data.track.albumArt,
          isPlaying: true
        });
      } else {
        setCurrentTrack(null);
      }
    } catch (e) {
      console.error('Failed to fetch current track:', e);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const status = await (window as any).electronAPI.checkAuth();
        setIsAuthenticated(status);
        if (status) {
          fetchStats();
          fetchCurrentTrack();
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
      const statsInterval = setInterval(fetchStats, 5000);
      const trackInterval = setInterval(fetchCurrentTrack, 3000);
      return () => {
        clearInterval(statsInterval);
        clearInterval(trackInterval);
      };
    }
  }, [isAuthenticated]);

  const syncTokenToCloud = async () => {
    try {
      const token = await (window as any).electronAPI.getAccessToken();
      const expiresAt = await (window as any).electronAPI.getTokenExpiration();
      const refreshToken = await (window as any).electronAPI.getRefreshToken();
      
      const response = await fetch(`${CLOUD_API_URL}/sync-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          access_token: token, 
          refresh_token: refreshToken, 
          expires_at: expiresAt 
        })
      });
      
      if (response.ok) {
        alert('Cloud Sync Successful! Your server is now tracking 24/7.');
      } else {
        alert('Sync failed. Check server logs.');
      }
    } catch (e) {
      alert('Error syncing token: ' + e);
    }
  };

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

  const formatMs = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#f59e0b', '#ec4899'];

  const StoryView = () => {
    const [progress, setProgress] = useState(0);
    const STORY_DURATION = 5000;

    const stories = [
      {
        id: 'intro',
        title: 'Your Live Wrapped',
        content: () => (
          <div className="text-center space-y-6">
            <div className="relative inline-block">
              <div className="absolute -inset-4 bg-green-500 blur-2xl opacity-30 animate-pulse" />
              <Music size={80} className="text-green-500 relative" />
            </div>
            <h2 className="text-6xl font-black tracking-tighter leading-none">
              Always <br /> <span className="text-green-500">Running.</span>
            </h2>
            <p className="text-xl text-zinc-400 max-w-md mx-auto">
              Your listening habits, tracked second by second.
            </p>
          </div>
        ),
        bg: 'bg-zinc-950'
      },
      {
        id: 'time',
        title: 'Total Time',
        content: () => (
          <div className="text-center space-y-4">
            <p className="text-2xl font-bold text-zinc-400 uppercase tracking-widest">Total Listening</p>
            <h2 className="text-9xl font-black tracking-tighter text-white leading-none">
              {formatMs(stats.totalTime)}
            </h2>
            <p className="text-xl text-zinc-500 font-medium">of pure musical bliss</p>
          </div>
        ),
        bg: 'bg-blue-900/20'
      },
      {
        id: 'artist',
        title: 'Top Artist',
        content: () => {
          const topArtist = stats.topArtists[0];
          return (
            <div className="flex flex-col items-center text-center space-y-8">
              <div className="relative">
                <div className="absolute -inset-8 bg-purple-500 blur-3xl opacity-30 animate-pulse" />
                <img 
                  src={topArtist?.image || 'https://via.placeholder.com/200'} 
                  className="w-64 h-64 rounded-full object-cover relative border-8 border-zinc-900 shadow-2xl" 
                  alt={topArtist?.name} 
                />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-zinc-400">Your #1 Artist</p>
                <h2 className="text-6xl font-black tracking-tighter text-white">{topArtist?.name || 'Unknown'}</h2>
              </div>
            </div>
          );
        },
        bg: 'bg-purple-900/20'
      },
      {
        id: 'tracks',
        title: 'Top Tracks',
        content: () => (
          <div className="w-full max-w-lg mx-auto space-y-6">
            <p className="text-2xl font-bold text-zinc-400 text-center mb-8 uppercase tracking-widest">Most Played</p>
            <div className="space-y-4">
              {stats.topTracks.slice(0, 5).map((track, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-zinc-600 w-8">{i + 1}</span>
                    <img src={track.image || 'https://via.placeholder.com/48'} className="w-12 h-12 rounded-lg object-cover" />
                    <p className="font-bold text-zinc-100 truncate max-w-[200px]">{track.name}</p>
                  </div>
                  <span className="text-zinc-500 font-mono text-sm">{formatMs(track.duration)}</span>
                </div>
              ))}
            </div>
          </div>
        ),
        bg: 'bg-green-900/20'
      }
    ];

    useEffect(() => {
      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) return 100;
          // Calculate increment based on current duration to be precise
          return prev + (100 / (STORY_DURATION / 100));
        });
      }, 100);

      const autoAdvance = setTimeout(() => {
        setCurrentStoryIndex(idx => (idx < stories.length - 1 ? idx + 1 : 0));
      }, STORY_DURATION);

      return () => {
        clearInterval(timer);
        clearTimeout(autoAdvance);
      };
    }, [currentStoryIndex]);

    // Reset progress when story changes
    useEffect(() => {
      setProgress(0);
    }, [currentStoryIndex]);

    const current = stories[currentStoryIndex];

    return (
      <div className={`fixed inset-0 z-50 ${current.bg} transition-colors duration-700 flex items-center justify-center p-8`}>
        <div className="absolute top-8 left-0 right-0 flex gap-2 px-8 z-50">
          {stories.map((_, i) => (
            <div key={i} className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-white transition-all duration-100 ease-linear ${i < currentStoryIndex ? 'w-full' : i === currentStoryIndex ? `w-[${progress}%]` : 'w-0'}`} 
                style={{ width: i < currentStoryIndex ? '100%' : i === currentStoryIndex ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>
        <button 
          onClick={() => setViewMode('dashboard')}
          className="absolute top-8 right-8 p-2 text-zinc-400 hover:text-white transition-colors z-50"
        >
          <X size={32} />
        </button>
        <div className="absolute inset-0 flex justify-between items-center px-4 pointer-events-none">
          <button 
            onClick={() => setCurrentStoryIndex(prev => Math.max(0, prev - 1))}
            className="p-4 text-white/30 hover:text-white transition-colors pointer-events-auto"
            disabled={currentStoryIndex === 0}
          >
            <ChevronLeft size={48} />
          </button>
          <button 
            onClick={() => setCurrentStoryIndex(prev => Math.min(stories.length - 1, prev + 1))}
            className="p-4 text-white/30 hover:text-white transition-colors pointer-events-auto"
            disabled={currentStoryIndex === stories.length - 1}
          >
            <ChevronRight size={48} />
          </button>
        </div>
        <div className="relative z-10 w-full max-w-4xl animate-in fade-in zoom-in duration-500 key={currentStoryIndex}">
          {current.content()}
        </div>
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500/20 backdrop-blur-md px-4 py-2 rounded-full border border-red-500/30 text-red-500 font-bold text-xs uppercase tracking-widest animate-pulse">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          Live Wrapped
        </div>
      </div>
    );
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

  if (viewMode === 'story') {
    return <StoryView />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans relative overflow-hidden">
      <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-green-600/20 blur-[150px] rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-700/20 blur-[150px] rounded-full animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
      <div className="absolute -bottom-[10%] left-[10%] w-[50%] h-[50%] bg-blue-700/20 blur-[150px] rounded-full animate-pulse" style={{ animationDuration: '10s', animationDelay: '4s' }} />

      <header className="relative z-10 flex justify-between items-center mb-16">
        <div className="flex items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3 text-white">
              <Music className="text-green-500" size={32} /> Spotify Live Wrap
            </h1>
            <div className="flex items-center gap-2 text-zinc-500 font-medium">
              <p className="text-sm uppercase tracking-widest">Real-time listening insights</p>
              {lastUpdated && (
                <span className="flex items-center gap-1 text-[10px] bg-zinc-900/50 backdrop-blur-sm px-2 py-0.5 rounded-full border border-zinc-800">
                  <RefreshCw size={10} className="animate-spin-slow" />
                  Last update: {lastUpdated}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setViewMode('story')}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black text-xs font-bold py-2 px-4 rounded-full transition-all shadow-lg shadow-green-500/20"
            >
              <Play size={14} fill="currentColor" /> View Live Wrapped
            </button>
            <button 
              onClick={syncTokenToCloud}
              className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold py-2 px-4 rounded-full transition-all shadow-lg shadow-green-500/10"
            >
              <Cloud size={14} /> Sync to Cloud
            </button>
          </div>
        </div>
        <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-medium">
          <LogOut size={20} /> Sign Out
        </button>
      </header>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <StatCard icon={<Clock className="text-blue-400" />} label="Total Time" value={formatMs(stats.totalTime)} sub="All time" />
        <StatCard icon={<Music className="text-green-400" />} label="Tracks Tracked" value={stats.totalTracks.toString()} sub="Unique songs" />
        <StatCard icon={<User className="text-purple-400" />} label="Top Artists" value={stats.totalArtists.toString()} sub="Most played" />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2rem] border border-zinc-800/50 shadow-2xl">
          <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 text-white">
            <BarChart3 size={24} className="text-green-500" /> Listening Activity
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.activity}>
                <XAxis dataKey="day" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }} 
                  formatter={(value) => [formatMs(Number(value)), 'Duration']}
                />
                <Line type="monotone" dataKey="duration" stroke="#22c55e" strokeWidth={4} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2rem] border border-zinc-800/50 shadow-2xl">
          <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 text-white">
            <PieChart size={24} className="text-green-500" /> Top Genres
          </h3>
          <div className="h-72 w-full flex flex-col items-center justify-center">
            {stats.topGenres && stats.topGenres.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <RechartsPieChart>
                    <Pie 
                      data={stats.topGenres} 
                      innerRadius={70} 
                      outerRadius={90} 
                      paddingAngle={8} 
                      dataKey="value"
                    >
                      {stats.topGenres.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="mt-6 grid grid-cols-2 gap-3 w-full">
                  {stats.topGenres.map((genre, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-medium">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-zinc-400 truncate">{genre.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-zinc-500 text-sm italic">{stats.topArtists?.length > 0 ? 'No genre data available' : 'Collecting genre data...'}</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2rem] border border-zinc-800/50 shadow-2xl">
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 text-white">
              <Play size={24} className="text-green-500" /> Top Tracks (by Time)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              {stats.topTracks.map((track, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-800/30 hover:bg-zinc-800/60 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-zinc-700 group">
                  <div className="flex items-center gap-5">
                    <img src={track.image || 'https://via.placeholder.com/48'} className="w-14 h-14 rounded-xl object-cover bg-zinc-700 group-hover:scale-105 transition-transform" alt="Album Art" />
                    <div className="overflow-hidden">
                      <p className="font-bold truncate text-zinc-100 group-hover:text-green-400 transition-colors">{track.name || `Track ${track.id.substring(0, 8)}...`}</p>
                      <p className="text-xs text-zinc-500 truncate font-medium">ID: {track.id}</p>
                    </div>
                  </div>
                  <span className="text-zinc-400 text-sm font-mono bg-zinc-900/50 px-3 py-1 rounded-full">{formatMs(track.duration)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2rem] border border-zinc-800/50 shadow-2xl">
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 text-white">
              <User size={24} className="text-green-500" /> Top Artists
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {stats.topArtists?.map((artist, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-800/30 hover:bg-zinc-800/60 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-zinc-700 group">
                  <div className="flex items-center gap-5">
                    <img src={artist.image || 'https://via.placeholder.com/48'} className="w-14 h-14 rounded-full object-cover bg-zinc-700 group-hover:scale-105 transition-transform" alt="Artist Art" />
                    <div className="overflow-hidden">
                      <p className="font-bold truncate text-zinc-100 group-hover:text-green-400 transition-colors">{artist.name || `Unknown Artist (${artist.id.substring(0, 8)})`}</p>
                    </div>
                  </div>
                  <span className="text-zinc-400 text-sm font-mono bg-zinc-900/50 px-3 py-1 rounded-full">{formatMs(artist.duration)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode, label: string, value: string, sub: string }) {
  return (
    <div className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2rem] border border-zinc-800/50 hover:border-zinc-700 transition-all shadow-2xl group">
      <div className="mb-6 p-3 bg-zinc-800/50 w-fit rounded-2xl group-hover:scale-110 transition-transform">{icon}</div>
      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-1">{label}</p>
      <h2 className="text-4xl font-black mb-2 text-white tracking-tighter">{value}</h2>
      <p className="text-xs text-zinc-600 font-medium">{sub}</p>
    </div>
  );
}

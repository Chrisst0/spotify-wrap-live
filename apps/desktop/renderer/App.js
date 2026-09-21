import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Play, BarChart3, User, Music, Clock, LogOut, RefreshCw, CloudUpload, PieChart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [stats, setStats] = useState({
        totalTime: 0,
        topTracks: [],
        activity: [],
        topGenres: []
    });
    // CHANGE THIS to your Oracle IP!
    const CLOUD_API_URL = 'http://92.4.165.12:3000';
    const fetchStats = async () => {
        try {
            const response = await fetch(`${CLOUD_API_URL}/stats`);
            const data = await response.json();
            setStats(data);
            setLastUpdated(new Date().toLocaleTimeString());
        }
        catch (e) {
            console.error('Failed to fetch stats:', e);
        }
    };
    useEffect(() => {
        async function init() {
            try {
                const status = await window.electronAPI.checkAuth();
                setIsAuthenticated(status);
                if (status) {
                    await fetchStats();
                }
            }
            catch (e) {
                console.error('Init failed:', e);
            }
            finally {
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
    const syncTokenToCloud = async () => {
        try {
            const token = await window.electronAPI.getAccessToken();
            const expiresAt = await window.electronAPI.getTokenExpiration();
            const response = await fetch(`${CLOUD_API_URL}/sync-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: token, expires_at: expiresAt })
            });
            if (response.ok) {
                alert('Cloud Sync Successful! Your server is now tracking.');
            }
            else {
                alert('Sync failed. Check server logs.');
            }
        }
        catch (e) {
            alert('Error syncing token: ' + e);
        }
    };
    const handleSignIn = async () => {
        setLoading(true);
        try {
            await window.electronAPI.signIn();
            setIsAuthenticated(true);
            await fetchStats();
        }
        catch (e) {
            alert('Authentication failed. Please check the console.');
        }
        finally {
            setLoading(false);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "h-screen w-full flex items-center justify-center bg-zinc-950 text-white", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-t-2 border-green-500" }) }));
    }
    if (!isAuthenticated) {
        return (_jsxs("div", { className: "h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center", children: [_jsx("div", { className: "mb-8 p-4 bg-green-500 rounded-full", children: _jsx(Music, { size: 48, className: "text-black" }) }), _jsx("h1", { className: "text-5xl font-black mb-4 tracking-tighter", children: "Spotify Live Wrap" }), _jsx("p", { className: "text-zinc-400 mb-8 max-w-md text-lg", children: "Your personal Spotify Wrapped, updated in real-time. Track every second of your musical journey." }), _jsx("button", { onClick: handleSignIn, className: "bg-green-500 hover:bg-green-400 text-black font-bold py-4 px-8 rounded-full text-xl transition-all transform hover:scale-105 active:scale-95", children: "Connect Spotify" })] }));
    }
    const formatMs = (ms) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        if (hours > 0)
            return `${hours}h ${minutes}m`;
        if (minutes > 0)
            return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    };
    const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#f59e0b', '#ec4899'];
    return (_jsxs("div", { className: "min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans", children: [_jsxs("header", { className: "flex justify-between items-center mb-12", children: [_jsxs("div", { className: "flex items-center gap-6", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-3xl font-black tracking-tighter flex items-center gap-2", children: [_jsx(Music, { className: "text-green-500" }), " Spotify Live Wrap"] }), _jsxs("div", { className: "flex items-center gap-2 text-zinc-500", children: [_jsx("p", { children: "Real-time listening insights" }), lastUpdated && (_jsxs("span", { className: "flex items-center gap-1 text-xs bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800", children: [_jsx(RefreshCw, { size: 10, className: "animate-spin-slow" }), "Last update: ", lastUpdated] }))] })] }), _jsxs("button", { onClick: syncTokenToCloud, className: "flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold py-2 px-4 rounded-full transition-all border border-zinc-700", children: [_jsx(CloudUpload, { size: 14 }), " Sync to Cloud"] })] }), _jsxs("button", { className: "flex items-center gap-2 text-zinc-400 hover:text-white transition-colors", children: [_jsx(LogOut, { size: 20 }), " Sign Out"] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-12", children: [_jsx(StatCard, { icon: _jsx(Clock, { className: "text-blue-400" }), label: "Total Time", value: formatMs(stats.totalTime), sub: "All time" }), _jsx(StatCard, { icon: _jsx(Music, { className: "text-green-400" }), label: "Tracks Tracked", value: stats.topTracks.length.toString(), sub: "Unique songs" }), _jsx(StatCard, { icon: _jsx(User, { className: "text-purple-400" }), label: "Status", value: "Live", sub: "Tracking active" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsxs("div", { className: "lg:col-span-2 bg-zinc-900 p-6 rounded-3xl border border-zinc-800", children: [_jsxs("h3", { className: "text-xl font-bold mb-6 flex items-center gap-2", children: [_jsx(BarChart3, { size: 20, className: "text-green-500" }), " Listening Activity"] }), _jsx("div", { className: "h-64 w-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: stats.activity, children: [_jsx(XAxis, { dataKey: "day", stroke: "#52525b", fontSize: 12, tickLine: false, axisLine: false }), _jsx(YAxis, { hide: true }), _jsx(Tooltip, { contentStyle: { backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' } }), _jsx(Line, { type: "monotone", dataKey: "duration", stroke: "#22c55e", strokeWidth: 3, dot: false })] }) }) })] }), _jsxs("div", { className: "bg-zinc-900 p-6 rounded-3xl border border-zinc-800", children: [_jsxs("h3", { className: "text-xl font-bold mb-6 flex items-center gap-2", children: [_jsx(PieChart, { size: 20, className: "text-green-500" }), " Top Genres"] }), _jsx("div", { className: "h-64 w-full flex flex-col items-center justify-center", children: stats.topGenres && stats.topGenres.length > 0 ? (_jsxs(_Fragment, { children: [_jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(RechartsPieChart, { children: [_jsx(Pie, { data: stats.topGenres, innerRadius: 60, outerRadius: 80, paddingAngle: 5, dataKey: "value", children: stats.topGenres.map((entry, index) => (_jsx(Cell, { fill: COLORS[index % COLORS.length] }, `cell-${index}`))) }), _jsx(Tooltip, {})] }) }), _jsx("div", { className: "mt-4 grid grid-cols-2 gap-2 w-full", children: stats.topGenres.map((genre, i) => (_jsxs("div", { className: "flex items-center gap-2 text-xs", children: [_jsx("div", { className: "w-2 h-2 rounded-full", style: { backgroundColor: COLORS[i % COLORS.length] } }), _jsx("span", { className: "text-zinc-400 truncate", children: genre.name })] }, i))) })] })) : (_jsx("p", { className: "text-zinc-500 text-sm italic", children: "Collecting genre data..." })) })] }), _jsxs("div", { className: "lg:col-span-3 bg-zinc-900 p-6 rounded-3xl border border-zinc-800", children: [_jsxs("h3", { className: "text-xl font-bold mb-6 flex items-center gap-2", children: [_jsx(Play, { size: 20, className: "text-green-500" }), " Top Tracks (by Time)"] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: stats.topTracks.map((track, i) => (_jsxs("div", { className: "flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-zinc-700", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { className: "text-zinc-600 font-mono w-4", children: i + 1 }), _jsxs("div", { className: "overflow-hidden", children: [_jsx("p", { className: "font-medium truncate", children: track.name || `Track ${track.id.substring(0, 8)}...` }), _jsxs("p", { className: "text-xs text-zinc-500 truncate", children: ["ID: ", track.id] })] })] }), _jsx("span", { className: "text-zinc-400 text-sm font-mono", children: formatMs(track.duration) })] }, i))) })] })] })] }));
}
function StatCard({ icon, label, value, sub }) {
    return (_jsxs("div", { className: "bg-zinc-900 p-6 rounded-3xl border border-zinc-800 hover:border-zinc-700 transition-all", children: [_jsx("div", { className: "mb-4", children: icon }), _jsx("p", { className: "text-zinc-500 text-sm font-medium", children: label }), _jsx("h2", { className: "text-3xl font-black mb-1", children: value }), _jsx("p", { className: "text-xs text-zinc-600", children: sub })] }));
}
//# sourceMappingURL=App.js.map
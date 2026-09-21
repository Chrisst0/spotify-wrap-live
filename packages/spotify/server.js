const express = require('express');
const cors = require('cors');
const SpotifyClient = require('./client');
const SpotifyDatabase = require('./../database/sqlite-repo');
const ListeningTracker = require('./tracker');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Simple file-based storage for the cloud server
const tokenFile = path.join(__dirname, 'token.json');
const cloudStorage = {
    async getToken(key) {
        try {
            if (!fs.existsSync(tokenFile)) return null;
            const data = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
            return data[key] || null;
        } catch (e) { return null; }
    },
    async setToken(key, value) {
        try {
            let data = {};
            if (fs.existsSync(tokenFile)) {
                data = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
            }
            data[key] = value;
            fs.writeFileSync(tokenFile, JSON.stringify(data));
        } catch (e) { console.error('[Storage Error]', e); }
    }
};

const dbRepo = new SpotifyDatabase();
const spotifyClient = new SpotifyClient();

async function startServer() {
    await dbRepo.init();
    
    // Create a basic auth handler for the server to auto-refresh tokens
    const refreshAccessToken = async () => {
        const refreshToken = await cloudStorage.getToken('refresh_token');
        const clientId = process.env.SPOTIFY_CLIENT_ID || '';
        
        if (!refreshToken || !clientId) {
            console.error('[Auth Error] Missing refresh_token or client_id on server');
            return null;
        }

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    client_id: clientId,
                }),
            });

            if (!response.ok) throw new Error(`Refresh failed: ${await response.text()}`);
            const data = await response.json();
            
            await cloudStorage.setToken('access_token', data.access_token);
            await cloudStorage.setToken('expires_at', (Date.now() + data.expires_in * 1000).toString());
            
            console.log('[Auth] Token refreshed successfully');
            return data.access_token;
        } catch (e) {
            console.error('[Auth] Token refresh failed:', e);
            return null;
        }
    };

    // Override tracker's token retrieval to use the refresh logic
    const originalGetToken = cloudStorage.getToken.bind(cloudStorage);
    cloudStorage.getToken = async (key) => {
        if (key === 'access_token') {
            const expiresAt = await originalGetToken('expires_at');
            if (!expiresAt || Date.now() > parseInt(expiresAt)) {
                console.log('[Auth] Token expired, attempting auto-refresh...');
                return await refreshAccessToken();
            }
        }
        return originalGetToken(key);
    };

    const tracker = new ListeningTracker(spotifyClient, dbRepo, cloudStorage);
    tracker.start();
    console.log('[Cloud Server] Listening Tracker started in background...');

    app.post('/sync-token', async (req, res) => {
        const { access_token, refresh_token, expires_at } = req.body;
        if (!access_token) return res.status(400).json({ error: 'Missing token' });
        
        await cloudStorage.setToken('access_token', access_token);
        await cloudStorage.setToken('refresh_token', refresh_token);
        await cloudStorage.setToken('expires_at', expires_at);
        
        res.json({ status: 'Token synced successfully' });
    });

    app.get('/current', async (req, res) => {
        try {
            const token = await cloudStorage.getToken('access_token');
            if (!token) return res.status(401).json({ error: 'Unauthorized' });

            const state = await spotifyClient.getCurrentPlayback(token);
            if (!state.track) {
                return res.json({ isPlaying: false });
            }

            const trackData = await spotifyClient.request(`/tracks/${state.track.id}`, token);
            
            res.json({
                isPlaying: state.isPlaying,
                track: {
                    id: state.track.id,
                    name: trackData.name,
                    artist: trackData.artists[0]?.name,
                    albumArt: trackData.album.images?.[0]?.url,
                    progress_ms: state.progress_ms,
                    duration_ms: state.track.duration_ms
                }
            });
        } catch (e) {
            console.error('[API Error] /current:', e);
            res.status(500).json({ error: 'Failed to fetch current track' });
        }
    });

    app.get('/stats', async (req, res) => {
        try {
            const totalTime = await dbRepo.db.get('SELECT SUM(duration_ms) as total FROM listening_sessions');
            
            const totalTracks = await dbRepo.db.get('SELECT COUNT(DISTINCT track_id) as count FROM listening_sessions');
            const totalArtists = await dbRepo.db.get('SELECT COUNT(DISTINCT artist_id) as count FROM session_artists');

            const rawTopTracks = await dbRepo.db.all(`
                SELECT track_id as id, track_name as name, SUM(duration_ms) as duration 
                FROM listening_sessions 
                GROUP BY track_id 
                ORDER BY duration DESC 
                LIMIT 10
            `);

            // Fetch and cache album art for top tracks in parallel, creating fresh objects
            const topTracks = await Promise.all(rawTopTracks.map(async (track) => {
                let info = await dbRepo.getTrackInfo(track.id);
                if (!info) {
                    try {
                        const trackData = await spotifyClient.request(`/tracks/${track.id}`, await cloudStorage.getToken('access_token'));
                        info = { 
                            name: trackData.name, 
                            image: trackData.album.images?.[0]?.url || null 
                        };
                        await dbRepo.saveTrackInfo(track.id, info.name, info.image);
                    } catch (e) {
                        console.error(`Failed to fetch image for track ${track.id}:`, e);
                        info = { name: track.name, image: null };
                    }
                }
                return {
                    id: track.id,
                    name: info.name || track.name,
                    duration: track.duration,
                    image: info.image
                };
            }));

            const rawTopArtists = await dbRepo.getTopArtists(10);
            
            // Fetch names, genres, and images for top artists in parallel, creating fresh objects
            const topArtists = await Promise.all(rawTopArtists.map(async (artist) => {
                let info = await dbRepo.getArtistInfo(artist.id);
                if (!info || info.name === 'Unknown Artist') {
                    try {
                        const artistData = await spotifyClient.request(`/artists/${artist.id}`, await cloudStorage.getToken('access_token'));
                        info = { 
                            name: artistData.name, 
                            genres: artistData.genres || [],
                            image: artistData.images?.[0]?.url || null
                        };
                        await dbRepo.saveArtistInfo(artist.id, info.name, info.genres, info.image);
                    } catch (e) {
                        console.error(`Failed to fetch info for ${artist.id}:`, e);
                        info = info || { name: `Unknown Artist`, genres: [], image: null };
                    }
                }
                return {
                    id: artist.id,
                    name: info.name,
                    image: info.image,
                    duration: artist.duration,
                    genres: info.genres
                };
            }));

            // Aggregate genres and prepare final artist list
            const genreCounts = {};
            const artistsWithNames = [];

            for (const artist of topArtists) {
                artistsWithNames.push({
                    id: artist.id,
                    name: artist.name,
                    image: artist.image,
                    duration: artist.duration
                });

                if (artist.genres) {
                    artist.genres.forEach(g => {
                        genreCounts[g] = (genreCounts[g] || 0) + 1;
                    });
                }
            }

            const topGenres = Object.entries(genreCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10);

            const activity = await dbRepo.db.all(`
                SELECT date(started_at/1000, 'unixepoch') as day, SUM(duration_ms) as duration 
                FROM listening_sessions 
                GROUP BY day 
                ORDER BY day ASC
            `);

            res.json({
                totalTime: totalTime?.total || 0,
                totalTracks: totalTracks?.count || 0,
                totalArtists: totalArtists?.count || 0,
                topTracks: topTracks,
                topArtists: artistsWithNames,
                topGenres: topGenres,
                activity: activity
            });
        } catch (e) {
            console.error('[API Error]', e);
            res.status(500).json({ error: 'Failed to fetch stats' });
        }
    });

    app.listen(port, () => {
        console.log(`[Cloud Server] API running on port ${port}`);
        console.log(`[Cloud Server] Dashboard can now fetch stats from http://your-oracle-ip:${port}/stats`);
    });
}

startServer().catch(console.error);

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

    app.get('/stats', async (req, res) => {
        try {
            const totalTime = await dbRepo.db.get('SELECT SUM(duration_ms) as total FROM listening_sessions');
            
            const topTracks = await dbRepo.db.all(`
                SELECT track_id as id, track_name as name, SUM(duration_ms) as duration 
                FROM listening_sessions 
                GROUP BY track_id 
                ORDER BY duration DESC 
                LIMIT 10
            `);

            const topArtists = await dbRepo.getTopArtists(10);
            
            // Fetch genres for top artists and aggregate them
            const genreCounts = {};
            for (const artist of topArtists) {
                let genres = await dbRepo.getArtistGenres(artist.id);
                if (!genres) {
                    try {
                        const artistData = await spotifyClient.request(`/artists/${artist.id}`, await cloudStorage.getToken('access_token'));
                        genres = artistData.genres || [];
                        await dbRepo.saveArtistGenres(artist.id, genres);
                    } catch (e) {
                        console.error(`Failed to fetch genres for ${artist.id}:`, e);
                        genres = [];
                    }
                }
                genres.forEach(g => {
                    genreCounts[g] = (genreCounts[g] || 0) + 1;
                });
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
                topTracks: topTracks,
                topArtists: topArtists,
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

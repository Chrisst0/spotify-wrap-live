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
    
    // Corrected constructor: (client, db, storage)
    const tracker = new ListeningTracker(spotifyClient, dbRepo, cloudStorage);
    tracker.start();
    console.log('[Cloud Server] Listening Tracker started in background...');

    app.post('/sync-token', async (req, res) => {
        const { access_token, expires_at } = req.body;
        if (!access_token) return res.status(400).json({ error: 'Missing token' });
        
        await cloudStorage.setToken('access_token', access_token);
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
            const activity = await dbRepo.db.all(`
                SELECT date(started_at/1000, 'unixepoch') as day, SUM(duration_ms) as duration 
                FROM listening_sessions 
                GROUP BY day 
                ORDER BY day ASC
            `);

            res.json({
                totalTime: totalTime?.total || 0,
                topTracks: topTracks,
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

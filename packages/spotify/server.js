const express = require('express');
const cors = require('cors');
const SpotifyDatabase = require('./../database/sqlite-repo');
const ListeningTracker = require('./tracker');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const dbRepo = new SpotifyDatabase();

async function startServer() {
    // Initialize DB
    await dbRepo.init();
    
    // Start the background tracker
    const tracker = new ListeningTracker(dbRepo);
    tracker.start();
    console.log('[Cloud Server] Listening Tracker started in background...');

    // API Endpoint for the Dashboard
    app.get('/stats', async (req, res) => {
        try {
            // Re-using the logic from the StatisticsEngine
            // We can implement a simple version of it here
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

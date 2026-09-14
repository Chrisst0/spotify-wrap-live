const StatisticsEngine = {
    async getTotalListeningTime(db) {
        const result = await db.db.all('SELECT SUM(duration_ms) as total FROM listening_sessions');
        return result[0]?.total || 0;
    },

    async getTopTracks(db, limit = 5) {
        const result = await db.db.all(`
            SELECT track_id as trackId, track_name as name, SUM(duration_ms) as totalDuration
            FROM listening_sessions
            GROUP BY track_id
            ORDER by totalDuration DESC
            LIMIT ?
        `, [limit]);

        return result.map(r => ({
            id: r.trackId,
            name: r.name,
            duration: r.totalDuration
        }));
    },

    async getDailyActivity(db) {
        const result = await db.db.all(`
            SELECT date(datetime(started_at/1000, 'unixepoch')) as day, SUM(duration_ms) as duration
            FROM listening_sessions
            GROUP BY day
            ORDER BY day ASC
        `);
        return result;
    }
};

module.exports = StatisticsEngine;

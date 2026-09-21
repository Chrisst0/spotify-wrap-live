"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsEngine = void 0;
const sqlite_repo_1 = require("../database/sqlite-repo");
const statistics_1 = require("../shared-types/statistics");
class StatisticsEngine {
    db; // Reference to the internal db from SpotifyDatabase
    constructor(spotifyDb) {
        // We need access to the database instance
        this.db = spotifyDb.db;
    }
    async getTotalListeningTime(startTime, endTime) {
        const result = await this.db.get(`SELECT SUM(duration_ms) as total FROM listening_sessions 
             WHERE started_at >= ? AND started_at <= ?`, [startTime, endTime]);
        return result?.total || 0;
    }
    async getTopArtists(limit = 10, startTime = 0) {
        const result = await this.db.all(`
            SELECT sa.artist_id as id, SUM(ls.duration_ms) as totalDurationMs, COUNT(ls.id) as playCount
            FROM session_artists sa
            JOIN listening_sessions ls ON sa.session_id = ls.id
            WHERE ls.started_at >= ?
            GROUP BY sa.artist_id
            ORDER BY totalDurationMs DESC
            LIMIT ?`, [startTime, limit]);
        return result.map(row => ({
            id: row.id,
            name: 'Unknown Artist', // Name filled by UI or API later
            totalDurationMs: row.totalDurationMs,
            playCount: row.playCount
        }));
    }
    async getTopTracks(limit = 10, startTime = 0) {
        const result = await this.db.all(`
            SELECT track_id as id, SUM(duration_ms) as totalDurationMs, COUNT(id) as playCount
            FROM listening_sessions
            WHERE started_at >= ?
            GROUP BY track_id
            ORDER BY totalDurationMs DESC
            LIMIT ?`, [startTime, limit]);
        return result.map(row => ({
            id: row.id,
            name: 'Unknown Track',
            totalDurationMs: row.totalDurationMs,
            playCount: row.playCount
        }));
    }
    async getDailyStats(daysBack = 30) {
        const msPerDay = 24 * 60 * 60 * 1000;
        const now = Date.now();
        const stats = [];
        for (let i = daysBack - 1; i >= 0; i--) {
            const dayStart = now - (i + 1) * msPerDay;
            const dayEnd = now - i * msPerDay;
            const result = await this.db.get(`
                SELECT SUM(duration_ms) as total, COUNT(id) as count 
                FROM listening_sessions 
                WHERE started_at >= ? AND started_at < ?`, [dayStart, dayEnd]);
            stats.push({
                period: new Date(dayStart).toISOString().split('T')[0],
                totalDurationMs: result?.total || 0,
                trackCount: result?.count || 0
            });
        }
        return stats;
    }
    async getWrappedSummary(startTime) {
        const [topArtists, topTracks] = await Promise.all([
            this.getTopArtists(5, startTime),
            this.getTopTracks(5, startTime)
        ]);
        return {
            topArtists,
            topTracks,
            topAlbums: [], // Implementation similar to tracks
            totalListeningTimeMs: await this.getTotalListeningTime(startTime, Date.now())
        };
    }
}
exports.StatisticsEngine = StatisticsEngine;
//# sourceMappingURL=engine.js.map
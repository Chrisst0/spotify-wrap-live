const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

class SpotifyDatabase {
    constructor() {
        this.db = null;
    }

    async init() {
        console.log('[DB Debug] Initializing database...');
        try {
            this.db = await open({
                filename: './spotify_history.db',
                driver: sqlite3.Database
            });
            console.log('[DB Debug] Database connection opened successfully.');
            await this.createTables();
        } catch (e) {
            console.error('[DB Debug] Critical error during init:', e);
        }
    }

    async createTables() {
        console.log('[DB Debug] Creating tables...');
        try {
            await this.db.exec(`
                CREATE TABLE IF NOT EXISTS listening_sessions (
                    id TEXT PRIMARY KEY,
                    track_id TEXT NOT NULL,
                    track_name TEXT,
                    album_id TEXT,
                    started_at INTEGER NOT NULL,
                    ended_at INTEGER,
                    duration_ms INTEGER DEFAULT 0,
                    start_pos_ms INTEGER,
                    end_pos_ms INTEGER,
                    device_id TEXT,
                    device_name TEXT,
                    context_type TEXT,
                    context_uri TEXT,
                    created_at INTEGER NOT NULL
                );
            `);

            await this.db.exec(`
                CREATE TABLE IF NOT EXISTS session_artists (
                    session_id TEXT,
                    artist_id TEXT,
                    PRIMARY KEY (session_id, artist_id),
                    FOREIGN KEY (session_id) REFERENCES listening_sessions(id)
                );
            `);

            await this.db.exec(`
                CREATE TABLE IF NOT EXISTS artist_genres (
                    artist_id TEXT PRIMARY KEY,
                    genres TEXT,
                    last_updated INTEGER
                );
            `);
            try {
            // Ensure track_name column exists for old databases
            await this.db.exec(`ALTER TABLE listening_sessions ADD COLUMN track_name TEXT;`);
            console.log('[DB Debug] Added track_name column to listening_sessions.');
        } catch (e) {
            // This will fail if the column already exists, which is fine
        }
        } catch (e) {
            console.error('[DB Debug] Error creating tables:', e);
        }
    }

    async saveSession(session, artistIds) {
        console.log(`[DB Debug] Attempting to save session: ${session.id}`);
        try {
            await this.db.run(
                `INSERT INTO listening_sessions 
                (id, track_id, track_name, album_id, started_at, ended_at, duration_ms, start_pos_ms, end_pos_ms, device_id, device_name, context_type, context_uri, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [session.id, session.trackId, session.trackName, session.albumId, session.startedAt, session.endedAt, session.listenedDurationMs, session.startPositionMs, session.endPositionMs, session.deviceId, session.deviceName, session.contextType, session.contextUri, session.createdAt]
            );
            console.log(`[DB Debug] Session ${session.id} inserted into listening_sessions.`);

            for (const artistId of artistIds) {
                await this.db.run(
                    `INSERT INTO session_artists (session_id, artist_id) VALUES (?, ?)`,
                    [session.id, artistId]
                );
            }
            console.log(`[DB Debug] ${artistIds.length} artists linked to session ${session.id}.`);
        } catch (e) {
            console.error(`[DB Debug] Failed to save session ${session.id}:`, e);
        }
    }

    async updateSessionDuration(sessionId, durationMs, endPosMs, endedAt) {
        console.log(`[DB Debug] Updating duration for session: ${sessionId} to ${durationMs}ms`);
        try {
            await this.db.run(
                `UPDATE listening_sessions SET duration_ms = ?, end_pos_ms = ?, ended_at = ? WHERE id = ?`,
                [durationMs, endPosMs, endedAt, sessionId]
            );
            console.log(`[DB Debug] Update successful for ${sessionId}.`);
        } catch (e) {
            console.error(`[DB Debug] Failed to update session ${sessionId}:`, e);
        }
    }
    async saveArtistGenres(artistId, genres) {
        try {
            await this.db.run(
                `INSERT OR REPLACE INTO artist_genres (artist_id, genres, last_updated) VALUES (?, ?, ?)`,
                [artistId, JSON.stringify(genres), Date.now()]
            );
        } catch (e) {
            console.error(`[DB Debug] Failed to save genres for ${artistId}:`, e);
        }
    }

    async getArtistGenres(artistId) {
        try {
            const row = await this.db.get(`SELECT genres FROM artist_genres WHERE artist_id = ?`, [artistId]);
            return row ? JSON.parse(row.genres) : null;
        } catch (e) {
            return null;
        }
    }

    async getTopArtists(limit = 10) {
        return await this.db.all(`
            SELECT sa.artist_id as id, SUM(ls.duration_ms) as duration
            FROM session_artists sa
            JOIN listening_sessions ls ON sa.session_id = ls.id
            GROUP BY sa.artist_id
            ORDER BY duration DESC
            LIMIT ?`, [limit]);
    }

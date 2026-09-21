const crypto = require('crypto');
const SpotifyClient = require('../spotify/client');
const SpotifyDatabase = require('../database/sqlite-repo');

class ListeningTracker {
    constructor(client, db, storage) {
        this.client = client;
        this.db = db;
        this.storage = storage;
        this.pollInterval = 5000;
        this.timer = null;
        this.currentSession = null;
    }

    async start() {
        if (this.timer) return;
        this.timer = setInterval(() => this.tick(), this.pollInterval);
        console.log('Listening tracker started...');
    }

    async stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        await this.flushCurrentSession();
    }

    async tick() {
        try {
            const token = await this.storage.getToken('access_token');
            if (!token) {
                console.log('[Tracker Heartbeat] No access token found, skipping tick.');
                return;
            }

            console.log('[Tracker Heartbeat] Checking playback status...');
            const state = await this.client.getCurrentPlayback(token);
            const now = Date.now();

            if (!state.track || !state.isPlaying) {
                console.log(`[Tracker Heartbeat] No active playback. Track: ${state.track ? state.track.id : 'null'}, Playing: ${state.isPlaying}`);
                await this.flushCurrentSession();
                return;
            }

            console.log(`[Tracker Heartbeat] Currently playing: ${state.track.id} (Pos: ${state.progress_ms}ms)`);

            if (this.currentSession && this.currentSession.trackId !== state.track.id) {
                console.log(`[Tracker Heartbeat] Song changed! Flushing session ${this.currentSession.id}`);
                await this.flushCurrentSession();
            }

            if (!this.currentSession) {
                console.log(`[Tracker Heartbeat] Starting new session for track ${state.track.id}`);
                this.currentSession = {
                    id: crypto.randomUUID(),
                    trackId: state.track.id,
                    startedAt: now,
                    lastObservedAt: now,
                    lastPositionMs: state.progress_ms,
                    accumulatedDurationMs: 0
                };

                // IMMEDIATELY create the session record in DB so that updateSessionDuration works
                try {
                    const token = await this.storage.getToken('access_token');
                    let trackData = null;
                    if (token) {
                        try {
                            trackData = await this.client.request(`/tracks/${this.currentSession.trackId}`, token);
                        } catch (e) {
                            console.error(`Could not fetch track data for initial session ${this.currentSession.trackId}`);
                        }
                    }
                    const trackName = trackData ? `${trackData.name} - ${trackData.artists[0]?.name || 'Unknown Artist'}` : 'Unknown Track';
                    const artistIds = trackData ? trackData.artists.map(a => a.id) : [];
                    const albumId = trackData ? trackData.album.id : null;

                    await this.db.saveSession({
                        id: this.currentSession.id,
                        trackId: this.currentSession.trackId,
                        trackName: trackName,
                        albumId: albumId,
                        startedAt: this.currentSession.startedAt,
                        endedAt: null,
                        listenedDurationMs: 0,
                        startPositionMs: 0,
                        endPositionMs: null,
                        deviceId: null,
                        deviceName: null,
                        contextType: null,
                        contextUri: null,
                        createdAt: Date.now(),
                    }, artistIds);
                    console.log(`[DB Debug] Initial session record created for ${this.currentSession.id}`);
                } catch (e) {
                    console.error(`[DB Debug] Failed to create initial session record:`, e);
                }
            } else if (this.currentSession.trackId !== state.track.id) {
                console.log(`[Tracker Heartbeat] Song changed! Flushing session ${this.currentSession.id}`);
                await this.flushCurrentSession();
                
                console.log(`[Tracker Heartbeat] Starting new session for track ${state.track.id}`);
                this.currentSession = {
                    id: crypto.randomUUID(),
                    trackId: state.track.id,
                    startedAt: now,
                    lastObservedAt: now,
                    lastPositionMs: state.progress_ms,
                    accumulatedDurationMs: 0
                };
            } else {
                const posDelta = state.progress_ms - this.currentSession.lastPositionMs;
                if (posDelta > 0) {
                    this.currentSession.accumulatedDurationMs += posDelta;
                } else if (state.progress_ms < this.currentSession.lastPositionMs) {
                    // Track restarted or looped
                    const trackDuration = state.track.duration_ms;
                    const loopDuration = (trackDuration - this.currentSession.lastPositionMs) + state.progress_ms;
                    this.currentSession.accumulatedDurationMs += loopDuration;
                }
                this.currentSession.lastObservedAt = now;
                this.currentSession.lastPositionMs = state.progress_ms;

                // Force save every 30 seconds to avoid data loss
                if (this.currentSession.accumulatedDurationMs % 30000 < 5000) {
                     await this.saveProgress();
                }
            }
        } catch (error) {
            console.error('Tracker tick error:', error);
        }
    }

    async saveProgress() {
        if (!this.currentSession) return;
        try {
            await this.db.updateSessionDuration(
                this.currentSession.id, 
                this.currentSession.accumulatedDurationMs, 
                this.currentSession.lastPositionMs, 
                Date.now()
            );
        } catch (e) {
            console.error('Progress save error:', e);
        }
    }

    async flushCurrentSession() {
        if (!this.currentSession) return;
        const session = this.currentSession;
        this.currentSession = null;

        try {
            // Update the final duration and end time rather than inserting a new record
            await this.db.updateSessionDuration(
                session.id, 
                session.accumulatedDurationMs, 
                session.lastPositionMs, 
                Date.now()
            );
            console.log(`[DB Debug] Session ${session.id} finalized with duration ${session.accumulatedDurationMs}ms`);
        } catch (error) {
            console.error('Error finalizing session in DB:', error);
        }
    }
}

module.exports = ListeningTracker;

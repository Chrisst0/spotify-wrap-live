class SpotifyClient {
    constructor() {
        this.baseUrl = 'https://api.spotify.com/v1';
    }

    async request(endpoint, token, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After') || 2;
                    console.warn(`[SpotifyClient] Rate limited (429). Retrying after ${retryAfter}s...`);
                    await new Promise(res => setTimeout(res, retryAfter * 1000));
                    return this.request(endpoint, token, options);
                }
                const error = await response.text();
                throw new Error(`Spotify API Error (${response.status}): ${error}`);
            }

            const text = await response.text();
            if (!text) return null;

            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('[SpotifyClient] Failed to parse JSON response:', text);
                return null;
            }
        } catch (error) {
            console.error(`[SpotifyClient] Request failed (${endpoint}):`, error);
            throw error;
        }
    }

    async getCurrentPlayback(token) {
        const data = await this.request('/me/player', token);

        return {
            isPlaying: data.is_playing,
            progress_ms: data.progress_ms,
            timestamp: data.timestamp,
            track: data.item ? {
                id: data.item.id,
                name: data.item.name,
                duration_ms: data.item.duration_ms,
                artists: data.item.artists,
                album: data.item.album,
            } : null,
        };
    }

    async getRecentlyPlayed(token, limit = 50) {
        const data = await this.request(`/me/player/recently-played?limit=${limit}`, token);

        return data.items.map(item => ({
            played_at: item.played_at,
            track: {
                id: item.track.id,
                name: item.track.name,
                duration_ms: item.track.duration_ms,
                artists: item.track.artists,
                album: item.track.album,
            },
        }));
    }

    async getUserProfile(token) {
        return this.request('/me', token);
    }
}

module.exports = SpotifyClient;

const crypto = require('crypto');
const http = require('http');
const { URL } = require('url');

class SpotifyAuthService {
    constructor(clientId, redirectUri, storage) {
        this.clientId = clientId;
        this.redirectUri = redirectUri;
        this.storage = storage;
        this.codeVerifier = null;
    }

    generateRandomString(length) {
        return crypto.randomBytes(length).toString('base64url');
    }

    async generateCodeChallenge(verifier) {
        const hash = crypto.createHash('sha256').update(verifier).digest();
        return hash.toString('base64url');
    }

    async signIn() {
        this.codeVerifier = this.generateRandomString(64);
        const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);

        const authUrl = new URL('https://accounts.spotify.com/authorize');
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', this.clientId);
        authUrl.searchParams.set('scope', 'user-read-private user-read-currently-playing user-read-playback-state user-read-recently-played user-top-read');
        authUrl.searchParams.set('redirect_uri', this.redirectUri);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        authUrl.searchParams.set('code_challenge', codeChallenge);

        console.log(`Please visit this URL to authorize: ${authUrl.toString()}`);

        return new Promise((resolve, reject) => {
            const server = http.createServer(async (req, res) => {
                try {
                    const urlPath = req.url || '';
                    if (urlPath === '/favicon.ico') {
                        res.writeHead(204);
                        res.end();
                        return;
                    }

                    console.log(`[Auth Debug] Received request: ${req.method} ${urlPath}`);
                    const url = new URL(urlPath, `http://${req.headers.host}`);
                    const code = url.searchParams.get('code');

                    if (code) {
                        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                        res.end('Authorization successful! You can close this tab.');
                        server.close();
                        try {
                            const session = await this.exchangeCodeForToken(code);
                            await this.saveSession(session);
                            resolve(session);
                        } catch (e) {
                            reject(e);
                        }
                    } else if (urlPath.startsWith('/callback')) {
                        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                        res.end(`Authorization failed: No code received. Received URL: ${urlPath}`);
                        server.close();
                        reject(new Error(`No authorization code received in the redirect URL. Received: ${urlPath}`));
                    } else {
                        res.writeHead(404);
                        res.end('Not Found');
                    }
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('Internal server error during authorization.');
                    server.close();
                    reject(err);
                }
            }).listen(8888);
        });
    }

    async exchangeCodeForToken(code) {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: this.redirectUri,
                client_id: this.clientId,
                code_verifier: this.codeVerifier,
            }),
        });

        if (!response.ok) throw new Error(`Token exchange failed: ${await response.text()}`);

        const data = await response.json();
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: Date.now() + data.expires_in * 1000,
        };
    }

    async saveSession(session) {
        await this.storage.saveToken('access_token', session.accessToken);
        await this.storage.saveToken('refresh_token', session.refreshToken);
        await this.storage.saveToken('expires_at', session.expiresAt.toString());
    }

    async signOut() {
        await this.storage.removeToken('access_token');
        await this.storage.removeToken('refresh_token');
        await this.storage.removeToken('expires_at');
    }

    async getAccessToken() {
        const expiresAt = await this.storage.getToken('expires_at');
        if (!expiresAt || Date.now() > parseInt(expiresAt)) {
            try {
                const session = await this.refreshSession();
                return session.accessToken;
            } catch {
                return null;
            }
        }
        return this.storage.getToken('access_token');
    }

    async refreshSession() {
        const refreshToken = await this.storage.getToken('refresh_token');
        if (!refreshToken) throw new Error('No refresh token available');

        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: this.clientId,
            }),
        });

        if (!response.ok) throw new Error(`Refresh failed: ${await response.text()}`);

        const data = await response.json();
        const session = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || refreshToken,
            expiresAt: Date.now() + data.expires_in * 1000,
        };

        await this.saveSession(session);
        return session;
    }

    async isAuthenticated() {
        const token = await this.getAccessToken();
        return token !== null;
    }
}

module.exports = SpotifyAuthService;

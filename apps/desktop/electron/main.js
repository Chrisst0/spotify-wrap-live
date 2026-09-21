const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
require('dotenv').config();
const SpotifyAuthService = require('../../../packages/spotify/auth');
const WindowsSecureStorage = require('../../../packages/database/secure-storage');
const SpotifyClient = require('../../../packages/spotify/client');
const SpotifyDatabase = require('../../../packages/database/sqlite-repo');
const ListeningTracker = require('../../../packages/spotify/tracker');
const StatisticsEngine = require('../../../packages/statistics/engine');

let mainWindow = null;

const storage = new WindowsSecureStorage();
const auth = new SpotifyAuthService(
    process.env.SPOTIFY_CLIENT_ID || '', 
    process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:8888/callback', 
    storage
);
const client = new SpotifyClient();
const db = new SpotifyDatabase();
const tracker = new ListeningTracker(client, db, storage);

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    const startUrl = 'http://localhost:5173';

    mainWindow.loadURL(startUrl);
}

app.whenReady().then(async () => {
    await db.init();
    await tracker.start();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('auth:signIn', async () => {
    return await auth.signIn();
});

ipcMain.handle('auth:status', async () => {
    try {
        return await auth.isAuthenticated();
    } catch (error) {
        console.error('Auth status check failed:', error);
        return false;
    }
});

ipcMain.handle('auth:getAccessToken', async () => {
    return await storage.getToken('access_token');
});

ipcMain.handle('auth:getTokenExpiration', async () => {
    return await storage.getToken('expires_at');
});

ipcMain.handle('auth:getRefreshToken', async () => {
    return await storage.getToken('refresh_token');
});

ipcMain.handle('stats:getSummary', async () => {
    try {
        const totalTime = await StatisticsEngine.getTotalListeningTime(db);
        const topTracks = await StatisticsEngine.getTopTracks(db);
        const activity = await StatisticsEngine.getDailyActivity(db);
        
        return {
            totalTime,
            topTracks,
            activity
        };
    } catch (error) {
        console.error('Stats fetch failed:', error);
        throw error;
    }
});

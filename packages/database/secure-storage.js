const keytar = require('keytar');

/**
 * WindowsSecureStorage uses the keytar library to interact with the 
 * Windows Credential Manager (Windows Vault).
 */
class WindowsSecureStorage {
    constructor() {
        this.service = 'SpotifyWrapLive';
    }

    async saveToken(key, value) {
        console.log(`[Storage Debug] Attempting to save token: ${key}`);
        try {
            await keytar.setPassword(this.service, key, value);
            console.log(`[Storage Debug] Successfully saved token: ${key}`);
        } catch (e) {
            console.error(`[Storage Debug] Failed to save token ${key}:`, e);
        }
    }

    async getToken(key) {
        console.log(`[Storage Debug] Attempting to retrieve token: ${key}`);
        try {
            const value = await keytar.getPassword(this.service, key);
            if (value) {
                console.log(`[Storage Debug] Found entry for ${key} in keytar`);
                return value;
            }
            console.log(`[Storage Debug] No entry found for ${key}`);
            return null;
        } catch (e) {
            console.error(`[Storage Debug] Error retrieving token ${key}:`, e);
            return null;
        }
    }

    async removeToken(key) {
        try {
            await keytar.deletePassword(this.service, key);
            console.log(`[Storage Debug] Removed token: ${key}`);
        } catch (e) {
            console.error(`[Storage Debug] Failed to remove token ${key}:`, e);
        }
    }
}

module.exports = WindowsSecureStorage;

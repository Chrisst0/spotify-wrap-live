module.exports = {
    AuthSession: {
        // Types are for TS, but in CJS we just document them
    },
    AuthService: class {
        async signIn() {}
        async signOut() {}
        async getAccessToken() {}
        async refreshSession() {}
        async isAuthenticated() {}
    }
};

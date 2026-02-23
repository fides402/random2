import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: "com.fides402.random2",
    appName: "Discogs Randomizer",
    webDir: "dist",
    android: {
        minWebViewVersion: 60
    },
    server: {
        cleartext: true,
        androidScheme: "https"
    }
};

export default config;

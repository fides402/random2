import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: "com.fides402.random2",
    appName: "Discogs Randomizer",
    webDir: "dist",
    server: {
        androidScheme: "https"
    }
};

export default config;

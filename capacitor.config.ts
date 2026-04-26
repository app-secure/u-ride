import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'u-ride',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    hostname: 'localhost'
  }
};

export default config;

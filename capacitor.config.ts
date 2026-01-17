import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.builderflow',
  appName: 'BuilderFlow',
  webDir: 'dist',
  server: {
    url: 'https://168b26e7-d538-425a-9dfe-e6b5eb454493.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;

import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'VolleyMatch',
  slug: 'volleyMatch',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    package: 'com.vasconcelos.volleymatch',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    apiUrl: process.env.API_URL ?? 'https://matchvolley-production.up.railway.app',
    eas :{
      projectId: 'aeef03b5-3b4e-4ae7-8555-9e265a43f608'
    }
  },
};

export default config;
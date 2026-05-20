import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'matchvolley',
  slug: 'matchvolley',
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
    package: 'com.vasconcelos.matchvolley',
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
  plugins: ['expo-secure-store'],
  extra: {
    apiUrl: process.env.API_URL,
    eas: {
      projectId: 'e484be10-fb1c-4425-b558-c0de757f6c21',
    },
  },
};

export default config;
import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'matchvolley',
  slug: 'matchvolley',
  version: '1.0.0',
  // 'default' : le board entraîneur peut passer en paysage ; App.tsx verrouille le reste en portrait.
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    requireFullScreen: true, // requis sur iPad pour verrouiller l'orientation à l'exécution
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
    output: 'single',
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
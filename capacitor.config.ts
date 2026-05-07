import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.traystorage.connect',
  appName: 'TrayStorage Connect',
  webDir: 'dist',
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    },
  },
  ios: {
    scheme: 'TrayStorageConnect',
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e293b',
      showSpinner: false,
    },
  },
};

export default config;

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gestorvendas.app',
  appName: 'Gestor de Vendas',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        VitePWA({
            srcDir: 'src',
            filename: 'worker/service_worker.js',
            strategies: 'injectManifest',
            injectRegister: false,
            manifest: false,
            injectManifest: {
                injectionPoint: undefined
            }
        })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    }
});

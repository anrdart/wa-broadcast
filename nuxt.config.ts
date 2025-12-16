// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '@nuxt/fonts',
  ],

  css: ['~/assets/css/main.css'],

  colorMode: {
    classSuffix: '',
    preference: 'dark',
    fallback: 'dark',
  },

  fonts: {
    families: [
      { name: 'Inter', provider: 'google' },
    ],
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },

  runtimeConfig: {
    public: {
      whatsappApiUrl: process.env.NUXT_PUBLIC_WHATSAPP_API_URL || 'http://localhost:3000',
      whatsappApiKey: process.env.NUXT_PUBLIC_WHATSAPP_API_KEY || '',
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  },

  alias: {
    '@': '~/app',
  },

  imports: {
    dirs: ['composables/**'],
  },

  components: [
    { path: '~/components', pathPrefix: false },
    { path: '~/components/ui', pathPrefix: false },
  ],
})

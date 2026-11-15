/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Versie uit package.json en korte commit-hash; ingevuld door Vite (zie vite.config.ts). */
declare const __APP_VERSION__: string
declare const __APP_COMMIT__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

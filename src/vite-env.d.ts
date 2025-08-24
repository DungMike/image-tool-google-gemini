/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY_1: string
  readonly VITE_GEMINI_API_KEY_2: string
  readonly VITE_GEMINI_API_KEY_3: string
  readonly VITE_GEMINI_API_KEY_4: string
  readonly VITE_RATE_LIMIT_PER_MINUTE: string
  readonly VITE_RATE_LIMIT_PER_DAY: string
  readonly VITE_CONCURRENT_REQUESTS: string
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

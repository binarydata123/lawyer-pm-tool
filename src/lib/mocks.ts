import { mock } from "bun:test";

// Mock modules
mock.module("@supabase/supabase-js", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: mock(),
        getPublicUrl: mock(() => ({ data: { publicUrl: "http://example.com" } })),
        remove: mock(),
      }),
    },
  }),
}));

mock.module("@sentry/react", () => ({
  supabaseIntegration: mock(),
  init: mock(),
}));

// Mock environment variables
process.env.VITE_SUPABASE_URL = "https://example.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY = "dummy-key";

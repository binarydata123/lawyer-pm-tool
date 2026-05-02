import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { setDeferredPrompt } from "./deferredPromptStore.ts";
import { supabase } from "./lib/supabase"; // Import your existing client

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface ChatPushPayload {
  channel_id?: string | null;
  dm_id?: string | null;
  entity_id?: string | null;
  message_id?: string | null;
  data?: {
    channel_id?: string | null;
    dm_id?: string | null;
    entity_id?: string | null;
    message_id?: string | null;
  };
}

const dispatchChatPushReceived = (payload: ChatPushPayload) => {
  const nestedData = payload.data ?? {};

  window.dispatchEvent(
    new CustomEvent("chat-push-received", {
      detail: {
        ...payload,
        ...nestedData,
        channel_id: payload.channel_id ?? nestedData.channel_id ?? null,
        dm_id: payload.dm_id ?? nestedData.dm_id ?? null,
        message_id:
          payload.message_id ??
          payload.entity_id ??
          nestedData.message_id ??
          nestedData.entity_id ??
          null,
      },
    }),
  );
};

Sentry.init({
  dsn: "https://3029d173833af169674b55ad377f38ab@o4511297101299712.ingest.us.sentry.io/4511297187676160",
  environment: import.meta.env.MODE, // This will be "development" or "production"
  sendDefaultPii: true,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
    Sentry.supabaseIntegration({ supabaseClient: supabase }), // Use your existing client
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
});

// ===== RENDER REACT APP =====
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>
    </AuthProvider>
  </StrictMode>,
);

// ===== SERVICE WORKER & BEFORE INSTALL PROMPT (keep as is) =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type !== "CHAT_PUSH_RECEIVED") return;
    dispatchChatPushReceived(event.data.payload ?? {});
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered:", registration.scope);
        void registration.update();
      })
      .catch((err) => console.error("SW failed:", err));
  });
}

window.addEventListener("beforeinstallprompt", (e: Event) => {
  const beforeInstallPromptEvent = e as BeforeInstallPromptEvent;
  beforeInstallPromptEvent.preventDefault();
  setDeferredPrompt(beforeInstallPromptEvent);
  console.log("Before Install Prompt Captured Successfully!");
});

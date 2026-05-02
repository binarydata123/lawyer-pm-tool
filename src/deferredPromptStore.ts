interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export const setDeferredPrompt = (e: BeforeInstallPromptEvent): void => {
  deferredPrompt = e;
};

export const getDeferredPrompt = (): BeforeInstallPromptEvent | null =>
  deferredPrompt;

export const clearDeferredPrompt = (): void => {
  deferredPrompt = null;
};

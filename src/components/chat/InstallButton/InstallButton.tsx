import {
  clearDeferredPrompt,
  getDeferredPrompt,
} from "../../../deferredPromptStore";

const InstallButton = () => {
  const handleInstall = async () => {
    try {
      const prompt = getDeferredPrompt();

      if (!prompt) {
        console.error("Couldn't find before install prompt");
        alert("Cannot Install Right Now. Press Ctrl+Shift+R and try again");
        return;
      }

      await prompt.prompt();

      const result = await prompt.userChoice;
      if (result.outcome === "accepted") {
        console.log("App installed successfully");
        // Optional: Show success message
        // alert("App installed successfully!");
      } else {
        console.log("User dismissed the install prompt");
      }
    } catch (error) {
      console.error("Error during installation:", error);
      alert("An error occurred during installation. Please try again.");
    } finally {
      clearDeferredPrompt();
    }
  };

  return (
    <button
      className="mt-4 w-full py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold text-sky-600 border border-sky-600 rounded-lg transition-colors hover:bg-sky-50 active:bg-sky-100"
      onClick={handleInstall}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Install Our App
    </button>
  );
};

export default InstallButton;

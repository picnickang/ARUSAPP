import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize PWA functionality
import { pwaManager } from "./utils/pwa";

// Initialize PWA functionality
pwaManager.initialize().catch(error => {
  console.error('Failed to initialize PWA:', error);
});

// Setup PWA event handlers
pwaManager.onInstallPrompt((prompt) => {
  console.log('PWA install prompt available');
  // Store prompt for later use in UI
  (window as any).pwaInstallPrompt = prompt;
});

pwaManager.onInstalled(() => {
  console.log('PWA installed successfully');
});

pwaManager.onOnlineChange((online) => {
  console.log('Connection status changed:', online ? 'online' : 'offline');
  // Could show toast notification here
});

pwaManager.onUpdateAvailable(() => {
  console.log('PWA update available');
  // Could show update notification here
});

createRoot(document.getElementById("root")!).render(<App />);

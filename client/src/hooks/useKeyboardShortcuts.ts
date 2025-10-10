import { useEffect } from "react";
import { useLocation } from "wouter";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

const useKeyboardShortcuts = () => {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const shortcuts: KeyboardShortcut[] = [
      // Navigation shortcuts (g + key pattern like GitHub/Gmail)
      {
        key: "d",
        description: "Go to Dashboard",
        action: () => setLocation("/"),
      },
      {
        key: "w",
        description: "Go to Work Orders",
        action: () => setLocation("/work-orders"),
      },
      {
        key: "a",
        description: "Go to Analytics",
        action: () => setLocation("/analytics"),
      },
      {
        key: "m",
        description: "Go to Maintenance",
        action: () => setLocation("/maintenance"),
      },
      {
        key: "v",
        description: "Go to Vessels",
        action: () => setLocation("/vessel-management"),
      },
      {
        key: "e",
        description: "Go to Equipment",
        action: () => setLocation("/equipment-registry"),
        },
      {
        key: "h",
        description: "Go to Health Monitor",
        action: () => setLocation("/health"),
      },
      {
        key: "i",
        description: "Go to Inventory",
        action: () => setLocation("/inventory-management"),
      },
      {
        key: "c",
        description: "Go to Crew Management",
        action: () => setLocation("/crew-management"),
      },
      {
        key: "s",
        description: "Go to Settings",
        action: () => setLocation("/settings"),
      },
      // Quick action shortcuts
      {
        key: "n",
        ctrl: true,
        description: "Create New Work Order",
        action: () => setLocation("/work-orders"),
      },
      {
        key: "r",
        alt: true,
        description: "Generate Report",
        action: () => setLocation("/reports"),
      },
    ];

    let gPressed = false;
    let gPressedTimeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle 'g' key for navigation shortcuts
      if (e.key === "g" && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        gPressed = true;
        
        // Reset g-pressed state after 1 second
        clearTimeout(gPressedTimeout);
        gPressedTimeout = setTimeout(() => {
          gPressed = false;
        }, 1000);
        return;
      }

      // Check if 'g' was pressed recently and handle navigation shortcuts
      if (gPressed && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const shortcut = shortcuts.find(
          (s) => s.key === e.key && !s.ctrl && !s.alt && !s.shift
        );
        
        if (shortcut) {
          e.preventDefault();
          shortcut.action();
          gPressed = false;
          clearTimeout(gPressedTimeout);
        }
        return;
      }

      // Handle other shortcuts with modifiers
      const shortcut = shortcuts.find(
        (s) =>
          s.key === e.key &&
          !!s.ctrl === e.ctrlKey &&
          !!s.alt === e.altKey &&
          !!s.shift === e.shiftKey
      );

      if (shortcut) {
        e.preventDefault();
        shortcut.action();
      }
    };

    // Don't activate shortcuts when typing in input fields
    const handleKeyDownWithFocus = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = 
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (!isInputField) {
        handleKeyDown(e);
      } else if (e.ctrlKey || e.altKey) {
        // Allow ctrl/alt shortcuts even in input fields
        handleKeyDown(e);
      }
    };

    window.addEventListener("keydown", handleKeyDownWithFocus);

    return () => {
      window.removeEventListener("keydown", handleKeyDownWithFocus);
      clearTimeout(gPressedTimeout);
    };
  }, [setLocation]);

  return null;
};

export default useKeyboardShortcuts;

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const shortcuts = [
  {
    category: "Navigation",
    items: [
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "W"], description: "Go to Work Orders" },
      { keys: ["G", "A"], description: "Go to Analytics" },
      { keys: ["G", "M"], description: "Go to Maintenance" },
      { keys: ["G", "V"], description: "Go to Vessels" },
      { keys: ["G", "E"], description: "Go to Equipment" },
      { keys: ["G", "H"], description: "Go to Health Monitor" },
      { keys: ["G", "I"], description: "Go to Inventory" },
      { keys: ["G", "C"], description: "Go to Crew Management" },
      { keys: ["G", "S"], description: "Go to Settings" },
    ],
  },
  {
    category: "Quick Actions",
    items: [
      { keys: ["Ctrl", "N"], description: "Create New Work Order" },
      { keys: ["Alt", "R"], description: "Generate Report" },
    ],
  },
  {
    category: "Help",
    items: [
      { keys: ["?"], description: "Show Keyboard Shortcuts" },
    ],
  },
];

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Show dialog when '?' is pressed (Shift + /)
      if (e.key === "?" && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        const isInputField = 
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        if (!isInputField) {
          e.preventDefault();
          setOpen(true);
        }
      }

      // Close dialog with Escape
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-keyboard-shortcuts">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Navigate faster with keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    data-testid={`shortcut-${shortcut.description.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <span className="text-sm text-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded shadow-sm">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">then</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border border-border rounded">?</kbd> anytime to see this help dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

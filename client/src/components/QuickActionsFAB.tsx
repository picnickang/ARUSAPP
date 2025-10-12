import { useState } from "react";
import { Plus, FileText, Wrench, Package, Bell, FileBarChart, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const quickActions = [
  { icon: Wrench, label: "New Work Order", path: "/work-orders", color: "bg-blue-500 hover:bg-blue-600" },
  { icon: FileText, label: "Log Telemetry", path: "/telemetry-upload", color: "bg-green-500 hover:bg-green-600" },
  { icon: Package, label: "Add Equipment", path: "/equipment-registry", color: "bg-purple-500 hover:bg-purple-600" },
  { icon: Bell, label: "Create Alert", path: "/alerts", color: "bg-orange-500 hover:bg-orange-600" },
  { icon: FileBarChart, label: "Generate Report", path: "/reports", color: "bg-indigo-500 hover:bg-indigo-600" },
];

export default function QuickActionsFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleAction = (path: string) => {
    setLocation(path);
    setIsOpen(false);
  };

  return (
    <div className="fixed fab-mobile z-50" data-testid="fab-container">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-16 right-0 flex flex-col gap-2 mb-2"
          >
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Button
                  onClick={() => handleAction(action.path)}
                  className={`${action.color} text-white shadow-lg min-w-[200px] justify-start gap-3`}
                  data-testid={`fab-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`h-14 w-14 rounded-full shadow-2xl transition-all ${
            isOpen 
              ? "bg-red-500 hover:bg-red-600 rotate-45" 
              : "bg-primary hover:bg-primary/90"
          }`}
          data-testid="fab-button"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </Button>
      </motion.div>
    </div>
  );
}

import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { AIChatBox } from "./AIChatBox";
import { useHaptic } from "../hooks/useHaptic";

export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const haptic = useHaptic();

  const handleToggle = () => {
    haptic.triggerHaptic('light');
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating chat button */}
      <Button
        onClick={handleToggle}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat modal */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none">
          <div className="fixed bottom-0 left-0 right-0 md:bottom-24 md:right-6 md:left-auto md:w-[400px] h-[80vh] md:h-[600px] bg-background border-t md:border md:rounded-lg shadow-2xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">AI Assistant</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggle}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Chat content */}
              <div className="flex-1 overflow-hidden p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  👋 Hey! I'm your apply.fun assistant. I can help you check new jobs, apply in bulk, manage credits, and track applications. What would you like to do?
                </p>
                <p className="text-sm text-muted-foreground">
                  Chat functionality coming soon! For now, use the dashboard pages to browse jobs, apply, and manage your account.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

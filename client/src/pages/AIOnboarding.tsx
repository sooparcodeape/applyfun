import { useState } from "react";
import { useLocation } from "wouter";
import { AIChatTerminal } from "@/components/AIChatTerminal";
import { Card } from "@/components/ui/card";

export default function AIOnboarding() {
  const [, setLocation] = useLocation();
  const [isComplete, setIsComplete] = useState(false);

  const handleComplete = () => {
    setIsComplete(true);
    // Redirect to dashboard after a brief delay
    setTimeout(() => {
      setLocation("/dashboard");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl bg-slate-900/50 border-purple-500/30 p-6">
        <AIChatTerminal mode="onboarding" onComplete={handleComplete} />
        {isComplete && (
          <div className="mt-4 text-center text-purple-300 animate-pulse">
            Taking you to your dashboard...
          </div>
        )}
      </Card>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface AIChatTerminalProps {
  mode: "onboarding" | "application";
  onComplete?: () => void;
  jobIds?: number[];
}

export function AIChatTerminal({ mode, onComplete, jobIds = [] }: AIChatTerminalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const chatMutation = trpc.ai.chat.useMutation();

  useEffect(() => {
    // Initial greeting based on mode
    const greeting = mode === "onboarding"
      ? "👋 Hey there! I'm your apply.fun AI assistant. I'll help you get set up in just a minute. First, tell me a bit about yourself - what kind of Web3 role are you looking for?"
      : `🚀 Great! I'm about to apply to ${jobIds.length} jobs for you. This will take about ${jobIds.length * 3} seconds. Keep this window open and watch the magic happen!\n\nStarting applications now...`;
    
    setMessages([{
      role: "assistant",
      content: greeting,
      timestamp: new Date()
    }]);

    // If application mode, start auto-applying
    if (mode === "application" && jobIds.length > 0) {
      simulateApplicationProgress(jobIds);
    }
  }, [mode, jobIds]);

  const simulateApplicationProgress = async (jobs: number[]) => {
    for (let i = 0; i < jobs.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const progressMessage: Message = {
        role: "system",
        content: `✅ Applied to job ${i + 1}/${jobs.length}\n\n*Analyzing job requirements...*\n*Tailoring your resume...*\n*Filling application form...*\n*Submitting application...*\n\n**Success!** Application submitted.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, progressMessage]);
    }

    // Final message
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `🎉 All done! I've successfully applied to ${jobs.length} jobs for you. You can track all your applications in the Applications tab. Want to apply to more jobs or need help with anything else?`,
        timestamp: new Date()
      }]);
      onComplete?.();
    }, 1000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await chatMutation.mutateAsync({
        message: input,
        context: mode,
        history: messages.map(m => ({ role: m.role, content: m.content }))
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: response.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Check if onboarding is complete
      if (mode === "onboarding" && response.onboardingComplete) {
        setTimeout(() => {
          onComplete?.();
        }, 2000);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again or contact support if this persists.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh] bg-slate-950 border border-purple-500/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
        <Sparkles className="h-5 w-5 text-purple-400" />
        <div>
          <h3 className="font-semibold text-white">apply.fun AI Assistant</h3>
          <p className="text-xs text-slate-400">
            {mode === "onboarding" ? "Let's get you set up" : "Applying to jobs..."}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <Card
              className={`max-w-[80%] p-4 ${
                message.role === "user"
                  ? "bg-purple-500/20 border-purple-500/30"
                  : message.role === "system"
                  ? "bg-blue-500/10 border-blue-500/30"
                  : "bg-slate-900/50 border-slate-700/30"
              }`}
            >
              <div className="text-sm">
                {message.role === "assistant" || message.role === "system" ? (
                  <Streamdown>{message.content}</Streamdown>
                ) : (
                  <p className="text-white whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </Card>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-4 bg-slate-900/50 border-slate-700/30">
              <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {mode === "onboarding" && (
        <div className="p-4 border-t border-purple-500/30 bg-slate-900/50">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 bg-slate-950 border-slate-700 focus:border-purple-500"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-purple-500 hover:bg-purple-600"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

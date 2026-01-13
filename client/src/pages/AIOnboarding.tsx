import { useState } from "react";
import { useLocation } from "wouter";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";

export default function AIOnboarding() {
  const [, setLocation] = useLocation();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "\ud83d\udc4b Hey there! I'm your apply.fun AI assistant. I'll help you get set up in just a minute. First, tell me a bit about yourself - what kind of Web3 role are you looking for?"
    }
  ]);

  const chatMutation = trpc.ai.chat.useMutation();

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = { role: "user", content };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await chatMutation.mutateAsync({
        message: content,
        context: "onboarding",
        history: messages
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: response.message
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.onboardingComplete) {
        setTimeout(() => {
          setLocation("/dashboard");
        }, 2000);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Sorry, I encountered an error. Please try again.`
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-4 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">apply.fun AI Assistant</h1>
          <p className="text-purple-200">Let's get you set up \ud83d\udc4b</p>
        </div>
        <AIChatBox
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={chatMutation.isPending}
          placeholder="Type your message..."
          height="600px"
        />
      </div>
    </div>
  );
}

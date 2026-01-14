import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { type ParsedResume } from "@/lib/resume-parser";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AIOnboarding() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "🚀 Yooo what's good! I'm your apply.fun AI assistant and I'm literally about to get you EMPLOYED fr fr.\n\nEnjoy your freedom while it lasts, because we're getting you hired ASAP! 💯\n\nTwo ways to speedrun this:\n1. Upload your resume (PDF/Word) and I'll extract everything automatically - no cap this slaps\n2. Just tell me about yourself and we'll build it together\n\nWhat's the vibe?"
    }
  ]);

  const chatMutation = trpc.ai.chat.useMutation();
  const updateProfileMutation = trpc.profile.update.useMutation();
  const uploadResumeMutation = trpc.profile.uploadResume.useMutation();
  const parseResumeMutation = trpc.profile.parseResume.useMutation();
  const addSkillMutation = trpc.skills.add.useMutation();
  const addExperienceMutation = trpc.workExperience.add.useMutation();
  
  // Redirect to signup if not authenticated (after all hooks)
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/signup");
    }
  }, [user, loading, setLocation]);
  
  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // This will redirect, but show nothing while redirecting
  if (!user) {
    return null;
  }

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword"
    ];
    
    if (!validTypes.includes(file.type)) {
      const errorMsg: Message = {
        role: "assistant",
        content: "❌ Invalid file type. Please upload a PDF or Word document (.pdf, .doc, .docx)"
      };
      setMessages(prev => [...prev, errorMsg]);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const errorMsg: Message = {
        role: "assistant",
        content: "❌ File too large. Please upload a file smaller than 10MB."
      };
      setMessages(prev => [...prev, errorMsg]);
      return;
    }

    setIsParsingResume(true);
    
    // Add message showing we're processing
    const processingMessage: Message = {
      role: "assistant",
      content: `📄 Got your resume! Parsing ${file.name}...`
    };
    setMessages(prev => [...prev, processingMessage]);

    try {
      // Parse resume via server
      const fileData = await file.arrayBuffer();
      const bytes = new Uint8Array(fileData);
      const binaryString = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
      const base64Data = btoa(binaryString);
      const parsed = await parseResumeMutation.mutateAsync({
        resumeBase64: `data:${file.type};base64,${base64Data}`,
        fileName: file.name,
        mimeType: file.type,
      }) as ParsedResume;
      
      // 1. Upload resume file to S3
      await uploadResumeMutation.mutateAsync({
        fileName: file.name,
        fileData: base64Data,
        mimeType: file.type,
      });
      
      // 2. Update profile with parsed data
      await updateProfileMutation.mutateAsync({
        phone: parsed.phone,
        location: parsed.location,
        bio: parsed.summary,
        githubUrl: parsed.links?.github,
        linkedinUrl: parsed.links?.linkedin,
        twitterHandle: parsed.links?.twitter,
      });
      
      // 3. Add skills as individual tags
      if (parsed.skills && parsed.skills.length > 0) {
        for (const skill of parsed.skills) {
          try {
            await addSkillMutation.mutateAsync({
              name: skill,
              category: 'technical',
            });
          } catch (err) {
            // Skip if skill already exists
            console.log(`Skill "${skill}" already exists or failed to add`);
          }
        }
      }
      
      // 4. Add work experience entries
      if (parsed.experience && parsed.experience.length > 0) {
        for (const exp of parsed.experience) {
          try {
            // Parse dates if available
            const startDate = exp.startDate ? new Date(exp.startDate) : new Date();
            const endDate = exp.endDate && exp.endDate.toLowerCase() !== 'present' ? new Date(exp.endDate) : null;
            const isCurrent = !endDate || exp.endDate?.toLowerCase() === 'present' ? 1 : 0;
            
            await addExperienceMutation.mutateAsync({
              company: exp.company,
              position: exp.title,
              description: exp.description || '',
              startDate,
              endDate: endDate || undefined,
              isCurrent,
            });
          } catch (err) {
            console.log(`Failed to add experience at ${exp.company}:`, err);
          }
        }
      }

      // Show success message with extracted info
      const successMessage: Message = {
        role: "assistant",
        content: `✅ Perfect! I've extracted your information:\n\n` +
          `**Name:** ${parsed.name || "Not found"}\n` +
          `**Email:** ${parsed.email || "Not found"}\n` +
          `**Skills:** ${parsed.skills.slice(0, 5).join(", ")}${parsed.skills.length > 5 ? " and more" : ""}\n` +
          `**Experience:** ${parsed.experience.length} positions\n` +
          `**Education:** ${parsed.education.length} entries\n\n` +
          `Your profile has been auto-filled! You're all set to start applying. Ready to see matching jobs?`
      };
      setMessages(prev => [...prev, successMessage]);

      // Success - info shown in chat message

      // Auto-redirect to dashboard after 3 seconds
      setTimeout(() => {
        setLocation("/dashboard");
      }, 3000);

    } catch (error: any) {
      console.error("[Resume Upload] Error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: `❌ Sorry, I couldn't parse your resume: ${error.message}\n\nNo worries! You can tell me about yourself manually instead.`
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Error shown in chat message
    } finally {
      setIsParsingResume(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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
        <div className="relative">
          <AIChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={chatMutation.isPending || isParsingResume}
            placeholder="Type your message..."
            height="600px"
          />
          
          {/* Resume Upload Button */}
          <div className="mt-4 flex justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              onChange={handleResumeUpload}
              className="hidden"
              disabled={isParsingResume}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsingResume}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              {isParsingResume ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing Resume...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Resume (PDF/Word)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

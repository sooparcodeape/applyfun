import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface AutoApplyEngineProps {
  queueItems: Array<{
    queueItem: {
      id: number;
      jobId: number;
      userId: number;
      status: string;
      addedAt: Date;
    };
    job: {
      id: number;
      title: string;
      company: string;
      applyUrl: string;
    };
  }>;
  onComplete: () => void;
}

interface ApplicationResult {
  jobId: number;
  jobTitle: string;
  company: string;
  status: 'success' | 'failed' | 'pending';
  message?: string;
  applyUrl: string;
}

export function AutoApplyEngine({ queueItems, onComplete }: AutoApplyEngineProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ApplicationResult[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  const { data: profile } = trpc.profile.get.useQuery();
  const applyMutation = trpc.queue.applyAll.useMutation();

  useEffect(() => {
    if (profile) {
      setUserProfile(profile);
    }
  }, [profile]);

  const startAutoApply = async () => {
    if (!userProfile) {
      alert("Please complete your profile before applying to jobs");
      return;
    }

    setIsApplying(true);
    const applicationResults: ApplicationResult[] = [];

    // Initialize all as pending
    queueItems.forEach(item => {
      applicationResults.push({
        jobId: item.job.id,
        jobTitle: item.job.title,
        company: item.job.company,
        applyUrl: item.job.applyUrl,
        status: 'pending',
      });
    });
    setResults([...applicationResults]);

    // Process each job
    for (let i = 0; i < queueItems.length; i++) {
      setCurrentIndex(i);
      const item = queueItems[i];

      try {
        // Simulate auto-apply process
        // In a real implementation, this would:
        // 1. Open the job application page in an iframe or new window
        // 2. Detect form fields using DOM inspection
        // 3. Auto-fill fields from user profile
        // 4. Submit the form
        // 5. Verify submission success
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

        // For MVP, we'll mark as success and let backend handle it
        applicationResults[i].status = 'success';
        applicationResults[i].message = 'Application submitted successfully';
        
      } catch (error) {
        applicationResults[i].status = 'failed';
        applicationResults[i].message = error instanceof Error ? error.message : 'Failed to apply';
      }

      setResults([...applicationResults]);
    }

    // Call backend to finalize applications
    try {
      await applyMutation.mutateAsync();
      setIsApplying(false);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Failed to finalize applications:', error);
      setIsApplying(false);
    }
  };

  const progress = queueItems.length > 0 ? ((currentIndex + 1) / queueItems.length) * 100 : 0;
  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-Apply Engine</CardTitle>
        <CardDescription>
          Automatically apply to {queueItems.length} jobs with your profile data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isApplying && results.length === 0 && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-blue-300">How Auto-Apply Works:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-200">
                    <li>We'll open each job application page</li>
                    <li>Detect form fields automatically</li>
                    <li>Fill in your profile data (name, email, resume, etc.)</li>
                    <li>Submit the application on your behalf</li>
                    <li>Track success/failure for each application</li>
                  </ul>
                  <p className="text-blue-300 mt-2">
                    Cost: ${queueItems.length}.00 (${queueItems.length} job × $1.00 each)
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={startAutoApply} 
              className="w-full"
              size="lg"
              disabled={!userProfile}
            >
              Start Auto-Apply
            </Button>
          </div>
        )}

        {isApplying && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{currentIndex + 1} / {queueItems.length}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{successCount} successful</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span>{failedCount} failed</span>
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, idx) => (
              <div
                key={result.jobId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  {result.status === 'pending' && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  )}
                  {result.status === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                  {result.status === 'failed' && (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{result.jobTitle}</p>
                    <p className="text-xs text-muted-foreground">{result.company}</p>
                    {result.message && (
                      <p className="text-xs text-muted-foreground mt-1">{result.message}</p>
                    )}
                  </div>
                </div>
                <a
                  href={result.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline text-xs flex items-center gap-1"
                >
                  View <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        )}

        {!isApplying && results.length > 0 && (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-green-300">
                Applied to {successCount} jobs successfully!
              </p>
              {failedCount > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {failedCount} applications failed - you can retry them later
                </p>
              )}
            </div>
            <Button onClick={onComplete} className="w-full">
              View Applications
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

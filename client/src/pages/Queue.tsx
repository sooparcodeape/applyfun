import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";
import { AIChatTerminal } from "@/components/AIChatTerminal";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Queue() {
  const [showAutoApply, setShowAutoApply] = useState(false);
  const [, setLocation] = useLocation();
  const { data: queueItems, isLoading } = trpc.queue.list.useQuery({ status: 'pending' });
  const { data: credits } = trpc.credits.balance.useQuery();
  const utils = trpc.useUtils();

  const removeFromQueue = trpc.queue.remove.useMutation({
    onSuccess: () => {
      utils.queue.list.invalidate();
      toast.success("Removed from queue");
    },
  });

  const applyToJobs = trpc.queue.applyAll.useMutation({
    onSuccess: (result) => {
      utils.queue.list.invalidate();
      utils.applications.list.invalidate();
      utils.credits.balance.invalidate();
      
      // Show success message with field count details
      if (result.successful > 0) {
        const avgFields = result.totalFieldsFilled ? Math.round(result.totalFieldsFilled / result.successful) : 0;
        const profileReminder = avgFields < 5 ? ' Complete your profile to fill more fields!' : '';
        toast.success(`Applied to ${result.successful} jobs successfully! (Avg ${avgFields} fields filled)${profileReminder}`);
      }
      
      // Show manual review message
      const manualReviewCount = (result as any).requiresManualReview || 0;
      if (manualReviewCount > 0) {
        toast.info(`${manualReviewCount} applications require manual review. Check your Applications page.`);
      }
      
      // Show failed message
      if (result.failed > 0) {
        toast.error(`${result.failed} applications failed`);
      }
      
      // Redirect to Applications page to review
      setTimeout(() => {
        setLocation('/applications');
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleRemove = (id: number) => {
    removeFromQueue.mutate({ queueId: id });
  };

  const handleApplyAll = () => {
    if (!queueItems || queueItems.length === 0) return;
    
    const totalCost = queueItems.length * 100; // $1 per application
    const availableCredits = credits?.balance || 0;

    if (totalCost > availableCredits) {
      toast.error(`Insufficient credits. Need $${(totalCost / 100).toFixed(2)}, have $${(availableCredits / 100).toFixed(2)}`);
      return;
    }

    // Call the backend mutation to actually create applications
    applyToJobs.mutate();
  };

  const handleAutoApplyComplete = () => {
    setShowAutoApply(false);
    utils.queue.list.invalidate();
    utils.applications.list.invalidate();
    utils.credits.balance.invalidate();
    setLocation('/applications');
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading queue...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Application Queue</h1>
          <p className="text-muted-foreground mt-2">
            Review and approve jobs before auto-applying
          </p>
        </div>
        {queueItems && queueItems.length > 0 && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {queueItems.length} jobs in queue
            </p>
            <p className="text-sm font-medium">
              Total cost: ${(queueItems.length * 1).toFixed(2)}
            </p>
            <Button 
              onClick={handleApplyAll} 
              className="mt-2"
              disabled={applyToJobs.isPending}
            >
              {applyToJobs.isPending ? "Applying..." : "Apply to All"}
            </Button>
          </div>
        )}
      </div>

      {!queueItems || queueItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No jobs in queue</p>
            <p className="text-sm text-muted-foreground mt-2">
              Browse jobs and add them to your queue to review before applying
            </p>
            <Button onClick={() => window.location.href = "/jobs"} className="mt-4">
              Browse Jobs
            </Button>
          </CardContent>
        </Card>
      ) : showAutoApply ? (
        <AIChatTerminal 
          mode="application"
          jobIds={queueItems.map((item: any) => item.jobId)}
          onComplete={handleAutoApplyComplete}
        />
      ) : (
        <div className="space-y-4">
          {queueItems.map((item: any) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{item.job.title}</CardTitle>
                    <CardDescription>
                      {item.job.company} • {item.job.location} • {item.job.jobType}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(item.id)}
                    disabled={removeFromQueue.isPending}
                  >
                    Remove
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {item.job.salaryRange && (
                    <p className="text-sm">
                      <strong>Salary:</strong> {item.job.salaryRange}
                    </p>
                  )}
                  {item.job.tags && (() => {
                    try {
                      const tags = typeof item.job.tags === 'string' ? JSON.parse(item.job.tags) : item.job.tags;
                      return tags && tags.length > 0;
                    } catch {
                      return false;
                    }
                  })() && (
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        try {
                          const tags = typeof item.job.tags === 'string' ? JSON.parse(item.job.tags) : item.job.tags;
                          return tags.map((tag: string, idx: number) => (
                        <span
                          key={`${item.id}-tag-${idx}`}
                          className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                          ));
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  )}
                  {item.job.applyUrl && (
                    <a
                      href={item.job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline"
                    >
                      View Job Posting →
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

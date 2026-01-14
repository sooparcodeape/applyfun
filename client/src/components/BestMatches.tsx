import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  TrendingUp, 
  MapPin, 
  Building2, 
  ExternalLink,
  Bookmark,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { toast } from "sonner";

interface BestMatchesProps {
  onSaveJob: (jobId: number) => void;
  onAddToQueue: (jobId: number) => void;
}

export function BestMatches({ onSaveJob, onAddToQueue }: BestMatchesProps) {
  const { data: matches, isLoading, error } = trpc.matching.bestMatches.useQuery({ limit: 10 });
  const { data: jobsData } = trpc.jobs.list.useQuery({ limit: 100 });

  // Handle errors gracefully
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Best Matches For You
          </CardTitle>
          <CardDescription>Complete your profile to see personalized job matches</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Add your skills and experience to get smart job recommendations
          </p>
          <Button onClick={() => window.location.href = '/profile'}>
            Complete Profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Best Matches For You
          </CardTitle>
          <CardDescription>Jobs that match your skills and experience</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Best Matches For You
          </CardTitle>
          <CardDescription>Complete your profile to see personalized job matches</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Add your skills and experience to get smart job recommendations
          </p>
          <Button onClick={() => window.location.href = '/profile'}>
            Complete Profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Get full job details for matched jobs
  const matchedJobs = matches.map(match => {
    const job = jobsData?.jobs.find(j => j.id === match.jobId);
    return { match, job };
  }).filter(item => item.job);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Best Matches For You
        </CardTitle>
        <CardDescription>
          Top {matches.length} jobs based on your skills and experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {matchedJobs.map(({ match, job }) => {
          if (!job) return null;

          const matchColor = 
            match.matchScore >= 80 ? "text-green-500" :
            match.matchScore >= 60 ? "text-blue-500" :
            match.matchScore >= 40 ? "text-yellow-500" :
            "text-gray-500";

          return (
            <div key={job.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Building2 className="w-4 h-4" />
                    {job.company}
                    <span>•</span>
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-2xl font-bold ${matchColor}`}>
                    {match.matchScore}%
                  </div>
                </div>
              </div>

              {/* Match Score Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Match Score</span>
                  <span>{match.matchScore}% compatible</span>
                </div>
                <Progress value={match.matchScore} className="h-2" />
              </div>

              {/* Match Details */}
              <div className="flex flex-wrap gap-2">
                {match.matchedSkills.length > 0 && (
                  <Badge variant="outline" className="text-green-500 border-green-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {match.matchedSkills.length} skills match
                  </Badge>
                )}
                {match.experienceMatch && (
                  <Badge variant="outline" className="text-blue-500 border-blue-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Experience level
                  </Badge>
                )}
                {match.locationMatch && (
                  <Badge variant="outline" className="text-purple-500 border-purple-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Location
                  </Badge>
                )}
                {match.totalSkills > match.matchedSkills.length && (
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                    <XCircle className="w-3 h-3 mr-1" />
                    {match.totalSkills - match.matchedSkills.length} skills missing
                  </Badge>
                )}
              </div>

              {/* Matched Skills */}
              {match.matchedSkills.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Your matching skills: </span>
                  {match.matchedSkills.slice(0, 5).join(', ')}
                  {match.matchedSkills.length > 5 && ` +${match.matchedSkills.length - 5} more`}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSaveJob(job.id)}
                >
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button
                  size="sm"
                  onClick={() => onAddToQueue(job.id)}
                >
                  Add to Queue
                </Button>
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto"
                >
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

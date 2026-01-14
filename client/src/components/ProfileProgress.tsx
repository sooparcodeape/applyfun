import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function ProfileProgress() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: profile } = trpc.profile.get.useQuery();
  const { data: skills } = trpc.skills.list.useQuery();
  const { data: experiences } = trpc.workExperience.list.useQuery();

  if (!user) return null;

  // Calculate completion
  const checks = [
    { label: "Basic Info (Name, Email)", completed: !!user.name && !!user.email },
    { label: "Phone Number", completed: !!profile?.profile?.phone },
    { label: "Location", completed: !!profile?.profile?.location },
    { label: "Skills (at least 3)", completed: (skills?.length || 0) >= 3 },
    { label: "Work Experience", completed: (experiences?.length || 0) > 0 },
    { label: "Social Links (LinkedIn/GitHub)", completed: !!(profile?.profile?.linkedinUrl || profile?.profile?.githubUrl) },
  ];

  const completedCount = checks.filter(c => c.completed).length;
  const totalCount = checks.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profile Completion</CardTitle>
        <CardDescription>
          Complete your profile to improve job matching
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{percentage}% Complete</span>
            <span className="font-medium">{completedCount}/{totalCount}</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        <div className="space-y-2">
          {checks.map((check, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              {check.completed ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className={check.completed ? "text-muted-foreground line-through" : ""}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

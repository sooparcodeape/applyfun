import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Coins, Briefcase, CheckCircle, Clock, TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: profile } = trpc.profile.get.useQuery();
  const { data: credits } = trpc.credits.balance.useQuery();
  const { data: jobStats } = trpc.jobs.stats.useQuery();
  const { data: appStats } = trpc.applications.stats.useQuery();

  const hasCompletedProfile = profile?.profile !== undefined;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {user?.name?.split(" ")[0] || "there"}! 👋
        </h1>
        <p className="text-muted-foreground mt-2">
          {hasCompletedProfile 
            ? "Ready to apply to more crypto jobs?"
            : "Let's get your profile set up to start applying!"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Credits Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Balance</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${((credits?.balance || 0) / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {credits?.balance ? `${Math.floor(credits.balance / 100)} applications available` : "Add credits to start applying"}
            </p>
          </CardContent>
        </Card>

        {/* Total Applications */}
        {/* Total Applications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications Sent</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total applications
            </p>
          </CardContent>
        </Card>

        {/* Interviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interviews</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(appStats?.byStatus && 'interview' in appStats.byStatus) ? appStats.byStatus.interview : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Interview invitations
            </p>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(appStats?.byStatus && 'pending' in appStats.byStatus) ? appStats.byStatus.pending : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {!hasCompletedProfile && (
          <Card className="border-purple-500/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <CardTitle>Complete Your Profile</CardTitle>
              </div>
              <CardDescription>
                Set up your profile to start applying to jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation("/onboarding")} className="w-full">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-500" />
              <CardTitle>Browse Jobs</CardTitle>
            </div>
            <CardDescription>
              {jobStats?.active || 0} active crypto jobs available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/jobs")} variant="outline" className="w-full">
              View Jobs
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <CardTitle>Application Queue</CardTitle>
            </div>
            <CardDescription>
              Review and approve jobs before applying
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/queue")} variant="outline" className="w-full">
              View Queue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <CardTitle>Add Credits</CardTitle>
            </div>
            <CardDescription>
              Top up your balance to apply to more jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/credits")} variant="outline" className="w-full">
              Manage Credits
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {appStats && appStats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest job applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={() => setLocation("/applications")} 
                variant="outline" 
                className="w-full"
              >
                View All Applications
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

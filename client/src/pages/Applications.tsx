import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Building2,
  Calendar,
  ExternalLink,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  MessageSquare,
  Award,
} from "lucide-react";
import { toast } from "sonner";

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
  applied: { label: "Applied", icon: CheckCircle2, color: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  viewed: { label: "Viewed", icon: Eye, color: "bg-purple-500/10 text-purple-500 border-purple-500/30" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-500/10 text-red-500 border-red-500/30" },
  interview: { label: "Interview", icon: MessageSquare, color: "bg-green-500/10 text-green-500 border-green-500/30" },
  offer: { label: "Offer", icon: Award, color: "bg-pink-500/10 text-pink-500 border-pink-500/30" },
  accepted: { label: "Accepted", icon: TrendingUp, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
};

export default function Applications() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const { data: applications, isLoading } = trpc.applications.list.useQuery();
  const { data: stats } = trpc.applications.stats.useQuery();
  const utils = trpc.useUtils();

  const updateStatusMutation = trpc.applications.updateStatus.useMutation({
    onSuccess: () => {
      utils.applications.list.invalidate();
      utils.applications.stats.invalidate();
      toast.success("Status updated successfully");
      setSelectedApp(null);
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  const handleUpdateStatus = () => {
    if (!selectedApp || !newStatus) return;
    
    updateStatusMutation.mutate({
      id: selectedApp.application.id,
      status: newStatus as any,
      notes: notes || undefined,
    });
  };

  const filteredApplications = applications?.filter((app) => {
    if (filterStatus === "all") return true;
    return app.application.status === filterStatus;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Applications</h1>
        <p className="text-muted-foreground mt-2">
          Track all your job applications and their status
        </p>
      </div>

      {/* Stats Cards */}
      {stats && 'byStatus' in stats && stats.byStatus && typeof stats.byStatus === 'object' && 'interview' in stats.byStatus && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Applied</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Interviews</CardDescription>
              <CardTitle className="text-3xl text-green-500">{stats.byStatus.interview}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Offers</CardDescription>
              <CardTitle className="text-3xl text-pink-500">{stats.byStatus.offer}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Success Rate</CardDescription>
              <CardTitle className="text-3xl text-purple-500">
                {stats.total > 0 ? Math.round((stats.byStatus.interview / stats.total) * 100) : 0}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
            >
              All ({applications?.length || 0})
            </Button>
            {Object.entries(statusConfig).map(([status, config]) => {
              const count = applications?.filter((app) => app.application.status === status).length || 0;
              return (
                <Button
                  key={status}
                  variant={filterStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                >
                  {config.label} ({count})
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      {!filteredApplications || filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              {filterStatus === "all"
                ? "No applications yet. Start applying to jobs!"
                : `No ${filterStatus} applications found.`}
            </p>
            {filterStatus === "all" && (
              <Button onClick={() => window.location.href = "/jobs"} className="mt-4">
                Browse Jobs
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => {
            const config = statusConfig[app.application.status as keyof typeof statusConfig];
            const Icon = config.icon;

            return (
              <Card key={app.application.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle>{app.job.title}</CardTitle>
                        <Badge className={config.color}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <CardDescription className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {app.job.company} • {app.job.location}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="w-3 h-3" />
                          Applied {new Date(app.application.appliedAt).toLocaleDateString()} • 
                          Last updated {new Date(app.application.statusUpdatedAt).toLocaleDateString()}
                        </div>
                        {app.application.applicationMethod && (
                          <div className="text-xs">
                            Method: {app.application.applicationMethod === "auto" ? "Auto-Apply" : "Manual"}
                          </div>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedApp(app);
                              setNewStatus(app.application.status);
                              setNotes(app.application.notes || "");
                            }}
                          >
                            Update Status
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Application Status</DialogTitle>
                            <DialogDescription>
                              {app.job.title} at {app.job.company}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">Status</label>
                              <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(statusConfig).map(([status, config]) => (
                                    <SelectItem key={status} value={status}>
                                      {config.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block">Notes</label>
                              <Textarea
                                placeholder="Add notes about this application..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={4}
                              />
                            </div>
                            <Button
                              onClick={handleUpdateStatus}
                              className="w-full"
                              disabled={updateStatusMutation.isPending}
                            >
                              {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <a
                        href={app.job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </CardHeader>
                {app.application.notes && (
                  <CardContent>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">{app.application.notes}</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

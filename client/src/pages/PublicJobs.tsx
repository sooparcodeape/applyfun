import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Loader2,
  Search,
  Building2,
  MapPin,
  DollarSign,
  ExternalLink,
  Bookmark,
  LogIn,
} from "lucide-react";
import { NextScrapeCountdown } from "@/components/NextScrapeCountdown";

export default function PublicJobs() {
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [jobType, setJobType] = useState<string>("all");
  const [location, setLocation] = useState<string>("all");
  const { user } = useAuth();
  const [, setLocationPath] = useLocation();

  const { data: jobsData, isLoading } = trpc.jobs.list.useQuery({
    search,
    jobType: jobType === "all" ? undefined : jobType,
    location: location === "all" ? undefined : location,
    limit: 100,
  });

  const saveJobMutation = trpc.jobs.save.useMutation();
  const addToQueueMutation = trpc.queue.add.useMutation();

  // Extract unique categories and companies from jobs
  const categories = Array.from(
    new Set(
      (jobsData?.jobs || []).flatMap((job) => {
        try {
          return JSON.parse(job.tags || "[]");
        } catch {
          return [];
        }
      })
    )
  ).slice(0, 20);

  const companies = Array.from(
    new Set((jobsData?.jobs || []).map((job) => job.company))
  ).slice(0, 30);

  // Filter jobs based on selections
  const filteredJobs = (jobsData?.jobs || []).filter((job) => {
    if (selectedCategories.length > 0) {
      const jobTags = JSON.parse(job.tags || "[]");
      if (!selectedCategories.some((cat) => jobTags.includes(cat))) {
        return false;
      }
    }
    if (selectedCompanies.length > 0) {
      if (!selectedCompanies.includes(job.company)) {
        return false;
      }
    }
    return true;
  });

  const handleSaveJob = (jobId: number) => {
    if (!user) {
      toast.error("Please sign up to save jobs");
      setLocationPath("/signup");
      return;
    }
    saveJobMutation.mutate({ jobId });
    toast.success("Job saved!");
  };

  const handleAddToQueue = (jobId: number) => {
    if (!user) {
      toast.error("Please sign up to apply to jobs");
      setLocationPath("/signup");
      return;
    }
    addToQueueMutation.mutate({ jobId });
    toast.success("Added to application queue!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <header className="border-b border-purple-500/20 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10 safe-top">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="apply.fun" className="h-10 w-10" />
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              apply.fun
            </span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Button onClick={() => setLocationPath("/dashboard")}>
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setLocationPath("/login")}>
                  Log In
                </Button>
                <Button onClick={() => setLocationPath("/signup")}>
                  Sign Up - Get $5 Free
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Browse Crypto Jobs
          </h1>
          <p className="text-muted-foreground">
            {filteredJobs.length} jobs available • <NextScrapeCountdown />
          </p>
          {!user && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm text-blue-300">
                <LogIn className="w-4 h-4 inline mr-2" />
                Sign up to save jobs and auto-apply with one click. Get $5 free credits (5 applications)!
              </p>
            </div>
          )}
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, company, or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["all", "Full-time", "Part-time", "Contract", "Freelance"].map((type) => (
                  <Button
                    key={type}
                    variant={jobType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setJobType(type)}
                  >
                    {type === "all" ? "All Types" : type}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["all", "Remote", "Hybrid", "On-site"].map((loc) => (
                  <Button
                    key={loc}
                    variant={location === loc ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLocation(loc)}
                  >
                    {loc === "all" ? "All Locations" : loc}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>
              {selectedCategories.length > 0
                ? `${selectedCategories.length} selected`
                : "Select categories to filter"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((category, idx) => (
                <Button
                  key={`category-${idx}-${category}`}
                  variant={selectedCategories.includes(category) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (selectedCategories.includes(category)) {
                      setSelectedCategories(selectedCategories.filter((c) => c !== category));
                    } else {
                      setSelectedCategories([...selectedCategories, category]);
                    }
                  }}
                >
                  {category}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Companies */}
        <Card>
          <CardHeader>
            <CardTitle>Companies</CardTitle>
            <CardDescription>
              {selectedCompanies.length > 0
                ? `${selectedCompanies.length} selected`
                : "Select companies to filter"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {companies.map((company, idx) => (
                <Button
                  key={`company-${idx}-${company}`}
                  variant={selectedCompanies.includes(company) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (selectedCompanies.includes(company)) {
                      setSelectedCompanies(selectedCompanies.filter((c) => c !== company));
                    } else {
                      setSelectedCompanies([...selectedCompanies, company]);
                    }
                  }}
                >
                  {company}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Job Listings */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid gap-4">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{job.title}</CardTitle>
                      <CardDescription className="mt-2">
                        <Building2 className="w-4 h-4 inline mr-1" />
                        {job.company} • <MapPin className="w-4 h-4 inline mr-1" />
                        {job.location}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveJob(job.id)}
                        disabled={saveJobMutation.isPending}
                      >
                        <Bookmark className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAddToQueue(job.id)}
                        disabled={addToQueueMutation.isPending}
                      >
                        {user ? "Add to Queue" : "Sign Up to Apply"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(job.tags || "[]").map((tag: string, idx: number) => (
                        <span
                          key={`${job.id}-tag-${idx}`}
                          className="px-2 py-1 bg-purple-500/10 text-purple-500 rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {job.salaryMin && job.salaryMax && (
                      <p className="text-sm text-muted-foreground">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        ${(job.salaryMin / 1000).toFixed(0)}k - $
                        {(job.salaryMax / 1000).toFixed(0)}k {job.salaryCurrency}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline inline-flex items-center gap-1"
                      >
                        View Job <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="text-xs text-muted-foreground">
                        • Posted {job.postedDate ? new Date(job.postedDate).toLocaleDateString() : 'Recently'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No jobs found matching your filters. Try adjusting your search criteria.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

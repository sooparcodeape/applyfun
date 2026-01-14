import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  Building2,
  MapPin,
  DollarSign,
  ExternalLink,
  Bookmark,
} from "lucide-react";
import { NextScrapeCountdown } from "@/components/NextScrapeCountdown";
import { BestMatches } from "@/components/BestMatches";

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [jobType, setJobType] = useState<string>("all");
  const [location, setLocation] = useState<string>("all");

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
    saveJobMutation.mutate({ jobId });
    toast.success("Job saved!");
  };

  const handleAddToQueue = (jobId: number) => {
    addToQueueMutation.mutate({ jobId });
    toast.success("Added to application queue!");
  };

  return (
    <div className="space-y-6">
      {/* Best Matches Section */}
      <BestMatches onSaveJob={handleSaveJob} onAddToQueue={handleAddToQueue} />
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Browse Crypto Jobs</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
          <p className="text-sm sm:text-base text-muted-foreground">
            {filteredJobs.length} jobs available • Select categories and companies to target
          </p>
          <NextScrapeCountdown />
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button variant="outline">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Job Type</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="w-full p-2 border rounded-lg bg-background"
            >
              <option value="all">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Location</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-2 border rounded-lg bg-background"
            >
              <option value="all">All Locations</option>
              <option value="Remote">Remote</option>
              <option value="On-site">On-site</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Filtered Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredJobs.length}</div>
            <p className="text-xs text-muted-foreground">jobs match your criteria</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Category</CardTitle>
          <CardDescription>
            Select categories to target ({selectedCategories.length} selected)
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

      {/* Company Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Company</CardTitle>
          <CardDescription>
            Select companies to target ({selectedCompanies.length} selected)
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
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg truncate">{job.title}</CardTitle>
                    <CardDescription className="mt-2 text-xs sm:text-sm">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="flex items-center">
                          <Building2 className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 flex-shrink-0" />
                          <span className="truncate">{job.company}</span>
                        </span>
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 flex-shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveJob(job.id)}
                      disabled={saveJobMutation.isPending}
                      className="whitespace-nowrap"
                    >
                      <Bookmark className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAddToQueue(job.id)}
                      disabled={addToQueueMutation.isPending}
                      className="whitespace-nowrap text-xs sm:text-sm"
                    >
                      Add to Queue
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
            <p className="text-muted-foreground">No jobs found matching your criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

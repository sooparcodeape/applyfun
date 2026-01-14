import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, FileText, ArrowRight, Upload, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [selectedMode, setSelectedMode] = useState<"easy" | "manual" | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [editedData, setEditedData] = useState<any>(null);

  // Initialize editedData when parsedData changes
  useEffect(() => {
    if (parsedData && !editedData) {
      setEditedData({ ...parsedData });
    }
  }, [parsedData, editedData]);

  const parseResumeMutation = trpc.profile.parseResume.useMutation({
    onSuccess: (data) => {
      setParsedData(data);
      toast.success("Resume parsed successfully!");
    },
    onError: (error) => {
      toast.error("Failed to parse resume: " + error.message);
      setIsUploading(false);
    },
  });

  const handleEasyMode = () => {
    setSelectedMode("easy");
  };

  const handleManualMode = () => {
    setSelectedMode("manual");
    window.location.href = "/credits?welcome=true";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setResumeFile(file);
    setIsUploading(true);

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      parseResumeMutation.mutate({ resumeBase64: base64 });
    };
    reader.readAsDataURL(file);
  };

  const updateProfileMutation = trpc.profile.updateFromParsed.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      window.location.href = "/credits?welcome=true";
    },
    onError: (error) => {
      toast.error("Failed to update profile: " + error.message);
    },
  });

  const handleConfirmParsedData = () => {
    // Save edited data to profile with proper field mapping
    updateProfileMutation.mutate({
      name: editedData.name,
      email: editedData.email,
      phone: editedData.phone,
      location: editedData.location,
      skills: editedData.skills || [],
      experience: editedData.experience || [],
      education: editedData.education || [],
      summary: editedData.summary,
      github: editedData.links?.github || editedData.github,
      linkedin: editedData.links?.linkedin || editedData.linkedin,
      twitter: editedData.links?.twitter || editedData.twitter,
      telegram: editedData.links?.telegram || editedData.telegram,
    });
  };

  if (selectedMode === "easy" && !parsedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Sparkles className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-2xl">AI-Assisted Profile Setup</CardTitle>
                <CardDescription className="mt-1">
                  Upload your resume and let AI extract your information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-purple-500/30 rounded-lg p-12 text-center hover:border-purple-500/50 transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="resume-upload"
                disabled={isUploading}
              />
              <label htmlFor="resume-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {resumeFile ? resumeFile.name : "Upload Your Resume"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  PDF format, max 5MB
                </p>
                {isUploading && (
                  <p className="text-sm text-purple-500 mt-4">
                    Parsing resume with AI...
                  </p>
                )}
              </label>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                What we'll extract:
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Personal information (name, email, phone, location)</li>
                <li>• Work experience and job history</li>
                <li>• Skills and technologies</li>
                <li>• Education background</li>
                <li>• Social links (GitHub, LinkedIn, etc.)</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedMode(null)}
                className="flex-1"
              >
                Back to Options
              </Button>
              <Button
                variant="ghost"
                onClick={() => setLocation("/profile")}
                className="flex-1"
              >
                Skip for Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (parsedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-3xl w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Review Your Information</CardTitle>
            <CardDescription>
              We've extracted the following information from your resume. Review and edit if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <input
                  type="text"
                  value={editedData?.name || ""}
                  onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={editedData?.email || ""}
                  onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <input
                  type="tel"
                  value={editedData?.phone || ""}
                  onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <input
                  type="text"
                  value={editedData?.location || ""}
                  onChange={(e) => setEditedData({ ...editedData, location: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                  placeholder="City, State/Country"
                />
              </div>
            </div>

            {editedData?.skills && (
              <div>
                <label className="text-sm font-medium">Skills</label>
                <div className="flex flex-wrap gap-2 mt-2 mb-2">
                  {editedData.skills.map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-purple-500/10 text-purple-500 rounded-full text-sm flex items-center gap-2"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => {
                          const newSkills = editedData.skills.filter((_: string, i: number) => i !== idx);
                          setEditedData({ ...editedData, skills: newSkills });
                        }}
                        className="hover:text-purple-300 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a skill and press Enter"
                    className="flex-1 px-3 py-2 border rounded-md bg-background"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.currentTarget;
                        const skill = input.value.trim();
                        if (skill && !editedData.skills.includes(skill)) {
                          setEditedData({ ...editedData, skills: [...editedData.skills, skill] });
                          input.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {editedData?.experience && editedData.experience.length > 0 && (
              <div>
                <label className="text-sm font-medium">Work Experience</label>
                <div className="space-y-4 mt-2">
                  {editedData.experience.map((exp: any, idx: number) => (
                    <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-sm">Experience {idx + 1}</h4>
                        <button
                          type="button"
                          onClick={() => {
                            const newExperience = editedData.experience.filter((_: any, i: number) => i !== idx);
                            setEditedData({ ...editedData, experience: newExperience });
                          }}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={exp.title || ""}
                          onChange={(e) => {
                            const newExperience = [...editedData.experience];
                            newExperience[idx] = { ...newExperience[idx], title: e.target.value };
                            setEditedData({ ...editedData, experience: newExperience });
                          }}
                          placeholder="Job Title"
                          className="px-3 py-2 border rounded-md bg-background text-sm"
                        />
                        <input
                          type="text"
                          value={exp.company || ""}
                          onChange={(e) => {
                            const newExperience = [...editedData.experience];
                            newExperience[idx] = { ...newExperience[idx], company: e.target.value };
                            setEditedData({ ...editedData, experience: newExperience });
                          }}
                          placeholder="Company Name"
                          className="px-3 py-2 border rounded-md bg-background text-sm"
                        />
                        <input
                          type="text"
                          value={exp.startDate || ""}
                          onChange={(e) => {
                            const newExperience = [...editedData.experience];
                            newExperience[idx] = { ...newExperience[idx], startDate: e.target.value };
                            setEditedData({ ...editedData, experience: newExperience });
                          }}
                          placeholder="Start Date (e.g., Jan 2020)"
                          className="px-3 py-2 border rounded-md bg-background text-sm"
                        />
                        <input
                          type="text"
                          value={exp.endDate || ""}
                          onChange={(e) => {
                            const newExperience = [...editedData.experience];
                            newExperience[idx] = { ...newExperience[idx], endDate: e.target.value };
                            setEditedData({ ...editedData, experience: newExperience });
                          }}
                          placeholder="End Date (e.g., Present)"
                          className="px-3 py-2 border rounded-md bg-background text-sm"
                        />
                      </div>
                      <textarea
                        value={exp.description || ""}
                        onChange={(e) => {
                          const newExperience = [...editedData.experience];
                          newExperience[idx] = { ...newExperience[idx], description: e.target.value };
                          setEditedData({ ...editedData, experience: newExperience });
                        }}
                        placeholder="Job description (optional)"
                        rows={2}
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      />
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newExperience = [...(editedData.experience || []), { title: "", company: "", startDate: "", endDate: "", description: "" }];
                    setEditedData({ ...editedData, experience: newExperience });
                  }}
                  className="mt-3"
                >
                  + Add Experience
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleConfirmParsedData} className="flex-1">
                Looks Good! Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setParsedData(null);
                  setResumeFile(null);
                  setSelectedMode(null);
                }}
              >
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              apply.fun
            </span>
          </h1>
          <p className="text-xl text-slate-300">
            Let's set up your profile to start applying to crypto jobs
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Easy Mode */}
          <Card className="border-2 border-purple-500/50 hover:border-purple-500 transition-all cursor-pointer group">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                  <Sparkles className="w-8 h-8 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Easy Mode</CardTitle>
                  <CardDescription className="mt-1">
                    AI-Assisted Auto-Fill
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Upload your resume and let our AI extract all your information automatically.
                Review and confirm in seconds.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Upload PDF resume</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>AI extracts all details</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Review & confirm</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Done in 30 seconds</span>
                </li>
              </ul>
              <Button onClick={handleEasyMode} className="w-full" size="lg">
                Get Started with AI
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Manual Mode */}
          <Card className="border-2 border-slate-500/30 hover:border-slate-500/50 transition-all cursor-pointer group">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-slate-500/10 rounded-lg group-hover:bg-slate-500/20 transition-colors">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Manual Mode</CardTitle>
                  <CardDescription className="mt-1">
                    Fill in Your Details
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Prefer to enter your information manually? Fill out the profile form
                step-by-step at your own pace.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-slate-400" />
                  <span>Complete control</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-slate-400" />
                  <span>Step-by-step guidance</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-slate-400" />
                  <span>Edit anytime</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-slate-400" />
                  <span>Takes 5-10 minutes</span>
                </li>
              </ul>
              <Button onClick={handleManualMode} variant="outline" className="w-full" size="lg">
                Fill Manually
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

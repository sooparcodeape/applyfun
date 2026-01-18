import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Loader2, FileText, CheckCircle2, Plus, Trash2, Star, Lightbulb, PenLine } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Profile() {
  const { data: profileData, isLoading, refetch } = trpc.profile.get.useQuery();
  const updateProfile = trpc.profile.update.useMutation();
  const uploadResume = trpc.profile.uploadResume.useMutation();
  const parseResumeMutation = trpc.profile.parseResume.useMutation();
  
  // STAR Achievements
  const { data: achievements, refetch: refetchAchievements } = trpc.starAchievements.list.useQuery();
  const addAchievement = trpc.starAchievements.add.useMutation();
  const deleteAchievement = trpc.starAchievements.delete.useMutation();
  
  // Writing Samples
  const { data: writingSamples, refetch: refetchSamples } = trpc.writingSamples.list.useQuery();
  const addSample = trpc.writingSamples.add.useMutation();
  const deleteSample = trpc.writingSamples.delete.useMutation();

  const [formData, setFormData] = useState({
    phone: "",
    location: "",
    linkedinUrl: "",
    githubUrl: "",
    twitterHandle: "",
    portfolioUrl: "",
    bio: "",
    currentCompany: "",
    currentTitle: "",
    yearsOfExperience: 0,
    workAuthorization: "",
    willingToRelocate: 0,
    university: "",
    graduatedFromUniversity: 0,
    sponsorshipRequired: 0,
    fintechExperience: 0,
    fintechExperienceDescription: "",
    whyApply: "",
    yearsOfExperienceRange: "",
    // New Ashby fields
    visaType: "",
    pronouns: "",
    instagramHandle: "",
    roleType: "" as "" | "marketing" | "engineering",
    gtmTeamReason: "",
    gtmExperience: "",
    yearsOfSoftwareDev: 0,
    techStackExperience: {} as Record<string, number>,
    ableToWorkInOffice: 0,
  });

  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Achievement form
  const [showAchievementDialog, setShowAchievementDialog] = useState(false);
  const [achievementForm, setAchievementForm] = useState({
    title: "",
    situation: "",
    task: "",
    action: "",
    result: "",
    metricValue: "",
    metricType: "",
    category: "",
  });
  
  // Writing sample form
  const [showSampleDialog, setShowSampleDialog] = useState(false);
  const [sampleForm, setSampleForm] = useState({
    type: "linkedin_post" as const,
    title: "",
    content: "",
    sourceUrl: "",
  });

  // Calculate profile completion
  const calculateCompletion = () => {
    const basicFields = [
      formData.phone,
      formData.location,
      formData.linkedinUrl,
      formData.currentCompany,
      formData.workAuthorization,
      formData.yearsOfExperienceRange,
      profileData?.profile?.resumeUrl,
    ];
    const basicFilled = basicFields.filter(f => f && f !== "").length;
    const basicScore = (basicFilled / basicFields.length) * 60; // 60% weight for basic info
    
    // STAR achievements (20% weight)
    const achievementScore = achievements && achievements.length > 0 ? 20 : 0;
    
    // Writing samples (20% weight)
    const sampleScore = writingSamples && writingSamples.length > 0 ? 20 : 0;
    
    return Math.round(basicScore + achievementScore + sampleScore);
  };

  useEffect(() => {
    if (profileData?.profile) {
      setFormData({
        phone: profileData.profile.phone || "",
        location: profileData.profile.location || "",
        linkedinUrl: profileData.profile.linkedinUrl || "",
        githubUrl: profileData.profile.githubUrl || "",
        twitterHandle: profileData.profile.twitterHandle || "",
        portfolioUrl: profileData.profile.portfolioUrl || "",
        bio: profileData.profile.bio || "",
        currentCompany: profileData.profile.currentCompany || "",
        currentTitle: profileData.profile.currentTitle || "",
        yearsOfExperience: profileData.profile.yearsOfExperience || 0,
        workAuthorization: profileData.profile.workAuthorization || "",
        willingToRelocate: profileData.profile.willingToRelocate || 0,
        university: profileData.profile.university || "",
        graduatedFromUniversity: profileData.profile.university ? 1 : 0,
        sponsorshipRequired: profileData.profile.sponsorshipRequired || 0,
        fintechExperience: profileData.profile.fintechExperience || 0,
        fintechExperienceDescription: profileData.profile.fintechExperienceDescription || "",
        whyApply: profileData.profile.howDidYouHear || "",
        yearsOfExperienceRange: getExperienceRange(profileData.profile.yearsOfExperience || 0),
        // New Ashby fields
        visaType: profileData.profile.visaType || "",
        pronouns: profileData.profile.pronouns || "",
        instagramHandle: profileData.profile.instagramHandle || "",
        roleType: (profileData.profile.roleType || "") as "" | "marketing" | "engineering",
        gtmTeamReason: profileData.profile.gtmTeamReason || "",
        gtmExperience: profileData.profile.gtmExperience || "",
        yearsOfSoftwareDev: profileData.profile.yearsOfSoftwareDev || 0,
        techStackExperience: profileData.profile.techStackExperience ? JSON.parse(profileData.profile.techStackExperience) : {},
        ableToWorkInOffice: profileData.profile.ableToWorkInOffice || 0,
      });
    }
  }, [profileData]);

  const getExperienceRange = (years: number): string => {
    if (years >= 10) return "9-10+";
    if (years >= 5) return "5-9";
    if (years >= 3) return "3-5";
    return "1-3";
  };

  const handleSaveProfile = async () => {
    try {
      let yearsNum = formData.yearsOfExperience;
      if (formData.yearsOfExperienceRange === "1-3") yearsNum = 2;
      else if (formData.yearsOfExperienceRange === "3-5") yearsNum = 4;
      else if (formData.yearsOfExperienceRange === "5-9") yearsNum = 7;
      else if (formData.yearsOfExperienceRange === "9-10+") yearsNum = 10;

      // Only send fields that exist in the backend schema
      await updateProfile.mutateAsync({
        phone: formData.phone,
        location: formData.location,
        linkedinUrl: formData.linkedinUrl,
        githubUrl: formData.githubUrl,
        twitterHandle: formData.twitterHandle,
        portfolioUrl: formData.portfolioUrl,
        bio: formData.bio,
        currentCompany: formData.currentCompany,
        currentTitle: formData.currentTitle,
        yearsOfExperience: yearsNum,
        workAuthorization: formData.workAuthorization,
        willingToRelocate: formData.willingToRelocate,
        university: formData.graduatedFromUniversity === 1 ? formData.university : "",
        sponsorshipRequired: formData.sponsorshipRequired,
        fintechExperience: formData.fintechExperience,
        fintechExperienceDescription: formData.fintechExperienceDescription,
        howDidYouHear: formData.whyApply,
        // New Ashby fields
        visaType: formData.visaType,
        pronouns: formData.pronouns,
        instagramHandle: formData.instagramHandle,
        roleType: formData.roleType || undefined,
        gtmTeamReason: formData.gtmTeamReason,
        gtmExperience: formData.gtmExperience,
        yearsOfSoftwareDev: formData.yearsOfSoftwareDev,
        techStackExperience: JSON.stringify(formData.techStackExperience),
        ableToWorkInOffice: formData.ableToWorkInOffice,
      });
      toast.success("Profile saved!");
      refetch();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save profile");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("pdf") && !file.type.includes("word")) {
      toast.error("Please upload a PDF or Word document");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    setParsing(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        try {
          const parsed = await parseResumeMutation.mutateAsync({
            resumeBase64: base64,
            fileName: file.name,
            mimeType: file.type,
          });

          if (parsed) {
            setFormData(prev => ({
              ...prev,
              phone: parsed.phone || prev.phone,
              location: parsed.location || prev.location,
              linkedinUrl: parsed.linkedin || prev.linkedinUrl,
              githubUrl: parsed.github || prev.githubUrl,
            }));
            
            // Refetch achievements if a STAR achievement was generated
            if (parsed.generatedAchievement) {
              refetchAchievements();
              toast.success("Resume parsed! STAR achievement generated. Review and save your profile.");
            } else {
              toast.success("Resume parsed! Review and save your profile.");
            }
          }

          await uploadResume.mutateAsync({
            fileData: base64,
            fileName: file.name,
            mimeType: file.type,
          });

          refetch();
        } catch (err) {
          console.error("Parse error:", err);
          toast.error("Failed to parse resume: " + (err as Error).message);
        } finally {
          setParsing(false);
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to upload resume");
      setUploading(false);
      setParsing(false);
    }
  };
  
  const handleAddAchievement = async () => {
    if (!achievementForm.title || !achievementForm.situation || !achievementForm.task || !achievementForm.action || !achievementForm.result) {
      toast.error("Please fill in all required STAR fields");
      return;
    }
    
    try {
      await addAchievement.mutateAsync(achievementForm);
      toast.success("Achievement added!");
      setShowAchievementDialog(false);
      setAchievementForm({ title: "", situation: "", task: "", action: "", result: "", metricValue: "", metricType: "", category: "" });
      refetchAchievements();
    } catch (error) {
      toast.error("Failed to add achievement");
    }
  };
  
  const handleDeleteAchievement = async (id: number) => {
    try {
      await deleteAchievement.mutateAsync({ id });
      toast.success("Achievement deleted");
      refetchAchievements();
    } catch (error) {
      toast.error("Failed to delete achievement");
    }
  };
  
  const handleAddSample = async () => {
    if (!sampleForm.content) {
      toast.error("Please add content for the writing sample");
      return;
    }
    
    try {
      await addSample.mutateAsync(sampleForm);
      toast.success("Writing sample added!");
      setShowSampleDialog(false);
      setSampleForm({ type: "linkedin_post", title: "", content: "", sourceUrl: "" });
      refetchSamples();
    } catch (error) {
      toast.error("Failed to add writing sample");
    }
  };
  
  const handleDeleteSample = async (id: number) => {
    try {
      await deleteSample.mutateAsync({ id });
      toast.success("Writing sample deleted");
      refetchSamples();
    } catch (error) {
      toast.error("Failed to delete writing sample");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const completion = calculateCompletion();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Sticky Profile Completion Bar */}
      <div className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-sm border-b border-purple-500/20 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Profile Completion</span>
            <span className="text-lg font-bold text-purple-400">{completion}%</span>
          </div>
          <Progress value={completion} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {completion < 100 ? "Add achievements & writing samples for better cover letters" : "Profile complete! Ready for personalized applications"}
          </p>
        </div>
      </div>

      <div className="px-4 space-y-6">

      {/* Resume Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resume
          </CardTitle>
          <CardDescription>
            Upload your resume to autofill application fields
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || parsing}
              variant="outline"
              className="border-pink-500 text-pink-500 hover:bg-pink-500/10"
            >
              {uploading || parsing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {parsing ? "Parsing..." : uploading ? "Uploading..." : "Upload File"}
            </Button>
            {profileData?.profile?.resumeUrl && (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <a
                  href={profileData.profile.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline"
                >
                  View Resume
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* STAR Achievements Section */}
      <Card className="border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                STAR Achievements
              </CardTitle>
              <CardDescription>
                Add quantified achievements for personalized cover letters (Situation, Task, Action, Result)
              </CardDescription>
            </div>
            <Dialog open={showAchievementDialog} onOpenChange={setShowAchievementDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-1" /> Add Achievement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add STAR Achievement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      placeholder="e.g., Led migration to microservices architecture"
                      value={achievementForm.title}
                      onChange={(e) => setAchievementForm({ ...achievementForm, title: e.target.value })}
                    />
                  </div>
                  
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-start gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        <strong>Tip:</strong> Include specific numbers and metrics. "Reduced load time by 40%" is better than "Improved performance".
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Situation * <span className="text-xs text-muted-foreground">(What was the context?)</span></Label>
                    <Textarea
                      placeholder="Describe the situation or challenge you faced..."
                      value={achievementForm.situation}
                      onChange={(e) => setAchievementForm({ ...achievementForm, situation: e.target.value })}
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Task * <span className="text-xs text-muted-foreground">(What was your responsibility?)</span></Label>
                    <Textarea
                      placeholder="What were you specifically responsible for?"
                      value={achievementForm.task}
                      onChange={(e) => setAchievementForm({ ...achievementForm, task: e.target.value })}
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Action * <span className="text-xs text-muted-foreground">(What did you do?)</span></Label>
                    <Textarea
                      placeholder="Describe the specific actions you took..."
                      value={achievementForm.action}
                      onChange={(e) => setAchievementForm({ ...achievementForm, action: e.target.value })}
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Result * <span className="text-xs text-muted-foreground">(What was the outcome? Include numbers!)</span></Label>
                    <Textarea
                      placeholder="e.g., Reduced infrastructure costs by 35%, saving $2M annually"
                      value={achievementForm.result}
                      onChange={(e) => setAchievementForm({ ...achievementForm, result: e.target.value })}
                      rows={2}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Metric Value</Label>
                      <Input
                        placeholder="e.g., 40%, $2M, 6 months"
                        value={achievementForm.metricValue}
                        onChange={(e) => setAchievementForm({ ...achievementForm, metricValue: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={achievementForm.category}
                        onValueChange={(v) => setAchievementForm({ ...achievementForm, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="leadership">Leadership</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="problem_solving">Problem Solving</SelectItem>
                          <SelectItem value="collaboration">Collaboration</SelectItem>
                          <SelectItem value="growth">Growth/Revenue</SelectItem>
                          <SelectItem value="efficiency">Efficiency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button onClick={handleAddAchievement} className="w-full bg-purple-600 hover:bg-purple-700" disabled={addAchievement.isPending}>
                    {addAchievement.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Achievement
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {achievements && achievements.length > 0 ? (
            <div className="space-y-3">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{achievement.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{achievement.result}</p>
                      {achievement.metricValue && (
                        <span className="inline-block mt-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                          {achievement.metricValue}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAchievement(achievement.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No achievements yet. Add your best accomplishments!</p>
              <p className="text-xs mt-1">These will be used to generate personalized cover letters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Writing Samples Section */}
      <Card className="border-blue-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PenLine className="h-5 w-5 text-blue-500" />
                Writing Samples
              </CardTitle>
              <CardDescription>
                Add samples of your writing to help AI match your voice and style
              </CardDescription>
            </div>
            <Dialog open={showSampleDialog} onOpenChange={setShowSampleDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-1" /> Add Sample
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Writing Sample</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type *</Label>
                      <Select
                        value={sampleForm.type}
                        onValueChange={(v: any) => setSampleForm({ ...sampleForm, type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="linkedin_post">LinkedIn Post</SelectItem>
                          <SelectItem value="blog_article">Blog Article</SelectItem>
                          <SelectItem value="cover_letter">Cover Letter</SelectItem>
                          <SelectItem value="email">Professional Email</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        placeholder="e.g., My thoughts on DeFi"
                        value={sampleForm.title}
                        onChange={(e) => setSampleForm({ ...sampleForm, title: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Content *</Label>
                    <Textarea
                      placeholder="Paste your writing sample here..."
                      value={sampleForm.content}
                      onChange={(e) => setSampleForm({ ...sampleForm, content: e.target.value })}
                      rows={8}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Source URL (optional)</Label>
                    <Input
                      placeholder="https://..."
                      value={sampleForm.sourceUrl}
                      onChange={(e) => setSampleForm({ ...sampleForm, sourceUrl: e.target.value })}
                    />
                  </div>
                  
                  <Button onClick={handleAddSample} className="w-full bg-blue-600 hover:bg-blue-700" disabled={addSample.isPending}>
                    {addSample.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Writing Sample
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {writingSamples && writingSamples.length > 0 ? (
            <div className="space-y-3">
              {writingSamples.map((sample) => (
                <div key={sample.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded capitalize">
                          {sample.type.replace("_", " ")}
                        </span>
                        {sample.title && <h4 className="font-medium text-white">{sample.title}</h4>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{sample.content}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSample(sample.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <PenLine className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No writing samples yet. Add examples of your professional writing!</p>
              <p className="text-xs mt-1">This helps AI generate cover letters that sound like you</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="1-415-555-1234..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="San Francisco, CA"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentCompany">Current Company *</Label>
              <Input
                id="currentCompany"
                value={formData.currentCompany}
                onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                placeholder="Type here..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentTitle">Current Title</Label>
              <Input
                id="currentTitle"
                value={formData.currentTitle}
                onChange={(e) => setFormData({ ...formData, currentTitle: e.target.value })}
                placeholder="Software Engineer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle>Social & Portfolio Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn *</Label>
              <Input
                id="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="githubUrl">GitHub</Label>
              <Input
                id="githubUrl"
                value={formData.githubUrl}
                onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                placeholder="https://github.com/..."
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="twitterHandle">Twitter</Label>
              <Input
                id="twitterHandle"
                value={formData.twitterHandle}
                onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value })}
                placeholder="@username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolioUrl">Website or Portfolio</Label>
              <Input
                id="portfolioUrl"
                value={formData.portfolioUrl}
                onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagramHandle">Instagram</Label>
            <Input
              id="instagramHandle"
              value={formData.instagramHandle}
              onChange={(e) => setFormData({ ...formData, instagramHandle: e.target.value })}
              placeholder="@username"
            />
          </div>
        </CardContent>
      </Card>

      {/* Work Authorization */}
      <Card>
        <CardHeader>
          <CardTitle>Work Authorization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Are you legally authorized to work in the United States for ANY employer without ANY restrictions? *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="workAuth"
                  checked={formData.workAuthorization === "yes"}
                  onChange={() => setFormData({ ...formData, workAuthorization: "yes" })}
                  className="w-4 h-4"
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="workAuth"
                  checked={formData.workAuthorization === "no"}
                  onChange={() => setFormData({ ...formData, workAuthorization: "no" })}
                  className="w-4 h-4"
                />
                <span>No</span>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Are you open to relocation? *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="relocate"
                  checked={formData.willingToRelocate === 1}
                  onChange={() => setFormData({ ...formData, willingToRelocate: 1 })}
                  className="w-4 h-4"
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="relocate"
                  checked={formData.willingToRelocate === 0}
                  onChange={() => setFormData({ ...formData, willingToRelocate: 0 })}
                  className="w-4 h-4"
                />
                <span>No</span>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Are you able to show up to place of employment (office) during business hours? *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="officeHours"
                  checked={formData.ableToWorkInOffice === 1}
                  onChange={() => setFormData({ ...formData, ableToWorkInOffice: 1 })}
                  className="w-4 h-4"
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="officeHours"
                  checked={formData.ableToWorkInOffice === 0}
                  onChange={() => setFormData({ ...formData, ableToWorkInOffice: 0 })}
                  className="w-4 h-4"
                />
                <span>No</span>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <Label>If you are on a visa, what type of visa are you currently on?</Label>
            <Select
              value={formData.visaType}
              onValueChange={(v) => setFormData({ ...formData, visaType: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select visa type (if applicable)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_applicable">Not applicable (US Citizen/Green Card)</SelectItem>
                <SelectItem value="h1b">H-1B</SelectItem>
                <SelectItem value="f1_opt">F-1 OPT</SelectItem>
                <SelectItem value="f1_cpt">F-1 CPT</SelectItem>
                <SelectItem value="l1">L-1</SelectItem>
                <SelectItem value="o1">O-1</SelectItem>
                <SelectItem value="tn">TN</SelectItem>
                <SelectItem value="e2">E-2</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Will you now or in the future require employer sponsorship for work authorization? *</Label>
            <div className="space-y-2">
              {[
                { value: 1, label: "Yes" },
                { value: 2, label: "Not right now, but in the future yes" },
                { value: 0, label: "No" },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sponsorship"
                    checked={formData.sponsorshipRequired === option.value}
                    onChange={() => setFormData({ ...formData, sponsorshipRequired: option.value })}
                    className="w-4 h-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Education & Experience */}
      <Card>
        <CardHeader>
          <CardTitle>Education & Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Did you graduate from a 4 year university? *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="graduated"
                  checked={formData.graduatedFromUniversity === 1}
                  onChange={() => setFormData({ ...formData, graduatedFromUniversity: 1 })}
                  className="w-4 h-4"
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="graduated"
                  checked={formData.graduatedFromUniversity === 0}
                  onChange={() => setFormData({ ...formData, graduatedFromUniversity: 0 })}
                  className="w-4 h-4"
                />
                <span>No</span>
              </label>
            </div>
          </div>

          {formData.graduatedFromUniversity === 1 && (
            <div className="space-y-2">
              <Label htmlFor="university">If you did graduate from a 4 year university, which one did you earn your degree? *</Label>
              <Input
                id="university"
                value={formData.university}
                onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                placeholder="Type here..."
              />
            </div>
          )}

          <div className="space-y-3">
            <Label>How many years of industry experience do you have? *</Label>
            <p className="text-xs text-muted-foreground">Exclude internships or personal projects. Include jobs you've held after graduating university.</p>
            <div className="space-y-2">
              {[
                { value: "1-3", label: "1-3 years" },
                { value: "3-5", label: "3-5 years" },
                { value: "5-9", label: "5-9 years" },
                { value: "9-10+", label: "9-10+ years" },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="experience"
                    checked={formData.yearsOfExperienceRange === option.value}
                    onChange={() => setFormData({ ...formData, yearsOfExperienceRange: option.value })}
                    className="w-4 h-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pronouns & Role Type */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>We strive to create an inclusive and respectful workplace. If you feel comfortable, please let us know your pronouns:</Label>
            <Select
              value={formData.pronouns}
              onValueChange={(v) => setFormData({ ...formData, pronouns: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pronouns (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="he_him">He/Him</SelectItem>
                <SelectItem value="she_her">She/Her</SelectItem>
                <SelectItem value="they_them">They/Them</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>What type of role are you primarily applying for?</Label>
            <Select
              value={formData.roleType}
              onValueChange={(v: "marketing" | "engineering" | "") => setFormData({ ...formData, roleType: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.roleType === "marketing" && (
            <>
              <div className="space-y-2">
                <Label>Why are you the right person to head up the GTM team?</Label>
                <Textarea
                  value={formData.gtmTeamReason}
                  onChange={(e) => setFormData({ ...formData, gtmTeamReason: e.target.value })}
                  placeholder="Describe your qualifications and vision..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>What experience do you have with GTM (please explain)?</Label>
                <Textarea
                  value={formData.gtmExperience}
                  onChange={(e) => setFormData({ ...formData, gtmExperience: e.target.value })}
                  placeholder="Describe your GTM experience..."
                  rows={4}
                />
              </div>
            </>
          )}

          {formData.roleType === "engineering" && (
            <>
              <div className="space-y-2">
                <Label>Years of professional software development experience</Label>
                <Input
                  type="number"
                  value={formData.yearsOfSoftwareDev || ""}
                  onChange={(e) => setFormData({ ...formData, yearsOfSoftwareDev: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 5"
                />
              </div>
              <div className="space-y-3">
                <Label>Years of experience with technologies (check all that apply):</Label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "python", label: "Python" },
                    { key: "java", label: "Java" },
                    { key: "go", label: "Go" },
                    { key: "javascript", label: "JavaScript" },
                    { key: "cpp", label: "C++" },
                    { key: "react", label: "React" },
                    { key: "node", label: "Node.js" },
                    { key: "django", label: "Django" },
                    { key: "spring", label: "Spring" },
                    { key: "sql", label: "SQL Databases" },
                    { key: "nosql", label: "NoSQL Databases" },
                    { key: "aws", label: "AWS" },
                    { key: "gcp", label: "GCP" },
                    { key: "azure", label: "Azure" },
                  ].map((tech) => (
                    <div key={tech.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!formData.techStackExperience[tech.key]}
                        onChange={(e) => {
                          const newStack = { ...formData.techStackExperience };
                          if (e.target.checked) {
                            newStack[tech.key] = 1;
                          } else {
                            delete newStack[tech.key];
                          }
                          setFormData({ ...formData, techStackExperience: newStack });
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{tech.label}</span>
                      {formData.techStackExperience[tech.key] !== undefined && (
                        <Input
                          type="number"
                          value={formData.techStackExperience[tech.key] || ""}
                          onChange={(e) => {
                            const newStack = { ...formData.techStackExperience };
                            newStack[tech.key] = parseInt(e.target.value) || 0;
                            setFormData({ ...formData, techStackExperience: newStack });
                          }}
                          placeholder="yrs"
                          className="w-16 h-7 text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Fintech Experience */}
      <Card>
        <CardHeader>
          <CardTitle>Industry Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Do you have experience within fintech, payments, crypto, stablecoins, or blockchain? *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fintech"
                  checked={formData.fintechExperience === 1}
                  onChange={() => setFormData({ ...formData, fintechExperience: 1 })}
                  className="w-4 h-4"
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fintech"
                  checked={formData.fintechExperience === 0}
                  onChange={() => setFormData({ ...formData, fintechExperience: 0 })}
                  className="w-4 h-4"
                />
                <span>No</span>
              </label>
            </div>
          </div>

          {formData.fintechExperience === 1 && (
            <div className="space-y-2">
              <Label htmlFor="fintechDesc">If so, please describe your experience</Label>
              <Textarea
                id="fintechDesc"
                value={formData.fintechExperienceDescription}
                onChange={(e) => setFormData({ ...formData, fintechExperienceDescription: e.target.value })}
                placeholder="Type here..."
                rows={4}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="whyApply">What made you apply to this role? *</Label>
            <Textarea
              id="whyApply"
              value={formData.whyApply}
              onChange={(e) => setFormData({ ...formData, whyApply: e.target.value })}
              placeholder="Type here..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4 pb-8">
        <Button
          onClick={handleSaveProfile}
          disabled={updateProfile.isPending}
          size="lg"
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {updateProfile.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Save Profile
        </Button>
      </div>
      </div>
    </div>
  );
}

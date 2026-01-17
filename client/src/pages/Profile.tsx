import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, Plus, X, Loader2, FileText, Download } from "lucide-react";
import { NextScrapeCountdown } from "@/components/NextScrapeCountdown";
import { type ParsedResume } from "@/lib/resume-parser";

export default function Profile() {
  const { data: profileData, isLoading, refetch } = trpc.profile.get.useQuery();
  const updateProfile = trpc.profile.update.useMutation();
  const uploadResume = trpc.profile.uploadResume.useMutation();
  const parseResumeMutation = trpc.profile.parseResume.useMutation();
  const addWorkExperience = trpc.workExperience.add.useMutation();
  const deleteWorkExperience = trpc.workExperience.delete.useMutation();
  const addSkill = trpc.skills.add.useMutation();
  const deleteSkill = trpc.skills.delete.useMutation();

  const [formData, setFormData] = useState({
    phone: "",
    location: "",
    linkedinUrl: "",
    githubUrl: "",
    telegramHandle: "",
    twitterHandle: "",
    portfolioUrl: "",
    bio: "",
    yearsOfExperience: 0,
    currentSalary: 0,
    expectedSalary: 0,
    // New ATS fields
    currentCompany: "",
    currentTitle: "",
    workAuthorization: "",
    howDidYouHear: "",
    availableStartDate: "",
    willingToRelocate: 0,
    // Ashby-specific fields
    university: "",
    sponsorshipRequired: 0,
    fintechExperience: 0,
    fintechExperienceDescription: "",
  });

  const [newSkill, setNewSkill] = useState("");
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update form data when profile loads
  useState(() => {
    if (profileData?.profile) {
      setFormData({
        phone: profileData.profile.phone || "",
        location: profileData.profile.location || "",
        linkedinUrl: profileData.profile.linkedinUrl || "",
        githubUrl: profileData.profile.githubUrl || "",
        telegramHandle: profileData.profile.telegramHandle || "",
        twitterHandle: profileData.profile.twitterHandle || "",
        portfolioUrl: profileData.profile.portfolioUrl || "",
        bio: profileData.profile.bio || "",
        yearsOfExperience: profileData.profile.yearsOfExperience || 0,
        currentSalary: profileData.profile.currentSalary || 0,
        expectedSalary: profileData.profile.expectedSalary || 0,
        // New ATS fields
        currentCompany: profileData.profile.currentCompany || "",
        currentTitle: profileData.profile.currentTitle || "",
        workAuthorization: profileData.profile.workAuthorization || "",
        howDidYouHear: profileData.profile.howDidYouHear || "",
        availableStartDate: profileData.profile.availableStartDate || "",
        willingToRelocate: profileData.profile.willingToRelocate || 0,
        // Ashby-specific fields
        university: profileData.profile.university || "",
        sponsorshipRequired: profileData.profile.sponsorshipRequired || 0,
        fintechExperience: profileData.profile.fintechExperience || 0,
        fintechExperienceDescription: profileData.profile.fintechExperienceDescription || "",
      });
    }
  });

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync(formData);
      toast.success("Profile updated successfully!");
      refetch();
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword"
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF or Word document (.pdf, .doc, .docx)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    setParsing(true);
    
    try {
      // 1. Parse resume via server
      toast.info("Parsing your resume...");
      const fileData = await file.arrayBuffer();
      const bytes = new Uint8Array(fileData);
      const binaryString = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
      const base64Data = btoa(binaryString);
      const parsed = await parseResumeMutation.mutateAsync({
        resumeBase64: `data:${file.type};base64,${base64Data}`,
      }) as ParsedResume;
      
      // 2. Upload resume file to S3
      await uploadResume.mutateAsync({
        fileName: file.name,
        fileData: base64Data,
        mimeType: file.type,
      });
      
      setParsing(false);
      
      // 3. Update profile with parsed data
      await updateProfile.mutateAsync({
        phone: parsed.phone || formData.phone,
        location: parsed.location || formData.location,
        bio: parsed.summary || formData.bio,
        githubUrl: parsed.links?.github || formData.githubUrl,
        linkedinUrl: parsed.links?.linkedin || formData.linkedinUrl,
        twitterHandle: parsed.links?.twitter || formData.twitterHandle,
      });
      
      // 4. Add skills as individual tags
      let skillsAdded = 0;
      if (parsed.skills && parsed.skills.length > 0) {
        for (const skill of parsed.skills) {
          try {
            await addSkill.mutateAsync({
              name: skill,
              category: 'technical',
            });
            skillsAdded++;
          } catch (err) {
            // Skip if skill already exists
            console.log(`Skill "${skill}" already exists`);
          }
        }
      }
      
      // 5. Add work experience entries
      let experiencesAdded = 0;
      if (parsed.experience && parsed.experience.length > 0) {
        for (const exp of parsed.experience) {
          try {
            const startDate = exp.startDate ? new Date(exp.startDate) : new Date();
            const endDate = exp.endDate && exp.endDate.toLowerCase() !== 'present' ? new Date(exp.endDate) : null;
            const isCurrent = !endDate || exp.endDate?.toLowerCase() === 'present' ? 1 : 0;
            
            await addWorkExperience.mutateAsync({
              company: exp.company,
              position: exp.title,
              description: exp.description || '',
              startDate,
              endDate: endDate || undefined,
              isCurrent,
            });
            experiencesAdded++;
          } catch (err) {
            console.log(`Failed to add experience at ${exp.company}:`, err);
          }
        }
      }

      toast.success(
        `Resume uploaded and parsed! Added ${skillsAdded} skills and ${experiencesAdded} work experiences.`,
        { duration: 5000 }
      );
      refetch();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("[Resume Upload] Error:", error);
      toast.error(`Failed to parse resume: ${error.message}`);
    } finally {
      setUploading(false);
      setParsing(false);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim()) return;

    try {
      await addSkill.mutateAsync({ name: newSkill.trim() });
      setNewSkill("");
      toast.success("Skill added!");
      refetch();
    } catch (error) {
      toast.error("Failed to add skill");
    }
  };

  const handleDeleteSkill = async (id: number) => {
    try {
      await deleteSkill.mutateAsync({ id });
      toast.success("Skill removed!");
      refetch();
    } catch (error) {
      toast.error("Failed to remove skill");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    if (!profileData?.profile) return { percentage: 0, missing: [] };
    
    // Essential fields based on actual AshbyHQ form requirements (Rain, etc.)
    const essentialFields = [
      { key: 'phone', label: 'Phone number', required: true },
      { key: 'resumeUrl', label: 'Resume', required: true },
      { key: 'location', label: 'Location', required: false },
      { key: 'linkedinUrl', label: 'LinkedIn URL', required: false },
      { key: 'githubUrl', label: 'GitHub URL', required: false },
      { key: 'portfolioUrl', label: 'Portfolio/Website', required: false },
      { key: 'currentCompany', label: 'Current Company', required: false },
      { key: 'currentTitle', label: 'Current Title', required: false },
      { key: 'yearsOfExperience', label: 'Years of Experience', required: false },
      { key: 'workAuthorization', label: 'Work Authorization', required: false },
    ];
    
    const profile = profileData.profile as any;
    const filledFields = essentialFields.filter(field => {
      const value = profile[field.key];
      return value !== null && value !== undefined && value !== '' && value !== 0;
    });
    
    const missing = essentialFields
      .filter(field => {
        const value = profile[field.key];
        return value === null || value === undefined || value === '' || value === 0;
      })
      .map(f => f.label);
    
    // Calculate weighted percentage - required fields count more
    const requiredFields = essentialFields.filter(f => f.required);
    const optionalFields = essentialFields.filter(f => !f.required);
    const filledRequired = filledFields.filter(f => requiredFields.some(r => r.key === f.key)).length;
    const filledOptional = filledFields.filter(f => optionalFields.some(o => o.key === f.key)).length;
    
    // Weight: Required = 60%, Optional = 40%
    const requiredScore = requiredFields.length > 0 ? (filledRequired / requiredFields.length) * 60 : 60;
    const optionalScore = optionalFields.length > 0 ? (filledOptional / optionalFields.length) * 40 : 0;
    
    return {
      percentage: Math.round(requiredScore + optionalScore),
      missing,
      filled: filledFields.length,
      total: essentialFields.length
    };
  };
  
  const completion = calculateCompletion();

  // Debug logging
  console.log('[Profile] Completion data:', completion);
  console.log('[Profile] Profile data:', profileData?.profile);

  return (
    <div className="space-y-6">
      {/* Profile Completion Progress Bar - Always show */}
      {profileData?.profile && (
        <>
          {completion.percentage < 100 ? (
            <Card className="border-purple-500/20 bg-purple-500/5">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">Profile Completion</h3>
                      <p className="text-sm text-muted-foreground">
                        Complete your profile to maximize application success rate
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-purple-500">{completion.percentage}%</div>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${completion.percentage}%` }}
                    />
                  </div>
                  
                  {completion.missing.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Missing fields:</span> {completion.missing.join(', ')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-green-500">Profile Complete!</h3>
                    <p className="text-sm text-muted-foreground">
                      Your profile is fully optimized for automated job applications
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
          <p className="text-muted-foreground">Manage your profile and application information</p>
          <NextScrapeCountdown />
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your contact and social information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="San Francisco, CA"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input
                    id="linkedinUrl"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="githubUrl">GitHub URL</Label>
                  <Input
                    id="githubUrl"
                    value={formData.githubUrl}
                    onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                    placeholder="https://github.com/username"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telegramHandle">Telegram Handle</Label>
                  <Input
                    id="telegramHandle"
                    value={formData.telegramHandle}
                    onChange={(e) => setFormData({ ...formData, telegramHandle: e.target.value })}
                    placeholder="@username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitterHandle">Twitter Handle</Label>
                  <Input
                    id="twitterHandle"
                    value={formData.twitterHandle}
                    onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value })}
                    placeholder="@username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="portfolioUrl">Portfolio URL</Label>
                <Input
                  id="portfolioUrl"
                  value={formData.portfolioUrl}
                  onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                  placeholder="https://yourportfolio.com"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    value={formData.yearsOfExperience}
                    onChange={(e) => setFormData({ ...formData, yearsOfExperience: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentSalary">Current Salary (USD)</Label>
                  <Input
                    id="currentSalary"
                    type="number"
                    value={formData.currentSalary}
                    onChange={(e) => setFormData({ ...formData, currentSalary: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedSalary">Expected Salary (USD)</Label>
                  <Input
                    id="expectedSalary"
                    type="number"
                    value={formData.expectedSalary}
                    onChange={(e) => setFormData({ ...formData, expectedSalary: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-6">
                <h3 className="text-lg font-semibold mb-4">Job Application Details</h3>
                <p className="text-sm text-muted-foreground mb-4">Complete these fields to automatically fill more application forms</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentCompany">Current Company</Label>
                    <Input
                      id="currentCompany"
                      value={formData.currentCompany}
                      onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                      placeholder="e.g., Coinbase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentTitle">Current Title</Label>
                    <Input
                      id="currentTitle"
                      value={formData.currentTitle}
                      onChange={(e) => setFormData({ ...formData, currentTitle: e.target.value })}
                      placeholder="e.g., Senior Software Engineer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="workAuthorization">Work Authorization</Label>
                    <Input
                      id="workAuthorization"
                      value={formData.workAuthorization}
                      onChange={(e) => setFormData({ ...formData, workAuthorization: e.target.value })}
                      placeholder="e.g., US Citizen, Green Card, H1B"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availableStartDate">Available Start Date</Label>
                    <Input
                      id="availableStartDate"
                      value={formData.availableStartDate}
                      onChange={(e) => setFormData({ ...formData, availableStartDate: e.target.value })}
                      placeholder="e.g., Immediately, 2 weeks, 1 month"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="howDidYouHear">How did you hear about us? (Default answer for applications)</Label>
                  <Input
                    id="howDidYouHear"
                    value={formData.howDidYouHear}
                    onChange={(e) => setFormData({ ...formData, howDidYouHear: e.target.value })}
                    placeholder="e.g., LinkedIn, Company website, Referral"
                  />
                </div>

                <div className="flex items-center space-x-2 mt-4">
                  <input
                    type="checkbox"
                    id="willingToRelocate"
                    checked={formData.willingToRelocate === 1}
                    onChange={(e) => setFormData({ ...formData, willingToRelocate: e.target.checked ? 1 : 0 })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="willingToRelocate" className="cursor-pointer">Willing to relocate</Label>
                </div>

                {/* Ashby-specific fields */}
                <div className="border-t pt-4 mt-6">
                  <h4 className="text-md font-semibold mb-3">Additional Information (Ashby Forms)</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="university">University</Label>
                    <Input
                      id="university"
                      value={formData.university}
                      onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                      placeholder="e.g., Stanford University"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label>Sponsorship Required?</Label>
                      <div className="flex items-center space-x-4 mt-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="sponsorshipRequired"
                            checked={formData.sponsorshipRequired === 0}
                            onChange={() => setFormData({ ...formData, sponsorshipRequired: 0 })}
                            className="rounded-full"
                          />
                          <span>No</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="sponsorshipRequired"
                            checked={formData.sponsorshipRequired === 1}
                            onChange={() => setFormData({ ...formData, sponsorshipRequired: 1 })}
                            className="rounded-full"
                          />
                          <span>Yes</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Fintech Experience?</Label>
                      <div className="flex items-center space-x-4 mt-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="fintechExperience"
                            checked={formData.fintechExperience === 0}
                            onChange={() => setFormData({ ...formData, fintechExperience: 0 })}
                            className="rounded-full"
                          />
                          <span>No</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="fintechExperience"
                            checked={formData.fintechExperience === 1}
                            onChange={() => setFormData({ ...formData, fintechExperience: 1 })}
                            className="rounded-full"
                          />
                          <span>Yes</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {formData.fintechExperience === 1 && (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="fintechExperienceDescription">Describe your fintech experience</Label>
                      <Textarea
                        id="fintechExperienceDescription"
                        value={formData.fintechExperienceDescription}
                        onChange={(e) => setFormData({ ...formData, fintechExperienceDescription: e.target.value })}
                        placeholder="Describe your experience in fintech..."
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={handleSaveProfile} disabled={updateProfile.isPending} className="w-full mt-6">
                {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resume">
          <Card>
            <CardHeader>
              <CardTitle>Resume / CV</CardTitle>
              <CardDescription>
                Upload your resume to auto-fill profile and applications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileData?.profile?.resumeUrl && (
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-purple-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium mb-1">Current Resume</p>
                        <p className="text-xs text-muted-foreground">
                          {profileData.profile.resumeFileKey?.split('/').pop() || 'resume.pdf'}
                        </p>
                      </div>
                    </div>
                    <a
                      href={profileData.profile.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </div>
                </div>
              )}

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                {parsing ? (
                  <div className="space-y-4">
                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-purple-500" />
                    <div>
                      <p className="text-sm font-medium mb-1">Parsing your resume...</p>
                      <p className="text-xs text-muted-foreground">
                        Extracting skills, experience, and contact info using your browser
                      </p>
                    </div>
                  </div>
                ) : uploading ? (
                  <div className="space-y-4">
                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-purple-500" />
                    <div>
                      <p className="text-sm font-medium mb-1">Uploading to S3...</p>
                      <p className="text-xs text-muted-foreground">Saving your resume file</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-2">
                      Upload a new resume
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      PDF, DOC, or DOCX • Max 10MB • Auto-parses skills & experience
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                      onChange={handleFileUpload}
                      disabled={uploading || parsing}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || parsing}
                      variant="outline"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>Add your technical and soft skills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="e.g., Solidity, React, Smart Contracts"
                  onKeyPress={(e) => e.key === "Enter" && handleAddSkill()}
                />
                <Button onClick={handleAddSkill} disabled={addSkill.isPending}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {profileData?.skills?.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full"
                  >
                    <span className="text-sm">{skill.name}</span>
                    <button
                      onClick={() => handleDeleteSkill(skill.id)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {profileData?.skills?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No skills added yet. Add your first skill above!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experience">
          <Card>
            <CardHeader>
              <CardTitle>Work Experience</CardTitle>
              <CardDescription>Add your work history</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                Work experience management coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

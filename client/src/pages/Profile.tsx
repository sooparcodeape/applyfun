import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Loader2, FileText, Download, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Profile() {
  const { data: profileData, isLoading, refetch } = trpc.profile.get.useQuery();
  const updateProfile = trpc.profile.update.useMutation();
  const uploadResume = trpc.profile.uploadResume.useMutation();
  const parseResumeMutation = trpc.profile.parseResume.useMutation();

  const [formData, setFormData] = useState({
    // Basic Info
    phone: "",
    location: "",
    linkedinUrl: "",
    githubUrl: "",
    twitterHandle: "",
    portfolioUrl: "",
    bio: "",
    
    // Work Info
    currentCompany: "",
    currentTitle: "",
    yearsOfExperience: 0,
    
    // AshbyHQ specific fields
    workAuthorization: "", // "yes" | "no"
    willingToRelocate: 0, // 0=no, 1=yes, 2=open to relocation, 3=open to discussing
    university: "",
    graduatedFromUniversity: 0, // 0=no, 1=yes
    sponsorshipRequired: 0, // 0=no, 1=yes, 2=not now but future
    fintechExperience: 0, // 0=no, 1=yes
    fintechExperienceDescription: "",
    whyApply: "", // "What made you apply to this role?"
    yearsOfExperienceRange: "", // "1-3" | "3-5" | "5-9" | "9-10+"
    // EEO fields
    gender: "",
    race: "",
    veteranStatus: "",
  });

  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate profile completion
  const calculateCompletion = () => {
    const fields = [
      formData.phone,
      formData.location,
      formData.linkedinUrl,
      formData.githubUrl,
      formData.currentCompany,
      formData.workAuthorization,
      formData.university,
      formData.yearsOfExperienceRange,
      profileData?.profile?.resumeUrl,
    ];
    const filled = fields.filter(f => f && f !== "").length;
    return Math.round((filled / fields.length) * 100);
  };

  // Update form data when profile loads
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
        gender: (profileData.profile as any).gender || "",
        race: (profileData.profile as any).race || "",
        veteranStatus: (profileData.profile as any).veteranStatus || "",
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
      // Convert experience range to number
      let yearsNum = formData.yearsOfExperience;
      if (formData.yearsOfExperienceRange === "1-3") yearsNum = 2;
      else if (formData.yearsOfExperienceRange === "3-5") yearsNum = 4;
      else if (formData.yearsOfExperienceRange === "5-9") yearsNum = 7;
      else if (formData.yearsOfExperienceRange === "9-10+") yearsNum = 10;

      await updateProfile.mutateAsync({
        ...formData,
        yearsOfExperience: yearsNum,
        howDidYouHear: formData.whyApply,
      });
      toast.success("Profile saved!");
      refetch();
    } catch (error) {
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
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        try {
          // Parse resume with LLM
          const parsed = await parseResumeMutation.mutateAsync({
            resumeBase64: base64,
            fileName: file.name,
            mimeType: file.type,
          });

          // Update form with parsed data
          if (parsed) {
            setFormData(prev => ({
              ...prev,
              phone: parsed.phone || prev.phone,
              location: parsed.location || prev.location,
              linkedinUrl: parsed.linkedin || prev.linkedinUrl,
              githubUrl: parsed.github || prev.githubUrl,
            }));
            toast.success("Resume parsed! Review and save your profile.");
          }

          // Upload to S3
          await uploadResume.mutateAsync({
            fileData: base64,
            fileName: file.name,
            mimeType: file.type,
          });

          refetch();
        } catch (err) {
          console.error("Parse error:", err);
          toast.error("Failed to parse resume");
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
            Complete your profile to auto-fill more application fields
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
            <Label>Are you able to work in a hybrid role and come into a NYC office 3 days a week? *</Label>
            <div className="space-y-2">
              {[
                { value: 1, label: "Yes" },
                { value: 0, label: "No" },
                { value: 2, label: "Open to relocation" },
                { value: 3, label: "Open to discussing" },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="relocate"
                    checked={formData.willingToRelocate === option.value}
                    onChange={() => setFormData({ ...formData, willingToRelocate: option.value })}
                    className="w-4 h-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
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

      {/* EEO Demographics */}
      <Card>
        <CardHeader>
          <CardTitle>Equal Employment Opportunity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Gender */}
          <div className="space-y-3">
            <Label>What is your gender?</Label>
            <div className="flex flex-wrap gap-4">
              {[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "non-binary", label: "Non-binary" },
                { value: "prefer-not-to-say", label: "Prefer not to say" },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    checked={formData.gender === option.value}
                    onChange={() => setFormData({ ...formData, gender: option.value })}
                    className="w-4 h-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Race/Ethnicity */}
          <div className="space-y-3">
            <Label>What is your race/ethnicity?</Label>
            <div className="flex flex-wrap gap-4">
              {[
                { value: "american-indian", label: "American Indian or Alaska Native" },
                { value: "asian", label: "Asian" },
                { value: "black", label: "Black or African American" },
                { value: "hispanic", label: "Hispanic or Latino" },
                { value: "native-hawaiian", label: "Native Hawaiian or Other Pacific Islander" },
                { value: "white", label: "White" },
                { value: "two-or-more", label: "Two or More Races" },
                { value: "prefer-not-to-say", label: "Prefer not to say" },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="race"
                    checked={formData.race === option.value}
                    onChange={() => setFormData({ ...formData, race: option.value })}
                    className="w-4 h-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Veteran Status */}
          <div className="space-y-3">
            <Label>Are you a protected veteran?</Label>
            <div className="flex flex-wrap gap-4">
              {[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
                { value: "prefer-not-to-say", label: "Prefer not to say" },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="veteranStatus"
                    checked={formData.veteranStatus === option.value}
                    onChange={() => setFormData({ ...formData, veteranStatus: option.value })}
                    className="w-4 h-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
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

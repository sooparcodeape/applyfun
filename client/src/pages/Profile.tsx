import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, Plus, X, Loader2 } from "lucide-react";

export default function Profile() {
  const { data: profileData, isLoading, refetch } = trpc.profile.get.useQuery();
  const updateProfile = trpc.profile.update.useMutation();
  const uploadResume = trpc.profile.uploadResume.useMutation();
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
  });

  const [newSkill, setNewSkill] = useState("");
  const [uploading, setUploading] = useState(false);

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

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result?.toString().split(",")[1];
        if (!base64) return;

        await uploadResume.mutateAsync({
          fileName: file.name,
          fileData: base64,
          mimeType: file.type,
        });

        toast.success("Resume uploaded successfully!");
        refetch();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to upload resume");
    } finally {
      setUploading(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your profile and application information</p>
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

              <Button onClick={handleSaveProfile} disabled={updateProfile.isPending} className="w-full">
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
              <CardDescription>Upload your resume for auto-filling applications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileData?.profile?.resumeUrl && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Current Resume:</p>
                  <a
                    href={profileData.profile.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-500 hover:underline"
                  >
                    View Resume
                  </a>
                </div>
              )}

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a new resume (PDF, DOC, DOCX - Max 5MB)
                </p>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="max-w-xs mx-auto"
                />
                {uploading && (
                  <div className="flex items-center justify-center mt-4">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                    <span className="ml-2 text-sm">Uploading...</span>
                  </div>
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { toast } from "react-toastify";

import Navbar from "@/components/navbar";
import Sidebar from "@/components/sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SystemInitializingOverlay from "@/components/loading";
import { notifyApplicationQueue } from "@/lib/resume/queue-client";

export default function JobsPage() {
  const panelClassName =
    "border border-white/8 bg-[#121821]/88 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-md";
  const fieldClassName =
    "border border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/35 focus-visible:ring-cyan-400/25";
  const labelClassName = "w-36 text-sm font-medium text-slate-300";
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [companyDuplicateAlerted, setCompanyDuplicateAlerted] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    jobLink: "",
    jobTitle: "",
    companyName: "",
    jobDescription: "",
    profileId: "",
  });

  // ------------------------
  // Lifecycle
  // ------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    getProfiles();
    getApplications();
  }, []);

  // ------------------------
  // API Calls
  // ------------------------
  const getProfiles = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/profile`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || data?.error || "Profiles could not be loaded.");
      setProfiles(Array.isArray(data) ? data : []);
    } catch (error) {
      setProfiles([]);
      setLoadError(error instanceof Error ? error.message : "Profiles could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddJob = async () => {
    try {
      const token = localStorage.getItem("token");
      if (
        !formData.jobLink.trim() ||
        !formData.jobTitle.trim() ||
        !formData.companyName.trim() ||
        !formData.jobDescription.trim() ||
        selectedProfile === null
      ) {
        toast.warn(
          "Please fill in all required fields (Job Link, Job Title, Company, Job Description, Profile)."
        );
        return;
      }

      setIsSaving(true);

      if (isDuplicateCompany) {
        toast.warn(
          "This company already exists for the selected profile. Please use a different company."
        );
        return;
      }

      const jobData = {
        jobLink: formData.jobLink,
        jobTitle: formData.jobTitle,
        companyName: formData.companyName,
        jobDescription: formData.jobDescription,
        profileId: selectedProfile._id,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(jobData),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        toast.success(data.message || "Application saved and queued.");
        setFormData({
          jobLink: "",
          jobTitle: "",
          companyName: "",
          jobDescription: "",
          profileId: "",
        });
        setSelectedProfile(null);
        setCompanyDuplicateAlerted(false);
        notifyApplicationQueue();
        void getApplications();
      } else {
        toast.error(data?.message || data?.error || "Application could not be saved.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error creating job. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getApplications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/applications`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || data?.error || "Applications could not be loaded.");
      setApplications(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      setApplications([]);
      setLoadError(error instanceof Error ? error.message : "Applications could not be loaded.");
    }
  };

  const normalizedCompany = formData.companyName.trim().toLowerCase();
  const isDuplicateCompany =
    !!selectedProfile &&
    !!normalizedCompany &&
    applications.some(
      (application) =>
        application.profile?._id === selectedProfile._id &&
        application.company?.trim().toLowerCase() === normalizedCompany
    );

  const handleCompanyBlur = () => {
    if (isDuplicateCompany && !companyDuplicateAlerted) {
      toast.warn("This company already exists for the selected profile.");
      setCompanyDuplicateAlerted(true);
    }
  };

  // ------------------------
  // Render
  // ------------------------
  return (
    <div className="dark relative h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900/95" />
      {isLoading && <SystemInitializingOverlay />}
      <div className="relative z-10 mx-auto flex h-full flex-col overflow-hidden p-4">
        <Navbar />
        <div className="flex flex-row gap-6 flex-grow">
          <Sidebar />
          <div className="flex h-[calc(100vh-8rem)] w-full">
            <Card className={`${panelClassName} w-full`}>
              <CardHeader className="border-b border-white/8 pb-3">
                <CardTitle className="text-slate-100 flex items-center">
                  <Users className="mr-2 h-5 w-5 text-cyan-400" />
                  Add Job
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {loadError && (
                  <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    <span>{loadError}</span>
                    <Button variant="outline" size="sm" onClick={() => { getProfiles(); getApplications(); }}>Retry</Button>
                  </div>
                )}
                {!isLoading && !loadError && profiles.length === 0 && (
                  <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.08] px-4 py-3 text-sm text-cyan-100">
                    No profiles yet. <Link href="/user/profile-create" className="font-semibold underline underline-offset-4">Create your first profile</Link> before adding a job.
                  </div>
                )}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-row items-center gap-4">
                    <Label htmlFor="jobLink" className={labelClassName}>
                      Job Link *
                    </Label>
                    <Input
                      id="jobLink"
                      className={fieldClassName}
                      placeholder="Enter job link"
                      value={formData.jobLink}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          jobLink: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-row items-center gap-4">
                    <Label htmlFor="jobTitle" className={labelClassName}>
                      Job Title *
                    </Label>
                    <Input
                      id="jobTitle"
                      className={fieldClassName}
                      placeholder="Enter job title"
                      value={formData.jobTitle}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          jobTitle: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-row items-center gap-4">
                    <Label htmlFor="companyName" className={labelClassName}>
                      Company *
                    </Label>
                    <Input
                      id="companyName"
                      className={fieldClassName}
                      placeholder="Enter Company Name"
                      value={formData.companyName}
                      onChange={(e) =>
                        {
                          setCompanyDuplicateAlerted(false);
                          setFormData((prev) => ({
                            ...prev,
                            companyName: e.target.value,
                          }));
                        }
                      }
                      onBlur={handleCompanyBlur}
                      aria-invalid={isDuplicateCompany}
                    />
                  </div>
                  {isDuplicateCompany && (
                    <p className="pl-40 text-sm text-red-400">
                      This company already exists for the selected profile.
                    </p>
                  )}

                  <div className="flex flex-row items-center gap-4">
                    <Label htmlFor="jobDescription" className={labelClassName}>
                      Job Description *
                    </Label>
                    <Textarea
                      id="jobDescription"
                      className={`${fieldClassName} h-[120px] resize-none`}
                      placeholder="Enter job description"
                      value={formData.jobDescription}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          jobDescription: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-row items-center gap-4">
                    <Label className={labelClassName}>Profile *</Label>
                    <Select
                      disabled={profiles.length === 0}
                      value={selectedProfile?._id || ""}
                      onValueChange={(value) => {
                        const profile = profiles.find(
                          (p: any) => p._id === value
                        );
                        setCompanyDuplicateAlerted(false);
                        setSelectedProfile(profile);
                      }}
                    >
                      <SelectTrigger
                        className={`w-full ${fieldClassName}`}
                        data-autofill="profile-trigger"
                      >
                        <SelectValue placeholder={profiles.length === 0 ? "Create a profile first" : "Select a profile"} />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-[#151c26] text-slate-100">
                        {profiles.length > 0 &&
                          profiles.map((profile: any) => (
                            <SelectItem
                              key={profile._id}
                              value={profile._id}
                              data-profile-name={profile.fullName}
                            >
                              {profile.fullName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleAddJob}
                      disabled={isSaving || isDuplicateCompany || profiles.length === 0 || Boolean(loadError)}
                      data-autofill="save-job"
                      className="w-full cursor-pointer border border-cyan-400/15 bg-cyan-500/[0.12] text-cyan-100 hover:bg-cyan-500/[0.18] hover:text-white sm:w-48"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

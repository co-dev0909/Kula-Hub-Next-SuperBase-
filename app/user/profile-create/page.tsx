"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, CornerDownLeft, Trash, Save } from "lucide-react";
import { toast } from "react-toastify";

import Navbar from "@/components/navbar";
import Sidebar from "@/components/sidebar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SystemInitializingOverlay from "@/components/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type WorkExperience = {
  jobTitle: string;
  workSetting: string;
  companyName: string;
  companyLocation: string;
  companyInformation: string;
  enterDate: string;
  endDate: string;
};

export default function Profiles() {
  const [isLoading, setIsLoading] = useState(true);
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([
    {
      jobTitle: "",
      workSetting: "",
      companyName: "",
      companyLocation: "",
      companyInformation: "",
      enterDate: "",
      endDate: "",
    },
  ])
  const [educations, setEducations] = useState<any[]>([
    { universityName: "", universityDegree: "", universityLocation: "", enterDate: "", endDate: "" },
  ])
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    educations: educations,
    experiences: workExperiences,
    template: "",
  });

  const router = useRouter();

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      experiences: workExperiences,
    }));
  }, [workExperiences]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      educations: educations,
    }));
  }, [educations]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleAddWorkExperience = () => {
    setWorkExperiences([
      ...workExperiences,
      {
        jobTitle: "",
        workSetting: "",
        companyName: "",
        companyLocation: "",
        companyInformation: "",
        enterDate: "",
        endDate: "",
      },
    ]);
  };

  const handleAddEducation = () => {
    setEducations([
      ...educations,
      { universityName: "", universityDegree: "", universityLocation: "", enterDate: "", endDate: "" },
    ])
  }

  const handleEducationChange = (index: number, field: string, value: string) => {
    const updatedEducations = [...educations];
    updatedEducations[index][field] = value;
    setEducations(updatedEducations);
  }

  const handleWorkExperienceChange = <K extends keyof WorkExperience>(
    index: number,
    field: K,
    value: WorkExperience[K]
  ) => {
    setWorkExperiences((prev) =>
      prev.map((exp, i) => (i === index ? { ...exp, [field]: value } : exp))
    );
  };

  const handleRemoveWorkExperience = (index: number) => {
    const updatedExperiences = workExperiences.filter((_, i) => i !== index);
    setWorkExperiences(updatedExperiences);
  };

  const handleRemoveEducation = (index: number) => {
    const updatedEducations = educations.filter((_, i) => i !== index);
    setEducations(updatedEducations);
  }

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(formData),
        }
      );

      if (res.ok) {
        toast.success("Profile created.");
        router.push("/user/profiles");
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.message || data?.error || "Profile could not be created.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile could not be created.");
    } finally {
      setIsLoading(false);
    }
    setIsLoading(false);
  };

  return (
    <div className="dark h-screen bg-gradient-to-br from-black to-slate-900 text-slate-100 relative overflow-hidden">
      {isLoading && <SystemInitializingOverlay />}
      <div className="flex flex-col h-full mx-auto p-4 relative z-10 overflow-hidden">
        <Navbar />
        <div className="flex flex-row gap-6 flex-grow">
          <Sidebar />
          <div className="w-full h-[calc(100vh-8rem)]">
            <div className="flex h-[calc(100vh-8rem)]">
              <Card className="w-full bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-auto">
                <CardHeader className="border-b border-slate-700/50 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-100 flex items-center">
                      <Users className="mr-2 h-5 w-5 text-cyan-500" />
                      Profile Create
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Link href="/user/profiles">
                        <Button
                          variant="secondary"
                          size="lg"
                          className="h-8 w-12 cursor-pointer"
                        >
                          <CornerDownLeft className="h-6 w-6" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="col-span-12 md:col-span-9 lg:col-span-10">
                    <div className="grid grid-cols-24 gap-6">
                      <div className="space-y-2 col-span-4 md:col-span-4 lg:col-span-4">
                        <Label htmlFor="fullName" className="text-slate-200">
                          Full Name *
                        </Label>
                        <Input
                          id="fullName"
                          className="bg-slate-800/50 border-slate-700 text-slate-100"
                          value={formData.fullName}
                          onChange={handleFormChange}
                          placeholder="Full Name"
                        />
                      </div>

                      <div className="space-y-2 col-span-5 md:col-span-5 lg:col-span-5">
                        <Label htmlFor="email" className="text-slate-200">
                          Email *
                        </Label>
                        <Input
                          id="email"
                          className="bg-slate-800/50 border-slate-700 text-slate-100"
                          value={formData.email}
                          onChange={handleFormChange}
                          placeholder="Email"
                        />
                      </div>
                      <div className="space-y-2 col-span-3 md:col-span-3 lg:col-span-3">
                        <Label htmlFor="phone" className="text-slate-200">
                          Phone *
                        </Label>
                        <Input
                          id="phone"
                          className="bg-slate-800/50 border-slate-700 text-slate-100"
                          value={formData.phone}
                          onChange={handleFormChange}
                          placeholder="(123) 456-7890"
                        />
                      </div>

                      <div className="space-y-2 col-span-4 md:col-span-4 lg:col-span-4">
                        <Label htmlFor="location" className="text-slate-200">
                          Location *
                        </Label>
                        <Input
                          id="location"
                          className="bg-slate-800/50 border-slate-700 text-slate-100"
                          value={formData.location}
                          onChange={handleFormChange}
                          placeholder="City, State, Zipcode"
                        />
                      </div>
                      <div className="space-y-2 col-span-8 md:col-span-8 lg:col-span-8">
                        <Label htmlFor="linkedin" className="text-slate-200">
                          LinkedIn *
                        </Label>
                        <Input
                          id="linkedin"
                          className="bg-slate-800/50 border-slate-700 text-slate-100"
                          value={formData.linkedin}
                          onChange={handleFormChange}
                          placeholder="LinkedIn"
                        />
                      </div>

                      <div className="space-y-4 col-span-24">
                        <div className="grid grid-cols-24 gap-6">
                          <div className="col-span-24">
                            <Label
                              htmlFor="education"
                              className="text-slate-200"
                            >
                              Education *
                            </Label>
                          </div>
                        </div>
                        {educations.map((education, index) => (
                          <div className="space-y-4 mb-8" key={index}>
                            <div className="space-y-2">
                              <Input
                                id="universityName"
                                className="bg-slate-800/50 border-slate-700 text-slate-100 w-full"
                                value={education.universityName}
                                onChange={(e) => handleEducationChange(index, "universityName", e.target.value)}
                                placeholder="University Name"
                              />
                            </div>

                            <div>
                              <Input
                                id="universityDegree"
                                className="bg-slate-800/50 border-slate-700 text-slate-100 w-full"
                                value={education.universityDegree}
                                onChange={(e) => handleEducationChange(index, "universityDegree", e.target.value)}
                                placeholder="University Degree"
                              />
                            </div>

                            <div>
                              <Input
                                id="universityLocation"
                                className="bg-slate-800/50 border-slate-700 text-slate-100 w-full"
                                value={education.universityLocation}
                                onChange={(e) => handleEducationChange(index, "universityLocation", e.target.value)}
                                placeholder="University Location"
                              />
                            </div>

                            <div className="grid grid-cols-12 gap-6">
                              <div className="col-span-12 md:col-span-5 lg:col-span-5">
                                <Input
                                  id="enterDate"
                                  className="bg-slate-800/50 border-slate-700 text-slate-100"
                                  value={education.enterDate}
                                  onChange={(e) => handleEducationChange(index, "enterDate", e.target.value)}
                                  placeholder="Start Date"
                                />
                              </div>
                              <div className="col-span-12 md:col-span-5 lg:col-span-5">
                                <Input
                                  id="endDate"
                                  className="bg-slate-800/50 border-slate-700 text-slate-100"
                                  value={education.endDate}
                                  onChange={(e) => handleEducationChange(index, "endDate", e.target.value)}
                                  placeholder="Grad Date"
                                />
                              </div>
                              <div className="col-span-12 md:col-span-2 lg:col-span-2 text-right">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveEducation(index)}
                                >
                                  <Trash />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button variant="outline" size="sm" onClick={handleAddEducation}>
                          Add Education
                        </Button>
                      </div>

                      {/* Dynamic Work Experience */}
                      <div className="space-y-4 col-span-24">
                        <div className="flex flex-row justify-between">
                          <Label
                            htmlFor="experience"
                            className="text-slate-200"
                          >
                            Work Experience *
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddWorkExperience}
                          >
                            + Add Work Experience
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {/* Map through workExperiences and render input fields */}
                          {workExperiences.map((experience, index) => (
                            <div className="space-y-4 mb-8" key={index}>
                              <div className="grid grid-cols-24 gap-4">
                                <Input
                                  value={experience.jobTitle}
                                  onChange={(e) =>
                                    handleWorkExperienceChange(
                                      index,
                                      "jobTitle",
                                      e.target.value
                                    )
                                  }
                                  className="bg-slate-800/50 border-slate-700 text-slate-100 col-span-5"
                                  placeholder="Job Title"
                                />
                                <Input
                                  value={experience.workSetting}
                                  onChange={(e) =>
                                    handleWorkExperienceChange(
                                      index,
                                      "workSetting",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Work Setting"
                                  className="bg-slate-800/50 border-slate-700 text-slate-100 col-span-3"
                                />
                                <Input
                                  value={experience.companyName}
                                  onChange={(e) =>
                                    handleWorkExperienceChange(
                                      index,
                                      "companyName",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Company Name"
                                  className="bg-slate-800/50 border-slate-700 text-slate-100 col-span-5"
                                />

                                <Input
                                  value={experience.companyLocation}
                                  onChange={(e) =>
                                    handleWorkExperienceChange(
                                      index,
                                      "companyLocation",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Company Location"
                                  className="bg-slate-800/50 border-slate-700 text-slate-100 col-span-4"
                                />
                                <Input
                                  value={experience.enterDate}
                                  onChange={(e) =>
                                    handleWorkExperienceChange(
                                      index,
                                      "enterDate",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Begin Date"
                                  className="bg-slate-800/50 border-slate-700 text-slate-100 col-span-3"
                                />
                                <Input
                                  value={experience.endDate}
                                  onChange={(e) =>
                                    handleWorkExperienceChange(
                                      index,
                                      "endDate",
                                      e.target.value
                                    )
                                  }
                                  placeholder="End Date"
                                  className="bg-slate-800/50 border-slate-700 text-slate-100 col-span-3"
                                />
                                <Textarea
                                  id="companyInformation"
                                  className="bg-slate-800/50 h-[120px] resize-none border-slate-700 text-slate-100 col-span-23"
                                  placeholder="Enter Company Information"
                                  value={experience.companyInformation}
                                  onChange={(e) =>
                                    handleWorkExperienceChange(
                                      index,
                                      "companyInformation",
                                      e.target.value
                                    )
                                  }
                                  required
                                />
                                <div className="flex items-end justify-start">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() =>
                                      handleRemoveWorkExperience(index)
                                    }
                                  >
                                    <Trash />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Button variant="outline" size="sm" onClick={handleAddWorkExperience}>
                          Add Work Experience
                        </Button>
                      </div>

                      <div className="space-y-4 col-span-12">
                        <Label htmlFor="resume" className="text-slate-200">
                          Profile
                        </Label>
                        <Select value={formData.template} onValueChange={(value: string) => setFormData(prev => ({ ...prev, template: value }))}>
                          <SelectTrigger className="w-full text-slate-200">
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem key="1" value="1">template1</SelectItem>
                            <SelectItem key="2" value="2">template2</SelectItem>
                            <SelectItem key="3" value="3">template3</SelectItem>
                            <SelectItem key="4" value="4">template4</SelectItem>
                            <SelectItem key="5" value="5">template5</SelectItem>
                            <SelectItem key="6" value="6">template6</SelectItem>
                            <SelectItem key="7" value="7">ethanchu</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/25"
          onClick={handleCreateProfile}
        >
          <Save className="h-6 w-6" />
        </Button>
      </div>
    </div >
  );
}

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { Edit, RefreshCw, Trash, Users, Plus } from "lucide-react";
import { toast } from "react-toastify";

import Navbar from "@/components/navbar";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CustomTable from "@/components/custom-table";
import SystemInitializingOverlay from "@/components/loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Profiles() {
  const panelClassName =
    "border border-white/8 bg-[#121821]/88 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-md";
  const fieldClassName =
    "border border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/35 focus-visible:ring-cyan-400/25";
  const modalClassName =
    "h-[90%] min-w-[70%] border border-white/10 bg-[#151c26] text-slate-100 shadow-[0_28px_90px_rgba(0,0,0,0.42)]";
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadError, setLoadError] = useState("");
  const columns = [
    {
      header: "NO",
      accessorKey: "no",
      cell: (_row: any, index: number) => index + 1,
    },
    { header: "Full Name", accessorKey: "fullName" },
    { header: "Email", accessorKey: "email" },
    {
      header: "Action",
      accessorKey: "action",
      cell: (row: any) => (
        <div>
          <Button
            variant="outline"
            size="sm"
            className="mr-2"
            onClick={() => handleEditClick(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeleteClick(row._id)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    getProfiles();
  }, []);

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

  const handleEditClick = (row: any) => {
    setSelectedRow(row);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false); // Close the dialog
    setSelectedRow(null); // Reset the selected row
    getProfiles();
  };

  const handleDeleteClick = async (profileId: string) => {
    if (!window.confirm("Are you sure you want to delete this profile?"))
      return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/profile/${profileId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (res.ok) {
        setProfiles((prev) =>
          prev.filter((profile: any) => profile._id !== profileId)
        );
        toast.success("Profile deleted.");
      } else {
        const err = await res.json();
        toast.error(err.message || "Profile could not be deleted.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile could not be deleted.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExperience = () => {
    const newExperience = {
      jobPosition: "",
      jobType: "",
      companyName: "",
      companyLocation: "",
      enterDate: "",
      endDate: "",
    };

    if (!selectedRow) return;

    setSelectedRow((prev: any) => ({
      ...prev,
      experiences: [...(prev?.experiences || []), newExperience],
    }));
  };

  const handleAddEducation = () => {
    const newEducation = {
      universityName: "",
      universityDegree: "",
      universityLocation: "",
      enterDate: "",
      endDate: ""
    };

    if (!selectedRow) return;

    setSelectedRow((prev: any) => ({
      ...prev,
      educations: [...(prev?.educations || []), newEducation]
    }))
  }

  const handleRemoveExperience = (indexToRemove: number) => {
    if (!selectedRow) return;

    const updatedExperiences = selectedRow.experiences.filter(
      (_: any, idx: number) => idx !== indexToRemove
    );

    setSelectedRow((prev: any) => ({
      ...prev,
      experiences: updatedExperiences,
    }));
  };

  const handleRemoveEducation = (indexToRemove: number) => {
    if (!selectedRow) return;

    const updatedEducations = selectedRow.educations.filter(
      (_: any, idx: number) => idx !== indexToRemove
    );

    setSelectedRow((prev: any) => ({
      ...prev,
      educations: updatedEducations,
    }));
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Get token from localStorage
    const token = localStorage.getItem("token");

    // Simulate API call
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/profile/${selectedRow._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(selectedRow),
        }
      );

      if (res.status === 200) {
        const updatedProfile = await res.json();
        setProfiles((prev: any) =>
          prev.map((profile: any) =>
            profile._id === updatedProfile._id ? updatedProfile : profile
          )
        );

        // Close dialog & clear selected row
        setOpenDialog(false);
        setSelectedRow(null);
        toast.success("Profile updated.");
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.message || "Profile could not be updated.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile could not be updated.");
    } finally {
      setIsLoading(false);
    }

    setIsLoading(false);
  };
  return (
    <div className="dark relative h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900/95" />
      {isLoading && <SystemInitializingOverlay />}
      <div className="relative z-10 mx-auto flex h-full flex-col overflow-hidden p-4">
        <Navbar />
        <div className="flex flex-row gap-6 flex-grow">
          <Sidebar />
          <div className="w-full h-[calc(100vh-8rem)]">
            <div className="flex h-[calc(100vh-8rem)]">
              <Card className={`${panelClassName} w-full overflow-hidden`}>
                <CardHeader className="border-b border-white/8 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-100 flex items-center">
                      <Users className="mr-2 h-5 w-5 text-cyan-400" />
                      Profiles
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:bg-white/[0.04] hover:text-cyan-300"
                        onClick={getProfiles}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {loadError && (
                    <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      <span>{loadError}</span>
                      <Button variant="outline" size="sm" onClick={getProfiles}>Retry</Button>
                    </div>
                  )}
                  <div>
                    <CustomTable
                      columns={columns}
                      data={profiles}
                      rowsPerPage={20}
                      emptyMessage="No profiles yet. Use the + button to create your first profile."
                    />
                    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                      <DialogContent className={`${modalClassName} grid-cols-1`}>
                        <DialogHeader>
                          <DialogTitle>Edit Profile</DialogTitle>
                          <DialogDescription>
                            Make changes to your profile here. Click save when you&apos;re done.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="overflow-y-auto">
                          <div className="grid grid-cols-24 gap-6">
                            {/* Full Name */}
                            <div className="space-y-2 col-span-4">
                              <Label
                                htmlFor="fullName"
                                className="text-slate-200"
                              >
                                Full Name *
                              </Label>
                              <Input
                                id="fullName"
                                className={fieldClassName}
                                value={selectedRow?.fullName || ""}
                                onChange={(e) =>
                                  setSelectedRow((prev: any) => ({
                                    ...prev,
                                    fullName: e.target.value,
                                  }))
                                }
                                placeholder="Full Name"
                              />
                            </div>

                            {/* Email */}
                            <div className="space-y-2 col-span-5">
                              <Label htmlFor="email" className="text-slate-200">
                                Email *
                              </Label>
                              <Input
                                id="email"
                                className={fieldClassName}
                                value={selectedRow?.email || ""}
                                onChange={(e) =>
                                  setSelectedRow((prev: any) => ({
                                    ...prev,
                                    email: e.target.value,
                                  }))
                                }
                                placeholder="Email"
                              />
                            </div>

                            {/* Phone */}
                            <div className="space-y-2 col-span-3">
                              <Label htmlFor="phone" className="text-slate-200">
                                Phone *
                              </Label>
                              <Input
                                id="phone"
                                className={fieldClassName}
                                value={selectedRow?.phone || ""}
                                onChange={(e) =>
                                  setSelectedRow((prev: any) => ({
                                    ...prev,
                                    phone: e.target.value,
                                  }))
                                }
                                placeholder="(123) 456-7890"
                              />
                            </div>

                            {/* Location */}
                            <div className="space-y-2 col-span-4">
                              <Label
                                htmlFor="location"
                                className="text-slate-200"
                              >
                                Location *
                              </Label>
                              <Input
                                id="location"
                                className={fieldClassName}
                                value={selectedRow?.location || ""}
                                onChange={(e) =>
                                  setSelectedRow((prev: any) => ({
                                    ...prev,
                                    location: e.target.value,
                                  }))
                                }
                                placeholder="City, State, Zipcode"
                              />
                            </div>

                            {/* LinkedIn */}
                            <div className="space-y-2 col-span-8">
                              <Label
                                htmlFor="linkedin"
                                className="text-slate-200"
                              >
                                LinkedIn *
                              </Label>
                              <Input
                                id="linkedin"
                                className={fieldClassName}
                                value={selectedRow?.linkedin || ""}
                                onChange={(e) =>
                                  setSelectedRow((prev: any) => ({
                                    ...prev,
                                    linkedin: e.target.value,
                                  }))
                                }
                                placeholder="LinkedIn URL"
                              />
                            </div>

                            {/* Template */}
                            <div className="space-y-4 col-span-12">
                              <Label htmlFor="resume" className="text-slate-200">
                                Profile
                              </Label>
                              <Select value={selectedRow?.template} onValueChange={(value: string) => setSelectedRow((prev:any) => ({ ...prev, template: value }))}>
                                <SelectTrigger className={`w-full ${fieldClassName}`}>
                                  <SelectValue placeholder="Select a template" />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-[#151c26] text-slate-100">
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

                            {/* Dynamic Education */}
                            <div className="space-y-4 col-span-24">
                              <div className="flex flex-row justify-between">
                                <Label htmlFor="experience">
                                  Education *
                                </Label>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={handleAddEducation}
                                >
                                  + Add Education
                                </Button>

                              </div>
                              {selectedRow && selectedRow.educations.map((education: any, index: any) => (
                                <div className="space-y-4 mb-8" key={index}>
                                  <Input
                                    id="universityName"
                                    className={`${fieldClassName} w-full`}
                                    value={education.universityName || ""}
                                    onChange={(e) => {
                                      const updated = [...selectedRow.educations];
                                      updated[index].universityName = e.target.value;
                                      setSelectedRow((prev: any) => ({
                                        ...prev,
                                        educations: updated,
                                      }));
                                    }}
                                    placeholder="University Name"
                                  />

                                  <Input
                                    id="universityDegree"
                                    className={`${fieldClassName} w-full`}
                                    value={education.universityDegree || ""}
                                    onChange={(e) => {
                                      const updated = [...selectedRow.educations];
                                      updated[index].universityDegree = e.target.value;
                                      setSelectedRow((prev: any) => ({
                                        ...prev,
                                        educations: updated,
                                      }));
                                    }}
                                    placeholder="Degree"
                                  />

                                  <Input
                                    id="universityLocation"
                                    className={`${fieldClassName} w-full`}
                                    value={education.universityLocation || ""}
                                    onChange={(e) => {
                                      const updated = [...selectedRow.educations];
                                      updated[index].universityLocation = e.target.value;
                                      setSelectedRow((prev: any) => ({
                                        ...prev,
                                        educations: updated,
                                      }));
                                    }}
                                    placeholder="University Location"
                                  />

                                  <div className="grid grid-cols-12 gap-6">
                                    <div className="col-span-12 md:col-span-5 lg:col-span-5">
                                      <Input
                                        id="enterDate"
                                        className={`${fieldClassName} w-full`}
                                        value={education.enterDate || ""}
                                        onChange={(e) => {
                                          const updated = [...selectedRow.educations];
                                          updated[index].enterDate = e.target.value;
                                          setSelectedRow((prev: any) => ({
                                            ...prev,
                                            educations: updated,
                                          }));
                                        }}
                                        placeholder="Start Date"
                                      />
                                    </div>
                                    <div className="col-span-12 md:col-span-5 lg:col-span-5">
                                      <Input
                                        id="endDate"
                                        className={`${fieldClassName} w-full`}
                                        value={education.endDate || ""}
                                        onChange={(e) => {
                                          const updated = [...selectedRow.educations];
                                          updated[index].endDate = e.target.value;
                                          setSelectedRow((prev: any) => ({
                                            ...prev,
                                            educations: updated,
                                          }));
                                        }}
                                        placeholder="Graduation Date"
                                      />
                                    </div>
                                    <div className="col-span-12 md:col-span-2 lg:col-span-2 text-right">
                                      <Button variant="destructive" size="sm" onClick={() => handleRemoveEducation(index)} >
                                        <Trash />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}                            </div>

                            {/* Work Experience */}
                            <div className="space-y-4 col-span-24">
                              <div className="flex flex-row justify-between">
                                <Label
                                  htmlFor="experience"
                                  className="text-slate-200"
                                >
                                  Work Experience *
                                </Label>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={handleAddExperience}
                                >
                                  + Add Work Experience
                                </Button>
                              </div>

                              <div className="space-y-2">
                                {selectedRow &&
                                  selectedRow.experiences.map(
                                    (experience: any, index: any) => (
                                      <div
                                        className="space-y-4 mb-8"
                                        key={index}
                                      >
                                        <div className="grid grid-cols-24 gap-4">
                                          <Input
                                            value={experience.jobTitle}
                                            onChange={(e) => {
                                              const updated = [
                                                ...selectedRow.experiences,
                                              ];
                                              updated[index].jobTitle =
                                                e.target.value;
                                              setSelectedRow((prev: any) => ({
                                                ...prev,
                                                experiences: updated,
                                              }));
                                            }}
                                            className={`${fieldClassName} col-span-5`}
                                            placeholder="Job Title"
                                          />
                                          <Input
                                            value={experience.workSetting}
                                            onChange={(e) => {
                                              const updated = [
                                                ...selectedRow.experiences,
                                              ];
                                              updated[index].workSetting =
                                                e.target.value;
                                              setSelectedRow((prev: any) => ({
                                                ...prev,
                                                experiences: updated,
                                              }));
                                            }}
                                            className={`${fieldClassName} col-span-3`}
                                            placeholder="Work Setting"
                                          />
                                          <Input
                                            value={experience.companyName}
                                            onChange={(e) => {
                                              const updated = [
                                                ...selectedRow.experiences,
                                              ];
                                              updated[index].companyName =
                                                e.target.value;
                                              setSelectedRow((prev: any) => ({
                                                ...prev,
                                                experiences: updated,
                                              }));
                                            }}
                                            className={`${fieldClassName} col-span-5`}
                                            placeholder="Company Name"
                                          />
                                          <Input
                                            value={experience.companyLocation}
                                            onChange={(e) => {
                                              const updated = [
                                                ...selectedRow.experiences,
                                              ];
                                              updated[index].companyLocation =
                                                e.target.value;
                                              setSelectedRow((prev: any) => ({
                                                ...prev,
                                                experiences: updated,
                                              }));
                                            }}
                                            className={`${fieldClassName} col-span-4`}
                                            placeholder="Company Location"
                                          />
                                          <Input
                                            value={experience.enterDate}
                                            onChange={(e) => {
                                              const updated = [
                                                ...selectedRow.experiences,
                                              ];
                                              updated[index].enterDate =
                                                e.target.value;
                                              setSelectedRow((prev: any) => ({
                                                ...prev,
                                                experiences: updated,
                                              }));
                                            }}
                                            className={`${fieldClassName} col-span-3`}
                                            placeholder="Begin Date"
                                          />
                                          <Input
                                            value={experience.endDate}
                                            onChange={(e) => {
                                              const updated = [
                                                ...selectedRow.experiences,
                                              ];
                                              updated[index].endDate =
                                                e.target.value;
                                              setSelectedRow((prev: any) => ({
                                                ...prev,
                                                experiences: updated,
                                              }));
                                            }}
                                            className={`${fieldClassName} col-span-3`}
                                            placeholder="End Date"
                                          />
                                          <Textarea
                                            value={
                                              experience.companyInformation
                                            }
                                            onChange={(e) => {
                                              const updated = [
                                                ...selectedRow.experiences,
                                              ];
                                              updated[
                                                index
                                              ].companyInformation =
                                                e.target.value;
                                              setSelectedRow((prev: any) => ({
                                                ...prev,
                                                experiences: updated,
                                              }));
                                            }}
                                            className={`${fieldClassName} col-span-23 h-[120px] resize-none`}
                                            placeholder="Company Information"
                                          />
                                          <div className="flex items-end justify-start">
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              onClick={() =>
                                                handleRemoveExperience(index)
                                              }
                                            >
                                              <Trash />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <DialogFooter className="flex justify-end items-end">
                          <Button type="button" variant="destructive" onClick={handleDialogClose}>
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="border border-cyan-400/15 bg-cyan-500/[0.12] text-cyan-100 hover:bg-cyan-500/[0.18] hover:text-white"
                            onClick={handleUpdateProfile}
                          >
                            Save
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-6 right-6 z-50">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/user/profile-create">
                <Button
                  size="lg"
                  className="h-14 w-14 rounded-full border border-cyan-300/15 bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-sky-400"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Add New Profile</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

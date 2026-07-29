"use client";

import { useEffect, useState } from "react";
import { Download, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/navbar";
import Sidebar from "@/components/sidebar";
import { RefreshCw } from "lucide-react";
import SystemInitializingOverlay from "@/components/loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CustomTable from "@/components/custom-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { notifyApplicationQueue } from "@/lib/resume/queue-client";

function getApplicationFilterDateKey(rawDate?: string | null) {
  if (!rawDate) {
    return "";
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatApplicationDate(rawDate?: string | null) {
  if (!rawDate) {
    return "N/A";
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date
    .toLocaleString("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(",", "");
}

function updateIsStale(updatedAt?: string | null) {
  const lastUpdate = Date.parse(updatedAt || "");
  return Number.isFinite(lastUpdate) && Date.now() - lastUpdate >= 6 * 60 * 1000;
}

function processingIsStale(row: { status?: string; updatedAt?: string | null }) {
  return row.status === "Generating" && updateIsStale(row.updatedAt);
}

export default function Applications() {
  const panelClassName =
    "border border-white/8 bg-[#121821]/88 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-md";
  const fieldClassName =
    "rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/25 focus:border-cyan-400/35";
  const modalClassName =
    "sm:max-w-md border border-white/10 bg-[#151c26] text-slate-100 shadow-[0_28px_90px_rgba(0,0,0,0.42)]";
  const modalPrimaryButtonClassName =
    "border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/[0.08] hover:text-white";
  const modalSecondaryButtonClassName =
    "bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]";
  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [loadError, setLoadError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [pendingApp, setPendingApp] = useState<{
    id: string;
    url: string;
  } | null>(null);
  const [restoreAppId, setRestoreAppId] = useState<string | undefined>();
  const [confirmDelOpen, setConfirmDelOpen] = useState(false);
  const [pendingDelApp, setPendingDelApp] = useState<string>('')
  const [driveUploadingIds, setDriveUploadingIds] = useState<Set<string>>(new Set());

  // ------------------------
  // State for Filters
  // ------------------------
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Filtered applications
  const filteredApplications = applications.filter((app) => {
    const matchCompany = filterCompany
      ? app.company?.toLowerCase().includes(filterCompany.toLowerCase())
      : true;
    const matchStatus = filterStatus ? app.status === filterStatus : true;
    const matchDate = filterDate
      ? getApplicationFilterDateKey(app.date_applied) === filterDate
      : true;

    return matchCompany && matchStatus && matchDate;
  });

  // ------------------------
  // Table Columns
  // ------------------------
  const columns = [
    {
      header: "NO",
      accessorKey: "no",
      cell: (_row: any, index: number) => (
        <div className="text-center">{index + 1}</div>
      ),
    },
    {
      header: "Job URL",
      accessorKey: "job_url",
      cell: (row: any) => (
        <div className="max-w-60 truncate text-center" title={row.job_url}>
          <a href={row.job_url} target="_blank" rel="noopener noreferrer">
            {row.job_url}
          </a>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row: any) => {
        let color = "bg-gray-500"; // fallback color

        switch (row.status) {
          case "Pending":
            color = "bg-yellow-500"; // yellow for pending
            break;
          case "Generating":
            color = "bg-orange-500";
            break;
          case "Generated":
            color = "bg-purple-500"; // purple for generated
            break;
          case "Downloaded":
            color = "bg-blue-500"; // blue for downloaded
            break;
          case "Applied":
            color = "bg-green-500"; // green for applied
            break;
          case "Failed":
            color = "bg-red-600";
            break;
          default:
            color = "bg-gray-500"; // unknown status
        }

        return (
          <div className="text-center">
            <Badge className={`${color} text-white`}>{row.status}</Badge>
          </div>
        );
      },
    },
    {
      header: "Resume",
      accessorKey: "resumeWordPath",
      cell: (row: any) => {
        if (!row.resumeWordPath)
          return (
            <div className="flex justify-center">
              <span className="text-gray-400">N/A</span>
            </div>
          );

        if (!["Generated", "Downloaded", "Applied"].includes(row.status) || row.driveUploadInProgress) {
          return <div className="text-center text-sm text-gray-400">Preparing...</div>;
        }

        return (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => handleDownload(row._id)}
              aria-label={`Download resume for ${row.profile?.fullName || "profile"}`}
              title="Download DOCX"
            >
              <Download className="cursor-pointer" />
            </button>
          </div>
        );
      },
    },
    {
      header: "Action",
      accessorKey: "action",
      cell: (row: any) => {
        return (
          <div
            className={`${
              row.status === "Generated" ? "justify-center" : "justify-end"
            } flex items-center h-full gap-2`}
          >
            {(() => {
              if (row.driveUploadInProgress) return null;
              switch (row.status) {
                case "Pending":
                  return null;
                case "Generating":
                  if (!processingIsStale(row)) return null;
                  return (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="cursor-pointer bg-red-700 text-white hover:bg-red-600"
                      onClick={() => row.resumeWordPath
                        ? handleDriveUpload(row._id)
                        : handleGenerate(row._id)}
                      title="Automatic processing was interrupted."
                    >
                      {row.resumeWordPath ? "Retry Drive" : "Retry Generate"}
                    </Button>
                  );
                case "Generated":
                  return (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-green-200 text-black cursor-pointer"
                      onClick={() =>
                        handleOnApply(row._id, row.job_url)
                      }
                    >
                      Apply
                    </Button>
                  );
                case "Downloaded":
                  return (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-green-200 text-black cursor-pointer"
                      onClick={() =>
                        handleOnApply(row._id, row.job_url)
                      }
                    >
                      Apply
                    </Button>
                  );

                case "Applied":
                  return (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => handleRestore(row._id)}
                    >
                      Restore
                    </Button>
                  );
                case "Failed":
                  return (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="cursor-pointer bg-red-700 text-white hover:bg-red-600"
                      onClick={() => handleGenerate(row._id)}
                      title={row.generationError || "Generation failed"}
                    >
                      Retry Generate
                    </Button>
                  );

                default:
                  return null;
              }
            })()}

            {row.status !== "Pending"
              && row.status !== "Generating"
              && !row.driveUploadInProgress
              && !driveUploadingIds.has(row._id)
              && (
              <Trash2
                onClick={() => handleOnDelete(row._id)}
                className="cursor-pointer text-gray-400 hover:text-blue-900 transition-colors duration-200 active:scale-95"
              />
              )}
          </div>
        )
      },
    },
    {
      header: "Date",
      accessorKey: "date_applied",
      cell: (row: any) => {
        const formatted = formatApplicationDate(row.date_applied);

        return (
          <div className="max-w-48 truncate" title={formatted}>
            {formatted}
          </div>
        );
      },
    },
    {
      header: "Company",
      accessorKey: "company",
      cell: (row: any) => (
        <div className="max-w-48 truncate" title={row.company}>
          {row.company}
        </div>
      ),
    },
    { header: "Job Title", accessorKey: "job_title" },
    {
      header: "Drive Word Link",
      accessorKey: "driveDocxLink",
      cell: (row: any) => {
        if (!row.driveDocxLink) {
          if (row.resumeWordPath && row.driveUploadInProgress) {
            if (updateIsStale(row.updatedAt)) {
              const isUploading = driveUploadingIds.has(row._id);
              return (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    onClick={() => handleDriveUpload(row._id)}
                    title="The previous Google Drive upload was interrupted."
                  >
                    {isUploading ? "Uploading..." : "Retry Drive"}
                  </Button>
                </div>
              );
            }
            return <div className="text-center text-sm text-gray-400">Uploading...</div>;
          }

          if (row.resumeWordPath && row.driveUploadError) {
            const isUploading = driveUploadingIds.has(row._id);
            return (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => handleDriveUpload(row._id)}
                  title={row.driveUploadError}
                >
                  {isUploading ? "Uploading..." : "Retry Drive"}
                </Button>
              </div>
            );
          }

          return (
            <div className="flex justify-center">
              <span className="text-gray-400">N/A</span>
            </div>
          );
        }
        return (
          <div className="max-w-60 truncate text-center" title="Open the editable Google Docs copy">
            <a href={row.driveDocxLink} target="_blank" rel="noopener noreferrer">
              Open Google Doc
            </a>
          </div>
        );
      },
    },
    {
      header: "Profile",
      accessorKey: "profile",
      cell: (row: any) => (
        <div className="text-center">{row.profile?.fullName}</div>
      ),
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: (row: any) => {
        const description = row.description;

        const handleCopy = () => {
          navigator.clipboard.writeText(description);
        };

        return (
          <div
            className="max-w-xs truncate cursor-pointer hover:underline"
            title={description}
            onClick={handleCopy}
          >
            {description}
          </div>
        );
      }
    },
  ];

  // ------------------------
  // Lifecycle
  // ------------------------
  useEffect(() => {
    getApplications(true);
    const interval = setInterval(() => {
      getApplications(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ------------------------
  // API Calls
  // ------------------------
  const getApplications = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
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
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Applications could not be loaded.");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handleRestore = async (appId: string) => {
    try {
      setRestoreAppId(appId);
      setConfirmRestoreOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore action failed.");
    }
  }

  const handleGenerate = async (appId: string) => {
    setApplications((current) => current.map((application) =>
      application._id === appId ? { ...application, status: "Pending", generationError: null } : application
    ));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/applications/${appId}/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to generate resume.");
      }

      toast.info(data.message || "Resume generation added to the queue.");
      notifyApplicationQueue();
    } catch (error: any) {
      toast.error(error.message || "Generate failed.");
    } finally {
      await getApplications(false);
    }
  };

  const handleDownload = async (appId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/applications/${appId}/download`,
        {
          method: "GET",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download generated resume.");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const contentDisposition = response.headers.get("Content-Disposition");
      const responseFilename = contentDisposition?.match(/filename="([^"]+)"/i)?.[1];
      link.href = blobUrl;
      link.download = responseFilename || "resume.docx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

      toast.success("Resume downloaded.");
      await getApplications();
    } catch (error: any) {
      toast.error(error.message || "Download failed.");
    }
  };

  const handleDriveUpload = async (appId: string) => {
    setDriveUploadingIds((current) => new Set(current).add(appId));
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/applications/${appId}/drive`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || data?.message || "Google Drive upload failed.");
      }

      toast.info(data.message || "Google Drive upload added to the queue.");
      notifyApplicationQueue();
      await getApplications(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google Drive upload failed.");
      await getApplications(false);
    } finally {
      setDriveUploadingIds((current) => {
        const next = new Set(current);
        next.delete(appId);
        return next;
      });
    }
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToJson = () => {
    try {
      const exportData = filteredApplications.map((app) => ({
        job_link: app.job_url || "",
        job_title: app.job_title || "",
        company: app.company || "",
        job_description: app.description || "",
      }));

      downloadFile(
        JSON.stringify(exportData, null, 2),
        `applications_${new Date().toISOString().slice(0, 10)}.json`,
        "application/json;charset=utf-8;"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export JSON.");
    }
  };

  const exportJobLinks = () => {
    try {
      const links = filteredApplications
        .map((app) => app.job_url?.trim())
        .filter(Boolean)
        .join("\n");

      downloadFile(
        links,
        `job_links_${new Date().toISOString().slice(0, 10)}.txt`,
        "text/plain;charset=utf-8;"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export job links.");
    }
  };

  const handleOnApply = async (appId: string, jobUrl: string) => {
    try {
      if (jobUrl) {
        window.open(jobUrl, "_blank", "noopener,noreferrer");
      }

      setPendingApp({ id: appId, url: jobUrl });
      setConfirmOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Apply action failed.");
    }
  };

  const handleOnDelete = (appId: string) => {
    setPendingDelApp(appId);
    setConfirmDelOpen(true);
  }

  const confirmDelete = async () => {
    if (pendingDelApp === '') return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/applications/${pendingDelApp}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (res.ok) {
        getApplications(); // refresh
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Application could not be deleted.");
    } finally {
      setConfirmDelOpen(false);
      setPendingDelApp('');
    }
  }


  const confirmApply = async () => {
    if (!pendingApp) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/applications/${pendingApp.id}/applied`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (res.ok) {
        getApplications(); // refresh
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to set applied status.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Set applied failed.");
    } finally {
      setConfirmOpen(false);
      setPendingApp(null);
    }
  };

  const confirmRestore = async () => {
    if (!restoreAppId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/applications/${restoreAppId}/restored`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (res.ok) {
        getApplications(); // refresh
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed.");
    } finally {
      setConfirmRestoreOpen(false);
      setRestoreAppId(undefined);
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
        <div className="w-full flex flex-row gap-6 flex-grow">
          <Sidebar />
          <div className="w-[80%] flex h-[calc(100vh-8rem)]">
            <Card className={`${panelClassName} w-full`}>
              <CardHeader className="border-b border-white/8 pb-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-slate-100">
                      <Users className="mr-2 h-5 w-5 text-cyan-400" />
                      Applications
                    </CardTitle>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:bg-white/[0.04] hover:text-cyan-300"
                        onClick={exportToJson}
                      >
                        Export Json
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:bg-white/[0.04] hover:text-cyan-300"
                        onClick={exportJobLinks}
                      >
                        Export Job Links
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:bg-white/[0.04] hover:text-cyan-300"
                        onClick={() => getApplications(true)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Filters Row */}
                  <div className="flex flex-wrap gap-3">
                    <input
                      type="text"
                      placeholder="Filter by company"
                      value={filterCompany}
                      onChange={(e) => setFilterCompany(e.target.value)}
                      className={`w-48 ${fieldClassName}`}
                    />

                    <Select
                      value={filterStatus || "all"}
                      onValueChange={(value) =>
                        setFilterStatus(value === "all" ? "" : value)
                      }
                    >
                      <SelectTrigger className={`w-40 ${fieldClassName}`}>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-[#151c26] text-slate-100">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Generating">Generating</SelectItem>
                        <SelectItem value="Generated">Generated</SelectItem>
                        <SelectItem value="Downloaded">Downloaded</SelectItem>
                        <SelectItem value="Applied">Applied</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>

                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className={fieldClassName}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-hidden">
                {loadError && (
                  <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    <span>{loadError}</span>
                    <Button variant="outline" size="sm" onClick={() => getApplications(true)}>Retry</Button>
                  </div>
                )}
                <CustomTable
                  columns={columns}
                  data={filteredApplications}
                  rowsPerPage={20}
                  emptyMessage={applications.length === 0 ? "No applications yet. Create a job to add your first application." : "No applications match the selected filters."}
                />
              </CardContent>
            </Card>
          </div>
        </div>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className={modalClassName}>
            <DialogHeader>
              <DialogTitle className="text-slate-100">Confirm Apply</DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-6 text-slate-400">
              Are you sure you want to mark this application as <b>Applied</b>?
            </p>
            <DialogFooter className="mt-4 flex justify-end gap-3">
              <Button
                autoFocus
                variant="outline"
                className={modalPrimaryButtonClassName}
                onClick={confirmApply}
              >
                Yes, Apply
              </Button>
              <Button
                variant="secondary"
                className={modalSecondaryButtonClassName}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={confirmRestoreOpen} onOpenChange={setConfirmRestoreOpen}>
          <DialogContent className={modalClassName}>
            <DialogHeader>
              <DialogTitle className="text-slate-100">Confirm Restore</DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-6 text-slate-400">
              Are you sure you want to mark this application as <b>Generated</b>?
            </p>
            <DialogFooter className="mt-4 flex justify-end gap-3">
              <Button
                autoFocus
                variant="outline"
                className={modalPrimaryButtonClassName}
                onClick={confirmRestore}
              >
                Yes, Restore
              </Button>
              <Button
                variant="secondary"
                className={modalSecondaryButtonClassName}
                onClick={() => setConfirmRestoreOpen(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={confirmDelOpen} onOpenChange={setConfirmDelOpen}>
          <DialogContent className={modalClassName}>
            <DialogHeader>
              <DialogTitle className="text-slate-100">Confirm Delete</DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-6 text-slate-400">
              Are you sure you want to <b>Delete</b> this application?
            </p>
            <DialogFooter className="mt-4 flex justify-end gap-3">
              <Button
                autoFocus
                variant="outline"
                className="border-red-400/15 bg-red-500/[0.08] text-red-100 hover:bg-red-500/[0.14] hover:text-white"
                onClick={confirmDelete}
              >
                Yes, Delete
              </Button>
              <Button
                variant="secondary"
                className={modalSecondaryButtonClassName}
                onClick={() => setConfirmDelOpen(false)}
              >
                Cancel
              </Button>              
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

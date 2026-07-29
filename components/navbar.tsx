"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Hexagon,
  LogOut,
  MonitorCog,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Terminal,
  User,
  UserCog,
} from "lucide-react";
import { toast } from "react-toastify";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DialogView =
  | "account"
  | "preferences"
  | "security"
  | "console"
  | "monitor"
  | null;

type MonitorRange = "daily" | "weekly" | "monthly";
type AiProvider = "deepseek" | "openai";

type Preferences = {
  compactMode: boolean;
  reduceMotion: boolean;
  desktopAlerts: boolean;
};

type UserProfile = {
  id?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
};

type MonitorSnapshot = {
  currentRoute: string;
  isOnline: boolean;
  viewport: string;
  tokenPresent: boolean;
  timestamp: string;
};

type ApplicationRecord = {
  _id: string;
  status?: string;
  created_at?: string;
  date_applied?: string | null;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type SecuritySettings = {
  provider: AiProvider;
  deepseekApiKey: string;
  openaiApiKey: string;
};

type SecurityDraft = {
  provider: AiProvider;
  deepseekApiKey: string;
  openaiApiKey: string;
};

type GraphPoint = {
  label: string;
  count: number;
};

const DIALOG_CLASS_NAME =
  "border border-white/10 bg-[#151c26] text-slate-100 shadow-[0_28px_90px_rgba(0,0,0,0.42)]";

const FIELD_CLASS_NAME =
  "border border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/35 focus-visible:ring-cyan-400/25";

const DEFAULT_PREFERENCES: Preferences = {
  compactMode: false,
  reduceMotion: false,
  desktopAlerts: false,
};

const EMPTY_PASSWORD_FORM: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  provider: "deepseek",
  deepseekApiKey: "",
  openaiApiKey: "",
};

const EMPTY_SECURITY_DRAFT: SecurityDraft = {
  provider: "deepseek",
  deepseekApiKey: "",
  openaiApiKey: "",
};

function decodeTokenPayload(token: string | null) {
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    return JSON.parse(json);
  } catch (_error) {
    return null;
  }
}

function buildProfileFromSource(source: any): UserProfile {
  const firstName = source?.firstName?.trim?.() || "";
  const lastName = source?.lastName?.trim?.() || "";
  const derivedFullName =
    source?.fullName?.trim?.() || [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    id: source?.id,
    firstName,
    lastName,
    fullName: derivedFullName || "Commander",
    email: source?.email || "admin@nexusos.com",
  };
}

function parseStoredUser(rawUser: string | null): UserProfile | null {
  if (!rawUser) {
    return null;
  }

  try {
    return buildProfileFromSource(JSON.parse(rawUser));
  } catch (_error) {
    return null;
  }
}

function getApplicationDate(application: ApplicationRecord) {
  const rawDate = application.created_at || application.date_applied;
  if (!rawDate) {
    return null;
  }

  const date = new Date(rawDate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function maskApiKey(value: string) {
  if (!value) {
    return "Not configured";
  }

  if (value.length <= 8) {
    return "Configured";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function buildGraphSeries(
  applications: ApplicationRecord[],
  range: MonitorRange
): GraphPoint[] {
  const now = new Date();
  const dates = applications
    .map((application) => getApplicationDate(application))
    .filter((date): date is Date => Boolean(date));

  if (range === "daily") {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(now);
      day.setHours(0, 0, 0, 0);
      day.setDate(now.getDate() - (6 - index));
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      return {
        label: day.toLocaleDateString("en-US", { weekday: "short" }),
        count: dates.filter((date) => date >= day && date < nextDay).length,
      };
    });
  }

  if (range === "weekly") {
    const thisWeek = startOfWeek(now);
    return Array.from({ length: 8 }, (_, index) => {
      const weekStart = new Date(thisWeek);
      weekStart.setDate(thisWeek.getDate() - 7 * (7 - index));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      return {
        label: `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        count: dates.filter((date) => date >= weekStart && date < weekEnd).length,
      };
    });
  }

  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const nextMonthDate = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      1
    );

    return {
      label: monthDate.toLocaleDateString("en-US", { month: "short" }),
      count: dates.filter((date) => date >= monthDate && date < nextMonthDate).length,
    };
  });
}

function ApplicationsBarChart({
  data,
  title,
}: {
  data: GraphPoint[];
  title: string;
}) {
  const maxCount = Math.max(...data.map((point) => point.count), 1);

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-100">{title}</p>
          <p className="text-xs text-slate-400">Applications created in the selected period.</p>
        </div>
        <Badge className="bg-cyan-500/15 text-cyan-300">
          {data.reduce((sum, point) => sum + point.count, 0)} total
        </Badge>
      </div>

      <div className="flex h-52 items-end gap-3">
        {data.map((point) => {
          const barHeight = Math.max((point.count / maxCount) * 100, point.count > 0 ? 8 : 2);
          return (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs text-slate-400">{point.count}</span>
              <div className="flex h-40 w-full items-end rounded-md bg-slate-900/60 p-1">
                <div
                  className="w-full rounded-md bg-gradient-to-t from-cyan-500 via-sky-400 to-cyan-200 transition-all duration-300"
                  style={{ height: `${barHeight}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-500">{point.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeDialog, setActiveDialog] = useState<DialogView>(null);
  const [chartRange, setChartRange] = useState<MonitorRange>("daily");
  const [token, setToken] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    fullName: "Commander",
    email: "admin@nexusos.com",
  });
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM);
  const [securitySettings, setSecuritySettings] =
    useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [securityDraft, setSecurityDraft] = useState<SecurityDraft>(EMPTY_SECURITY_DRAFT);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [monitor, setMonitor] = useState<MonitorSnapshot>({
    currentRoute: pathname,
    isOnline: true,
    viewport: "0 x 0",
    tokenPresent: false,
    timestamp: new Date().toLocaleTimeString(),
  });

  useEffect(() => {
    const storedToken = localStorage.getItem("token") || "";
    const storedUser = parseStoredUser(localStorage.getItem("bd_user"));
    const tokenPayload = decodeTokenPayload(storedToken);
    const initialProfile = storedUser || buildProfileFromSource(tokenPayload);

    setToken(storedToken);
    setUserProfile(initialProfile);

    const rawPreferences = localStorage.getItem("bd_preferences");
    if (rawPreferences) {
      try {
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...JSON.parse(rawPreferences),
        });
      } catch (_error) {
        setPreferences(DEFAULT_PREFERENCES);
      }
    }

    const rawSecuritySettings = localStorage.getItem("bd_security_settings");
    if (rawSecuritySettings) {
      try {
        setSecuritySettings({
          ...DEFAULT_SECURITY_SETTINGS,
          ...JSON.parse(rawSecuritySettings),
        });
      } catch (_error) {
        setSecuritySettings(DEFAULT_SECURITY_SETTINGS);
      }
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    const syncUserInfo = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/auth/me`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const nextProfile = buildProfileFromSource(data.user);
        setUserProfile(nextProfile);
        localStorage.setItem("bd_user", JSON.stringify(data.user));
      } catch (_error) {
      }
    };

    syncUserInfo();
  }, [token]);

  useEffect(() => {
    const updateMonitor = () => {
      setMonitor({
        currentRoute: pathname,
        isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
        viewport:
          typeof window !== "undefined"
            ? `${window.innerWidth} x ${window.innerHeight}`
            : "0 x 0",
        tokenPresent: Boolean(localStorage.getItem("token")),
        timestamp: new Date().toLocaleTimeString(),
      });
    };

    updateMonitor();
    if (activeDialog !== "monitor") {
      return;
    }

    const interval = window.setInterval(updateMonitor, 1000);
    window.addEventListener("resize", updateMonitor);
    window.addEventListener("online", updateMonitor);
    window.addEventListener("offline", updateMonitor);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", updateMonitor);
      window.removeEventListener("online", updateMonitor);
      window.removeEventListener("offline", updateMonitor);
    };
  }, [activeDialog, pathname]);

  useEffect(() => {
    if (activeDialog === "account") {
      setPasswordForm(EMPTY_PASSWORD_FORM);
    }
  }, [activeDialog]);

  useEffect(() => {
    if (activeDialog === "security") {
      setSecurityDraft({
        provider: securitySettings.provider,
        deepseekApiKey: "",
        openaiApiKey: "",
      });
    }
  }, [activeDialog, securitySettings.provider]);

  useEffect(() => {
    if (activeDialog !== "monitor" || !token) {
      return;
    }

    const loadApplications = async () => {
      setIsLoadingApplications(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/applications`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setApplications(data.data || []);
        }
      } catch (_error) {
        toast.error("Unable to load application metrics.");
      } finally {
        setIsLoadingApplications(false);
      }
    };

    loadApplications();
  }, [activeDialog, token]);

  const initials = useMemo(() => {
    return userProfile.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CM";
  }, [userProfile.fullName]);

  const passwordMismatch =
    Boolean(passwordForm.confirmPassword) &&
    passwordForm.newPassword !== passwordForm.confirmPassword;

  const passwordTooShort =
    Boolean(passwordForm.newPassword) && passwordForm.newPassword.length < 8;

  const chartData = useMemo(
    () => ({
      daily: buildGraphSeries(applications, "daily"),
      weekly: buildGraphSeries(applications, "weekly"),
      monthly: buildGraphSeries(applications, "monthly"),
    }),
    [applications]
  );

  const appliedCount = useMemo(
    () => applications.filter((application) => application.status === "Applied").length,
    [applications]
  );

  const generatedCount = useMemo(
    () =>
      applications.filter((application) =>
        ["Generated", "Downloaded"].includes(application.status || "")
      ).length,
    [applications]
  );

  const handleSignOut = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/auth/logout`, { method: "POST" });
    localStorage.removeItem("token");
    localStorage.removeItem("bd_user");
    setToken("");
    router.push("/auth/login");
  };

  const handleNavigate = (href: string) => {
    setActiveDialog(null);
    router.push(href);
  };

  const openDialog = (view: Exclude<DialogView, null>) => {
    setActiveDialog(view);
  };

  const handleSavePreferences = async () => {
    localStorage.setItem("bd_preferences", JSON.stringify(preferences));

    if (
      preferences.desktopAlerts &&
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      await Notification.requestPermission();
    }

    setActiveDialog(null);
    toast.success("Preferences saved on this device.");
  };

  const handleChangePassword = async () => {
    if (!token) {
      toast.error("You must be signed in to change your password.");
      return;
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.warn("Please complete all password fields.");
      return;
    }

    if (passwordMismatch) {
      toast.warn("New password and confirmation do not match.");
      return;
    }

    if (passwordTooShort) {
      toast.warn("New password must be at least 8 characters.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "/api"}/auth/change-password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(passwordForm),
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to change password.");
      }

      setPasswordForm(EMPTY_PASSWORD_FORM);
      toast.success("Password updated successfully.");
    } catch (error: any) {
      toast.error(error.message || "Password change failed.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveSecuritySettings = () => {
    const activeKey =
      securityDraft.provider === "deepseek"
        ? securityDraft.deepseekApiKey.trim() || securitySettings.deepseekApiKey.trim()
        : securityDraft.openaiApiKey.trim() || securitySettings.openaiApiKey.trim();

    if (!activeKey) {
      toast.warn(
        securityDraft.provider === "deepseek"
          ? "Please enter a DeepSeek API key."
          : "Please enter an OpenAI API key."
      );
      return;
    }

    const nextSettings = {
      provider: securityDraft.provider,
      deepseekApiKey:
        securityDraft.deepseekApiKey.trim() || securitySettings.deepseekApiKey.trim(),
      openaiApiKey:
        securityDraft.openaiApiKey.trim() || securitySettings.openaiApiKey.trim(),
    };

    setSecuritySettings(nextSettings);
    localStorage.setItem("bd_security_settings", JSON.stringify(nextSettings));
    setActiveDialog(null);
    toast.success(
      `Security Center updated. ${nextSettings.provider === "deepseek" ? "DeepSeek" : "OpenAI"} is now active.`
    );
  };

  return (
    <>
      <header className="mb-6 flex items-center justify-between border-b border-slate-700/50 py-4">
        <div className="flex items-center space-x-2">
          <Hexagon className="h-8 w-8 text-cyan-500" />
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-xl font-bold text-transparent">
            KULA Hub
          </span>
        </div>

        <div className="flex items-center space-x-6">
          <div className="hidden items-center space-x-1 rounded-full border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 backdrop-blur-sm md:flex">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search systems..."
              className="w-40 border-none bg-transparent text-sm placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-slate-400 hover:text-slate-100"
                  >
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full bg-cyan-500"></span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notifications</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarImage src="/placeholder.svg?height=40&width=40" alt="User" />
                    <AvatarFallback className="bg-slate-700 text-cyan-500">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-64 border-slate-700/50 bg-slate-900/95 backdrop-blur-sm"
                align="end"
                forceMount
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-slate-100">
                      {userProfile.fullName}
                    </p>
                    <p className="text-xs leading-none text-slate-400">
                      {userProfile.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700/50" />
                <DropdownMenuItem
                  className="text-slate-300 focus:bg-slate-800/50 focus:text-slate-100"
                  onClick={() => handleNavigate("/user/profiles")}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-slate-300 focus:bg-slate-800/50 focus:text-slate-100"
                  onClick={() => openDialog("account")}
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-slate-300 focus:bg-slate-800/50 focus:text-slate-100"
                  onClick={() => openDialog("preferences")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>System Preferences</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-slate-300 focus:bg-slate-800/50 focus:text-slate-100"
                  onClick={() => openDialog("security")}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Security Center</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700/50" />
                <DropdownMenuItem
                  className="text-slate-300 focus:bg-slate-800/50 focus:text-slate-100"
                  onClick={() => openDialog("console")}
                >
                  <Terminal className="mr-2 h-4 w-4" />
                  <span>Command Console</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-slate-300 focus:bg-slate-800/50 focus:text-slate-100"
                  onClick={() => openDialog("monitor")}
                >
                  <Activity className="mr-2 h-4 w-4" />
                  <span>System Monitor</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700/50" />
                <DropdownMenuItem
                  className="text-red-400 focus:bg-red-500/10 focus:text-red-300"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <Dialog
        open={activeDialog === "account"}
        onOpenChange={(open) => setActiveDialog(open ? "account" : null)}
      >
        <DialogContent className={`${DIALOG_CLASS_NAME} sm:max-w-2xl`}>
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
            <DialogDescription className="text-slate-400">
              Review your account details and update your password securely.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4 rounded-xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-slate-100">User Information</p>

              <div className="space-y-2">
                <Label className="text-slate-300">Full Name</Label>
                <Input className={FIELD_CLASS_NAME} value={userProfile.fullName} readOnly />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <Input className={FIELD_CLASS_NAME} value={userProfile.email} readOnly />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/[0.08]"
                  onClick={() => handleNavigate("/user/profiles")}
                >
                  Open Profiles
                </Button>
                <Button
                  variant="outline"
                  className="border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/[0.08]"
                  onClick={() => handleNavigate("/user/profile-create")}
                >
                  Create Profile
                </Button>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-slate-100">Change Password</p>

              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-slate-300">
                  Current Password
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  className={FIELD_CLASS_NAME}
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-slate-300">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  className={FIELD_CLASS_NAME}
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-slate-500">Use at least 8 characters.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  className={FIELD_CLASS_NAME}
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                />
              </div>

              {passwordMismatch && (
                <p className="text-sm text-red-400">
                  New password and confirmation do not match.
                </p>
              )}
              {!passwordMismatch && passwordTooShort && (
                <p className="text-sm text-amber-400">
                  New password must be at least 8 characters long.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              className="bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]"
              onClick={() => setActiveDialog(null)}
            >
              Close
            </Button>
            <Button
              className="border border-cyan-400/15 bg-cyan-500/[0.12] text-cyan-100 hover:bg-cyan-500/[0.18] hover:text-white"
              onClick={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "preferences"}
        onOpenChange={(open) => setActiveDialog(open ? "preferences" : null)}
      >
        <DialogContent className={`${DIALOG_CLASS_NAME} sm:max-w-lg`}>
          <DialogHeader>
            <DialogTitle>System Preferences</DialogTitle>
            <DialogDescription className="text-slate-400">
              Save local UI preferences for this browser session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] p-3">
              <div>
                <p className="text-sm font-medium text-slate-100">Compact Mode</p>
                <p className="text-xs text-slate-400">
                  Prefer denser content spacing in future UI updates.
                </p>
              </div>
              <Switch
                checked={preferences.compactMode}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, compactMode: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] p-3">
              <div>
                <p className="text-sm font-medium text-slate-100">Reduce Motion</p>
                <p className="text-xs text-slate-400">
                  Keep motion-heavy UI effects toned down when possible.
                </p>
              </div>
              <Switch
                checked={preferences.reduceMotion}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, reduceMotion: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] p-3">
              <div>
                <p className="text-sm font-medium text-slate-100">Desktop Alerts</p>
                <p className="text-xs text-slate-400">
                  Allow browser notifications when supported.
                </p>
              </div>
              <Switch
                checked={preferences.desktopAlerts}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    desktopAlerts: checked,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              className="bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]"
              onClick={() => setActiveDialog(null)}
            >
              Close
            </Button>
            <Button
              className="border border-cyan-400/15 bg-cyan-500/[0.12] text-cyan-100 hover:bg-cyan-500/[0.18] hover:text-white"
              onClick={handleSavePreferences}
            >
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "security"}
        onOpenChange={(open) => setActiveDialog(open ? "security" : null)}
      >
          <DialogContent className={`${DIALOG_CLASS_NAME} sm:max-w-lg`}>
          <DialogHeader>
            <DialogTitle>Security Center</DialogTitle>
            <DialogDescription className="text-slate-400">
              Choose the active AI provider and store its API key for this browser.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-100">Active Provider</span>
                <Badge className="bg-cyan-500/15 text-cyan-300">
                  {securityDraft.provider === "deepseek" ? "DeepSeek" : "OpenAI"}
                </Badge>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className={
                    securityDraft.provider === "deepseek"
                      ? "border-cyan-400/35 bg-cyan-500/[0.12] text-cyan-100 hover:bg-cyan-500/[0.18]"
                      : "border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/[0.08]"
                  }
                  onClick={() =>
                    setSecurityDraft((prev) => ({ ...prev, provider: "deepseek" }))
                  }
                >
                  Use DeepSeek
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={
                    securityDraft.provider === "openai"
                      ? "border-cyan-400/35 bg-cyan-500/[0.12] text-cyan-100 hover:bg-cyan-500/[0.18]"
                      : "border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/[0.08]"
                  }
                  onClick={() =>
                    setSecurityDraft((prev) => ({ ...prev, provider: "openai" }))
                  }
                >
                  Use OpenAI
                </Button>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-white/8 bg-white/[0.03] p-4">
              <Label htmlFor="deepseekApiKey" className="text-slate-300">
                DeepSeek API Key
              </Label>
              <Input
                id="deepseekApiKey"
                type="password"
                className={FIELD_CLASS_NAME}
                value={securityDraft.deepseekApiKey}
                name="deepseek-api-key"
                autoComplete="new-password"
                data-lpignore="true"
                onChange={(e) =>
                  setSecurityDraft((prev) => ({
                    ...prev,
                    deepseekApiKey: e.target.value,
                  }))
                }
                placeholder="sk-..."
              />
              <p className="text-xs text-slate-500">
                Stored locally. Current value: {maskApiKey(securitySettings.deepseekApiKey)}
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-white/8 bg-white/[0.03] p-4">
              <Label htmlFor="openaiApiKey" className="text-slate-300">
                OpenAI API Key
              </Label>
              <Input
                id="openaiApiKey"
                type="password"
                className={FIELD_CLASS_NAME}
                value={securityDraft.openaiApiKey}
                name="openai-api-key"
                autoComplete="new-password"
                data-lpignore="true"
                onChange={(e) =>
                  setSecurityDraft((prev) => ({
                    ...prev,
                    openaiApiKey: e.target.value,
                  }))
                }
                placeholder="sk-..."
              />
              <p className="text-xs text-slate-500">
                Stored locally. Current value: {maskApiKey(securitySettings.openaiApiKey)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              className="bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]"
              onClick={() => setActiveDialog(null)}
            >
              Close
            </Button>
            <Button
              className="border border-cyan-400/15 bg-cyan-500/[0.12] text-cyan-100 hover:bg-cyan-500/[0.18] hover:text-white"
              onClick={handleSaveSecuritySettings}
            >
              Save Security Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "console"}
        onOpenChange={(open) => setActiveDialog(open ? "console" : null)}
      >
        <DialogContent className={`${DIALOG_CLASS_NAME} sm:max-w-xl`}>
          <DialogHeader>
            <DialogTitle>Command Console</DialogTitle>
            <DialogDescription className="text-slate-400">
              Use quick commands to jump through the app and refresh active data views.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              className="justify-start border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/[0.08]"
              onClick={() => handleNavigate("/user/applications")}
            >
              <Terminal className="mr-2 h-4 w-4 text-cyan-300" />
              Open Applications
            </Button>
            <Button
              variant="outline"
              className="justify-start border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/[0.08]"
              onClick={() => handleNavigate("/user/jobs")}
            >
              <Terminal className="mr-2 h-4 w-4 text-cyan-300" />
              Open Jobs
            </Button>
            <Button
              variant="outline"
              className="justify-start border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/[0.08]"
              onClick={() => handleNavigate("/user/profiles")}
            >
              <Terminal className="mr-2 h-4 w-4 text-cyan-300" />
              Open Profiles
            </Button>
            <Button
              variant="outline"
              className="justify-start border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/[0.08]"
              onClick={() => {
                setActiveDialog(null);
                router.refresh();
                toast.info("Current view refreshed.");
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4 text-cyan-300" />
              Refresh Current View
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              className="bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]"
              onClick={() => setActiveDialog(null)}
            >
              Close Console
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "monitor"}
        onOpenChange={(open) => setActiveDialog(open ? "monitor" : null)}
      >
        <DialogContent className={`${DIALOG_CLASS_NAME} sm:max-w-4xl`}>
          <DialogHeader>
            <DialogTitle>System Monitor</DialogTitle>
            <DialogDescription className="text-slate-400">
              Live browser status plus application count trends across daily, weekly, and monthly views.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-100">
                <MonitorCog className="h-4 w-4 text-cyan-300" />
                Route
              </div>
              <p className="text-sm text-slate-300">{monitor.currentRoute}</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-100">
                <Activity className="h-4 w-4 text-cyan-300" />
                Connectivity
              </div>
              <p className="text-sm text-slate-300">
                {monitor.isOnline ? "Online" : "Offline"}
              </p>
            </div>
            <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-100">
                <Shield className="h-4 w-4 text-cyan-300" />
                Session
              </div>
              <p className="text-sm text-slate-300">
                {monitor.tokenPresent ? "Token detected" : "No token detected"}
              </p>
            </div>
            <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-100">
                <RefreshCw className="h-4 w-4 text-cyan-300" />
                Last Update
              </div>
              <p className="text-sm text-slate-300">{monitor.timestamp}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Applications</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">{applications.length}</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Applied</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">{appliedCount}</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ready To Apply</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">{generatedCount}</p>
            </div>
          </div>

          <Tabs
            value={chartRange}
            onValueChange={(value) => setChartRange(value as MonitorRange)}
            className="w-full"
          >
            <TabsList className="w-fit border border-white/8 bg-white/[0.04]">
              <TabsTrigger value="daily" className="data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-200">
                Daily
              </TabsTrigger>
              <TabsTrigger value="weekly" className="data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-200">
                Weekly
              </TabsTrigger>
              <TabsTrigger value="monthly" className="data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-200">
                Monthly
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily">
              {isLoadingApplications ? (
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-6 text-sm text-slate-400">
                  Loading application metrics...
                </div>
              ) : (
                <ApplicationsBarChart
                  data={chartData.daily}
                  title="Daily Application Activity"
                />
              )}
            </TabsContent>
            <TabsContent value="weekly">
              {isLoadingApplications ? (
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-6 text-sm text-slate-400">
                  Loading application metrics...
                </div>
              ) : (
                <ApplicationsBarChart
                  data={chartData.weekly}
                  title="Weekly Application Activity"
                />
              )}
            </TabsContent>
            <TabsContent value="monthly">
              {isLoadingApplications ? (
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-6 text-sm text-slate-400">
                  Loading application metrics...
                </div>
              ) : (
                <ApplicationsBarChart
                  data={chartData.monthly}
                  title="Monthly Application Activity"
                />
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="secondary"
              className="bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]"
              onClick={() => setActiveDialog(null)}
            >
              Close Monitor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

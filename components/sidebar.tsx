"use client"

import { useState, useEffect } from "react";
import Link from "next/link"
import { usePathname } from "next/navigation";
import { Database, type LucideIcon, Users, ClipboardList } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function NavItem({
  icon: Icon,
  label,
  active,
  href,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  href: string;
  onClick: () => void;
}) {
  return (
    <Link href={href} passHref>
      <Button
        variant="ghost"
        className={`w-full justify-start ${active ? "bg-slate-800/70 text-cyan-400" : "text-slate-400 hover:text-slate-100"}`}
        onClick={onClick}
      >
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}

export default function Sidebar() {
  const [activeItem, setActiveItem] = useState<string>("");

  const handleNavItemClick = (href: string) => {
    setActiveItem(href);
  }

  const pathname = usePathname();
  useEffect(() => {
    if (pathname.includes("/user/applications")) {
      setActiveItem("/user/applications");
    } else if (pathname.includes("/user/jobs")) {
      setActiveItem("/user/jobs");
    } else if (pathname.includes("/user/profiles") || pathname.includes("/user/profile-create")) {
      setActiveItem("/user/profiles");
    }
  }, [pathname]);

  return (
    <div className="flex flex-col h-full w-[25%]">
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm h-full">
        <CardContent className="p-4">
          <nav className="space-y-2">
            <NavItem
              href="/user/applications"
              icon={ClipboardList}
              label="Applications"
              active={activeItem === "/user/applications"}
              onClick={() => handleNavItemClick("/user/applications")}
            />
            <NavItem
              href="/user/jobs"
              icon={Database}
              label="Jobs"
              active={activeItem === "/user/jobs"}
              onClick={() => handleNavItemClick("/user/jobs")}
            />
            <NavItem
              href="/user/profiles"
              icon={Users}
              label="Profiles"
              active={activeItem === "/user/profiles"}
              onClick={() => handleNavItemClick("/user/profiles")}
            />
          </nav>
        </CardContent>
      </Card>
    </div>
  )
}

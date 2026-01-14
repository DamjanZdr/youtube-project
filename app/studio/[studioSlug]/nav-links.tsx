"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home,
  Tv, 
  FolderKanban, 
  Layout, 
  BookOpen, 
  Settings,
  LucideIcon
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface NavLinksProps {
  studioSlug: string;
  collapsed?: boolean;
}

export function NavLinks({ studioSlug, collapsed = false }: NavLinksProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: `/studio/${studioSlug}`, icon: Home, label: "Home" },
    { href: `/studio/${studioSlug}/channel`, icon: Tv, label: "Channel" },
    { href: `/studio/${studioSlug}/projects`, icon: FolderKanban, label: "Projects" },
    { href: `/studio/${studioSlug}/board`, icon: Layout, label: "Board" },
    { href: `/studio/${studioSlug}/wiki`, icon: BookOpen, label: "Wiki" },
    { href: `/studio/${studioSlug}/settings`, icon: Settings, label: "Settings" },
  ];

  const isActive = (href: string) => {
    // Exact match for home
    if (href === `/studio/${studioSlug}`) {
      return pathname === href;
    }
    // Prefix match for other pages
    return pathname.startsWith(href);
  };

  return (
    <ul className="space-y-1">
      {navItems.map((item) => {
        const active = isActive(item.href);
        const linkContent = (
          <Link
            href={item.href}
            className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} ${collapsed ? "px-0" : "px-3"} py-2.5 rounded-xl transition-all duration-200 group border ${
              active 
                ? "bg-primary/20 text-primary border-primary/30" 
                : "text-muted-foreground hover:text-foreground hover:bg-white/5 border-transparent"
            }`}
          >
            <item.icon className={`w-5 h-5 transition-transform shrink-0 ${active ? "scale-110" : "group-hover:scale-110"}`} />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </Link>
        );

        return (
          <li key={item.href}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  {linkContent}
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              linkContent
            )}
          </li>
        );
      })}
    </ul>
  );
}
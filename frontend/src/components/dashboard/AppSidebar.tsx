"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  LayoutGrid,
  BarChart3,
  Settings,
  Search,
  PanelLeftClose,
  PanelLeft,
  LogOut,
} from "lucide-react";
import { useClerk, useUser } from "@clerk/nextjs";
import { MascotLumi } from "@/components/prism/MascotLumi";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/workspaces", label: "My Workspaces", icon: LayoutGrid },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({
  collapsed,
  onToggle,
  onOpenSearch,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onOpenSearch: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const displayName = user?.fullName || user?.firstName || undefined;
  const email = user?.primaryEmailAddress?.emailAddress;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 248 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="glass flex h-full flex-col rounded-2xl"
    >
      {/* Brand + collapse */}
      <div className={cn("flex items-center gap-2 p-3", collapsed && "justify-center")}>
        <MascotLumi size={30} />
        {!collapsed && (
          <span className="flex-1 truncate text-sm font-bold tracking-tight">
            Prism<span className="prism-text">Learning</span>
          </span>
        )}
        <button
          onClick={onToggle}
          className={cn(
            "rounded-md p-1.5 text-muted-foreground transition-all duration-150 hover:bg-white/60 hover:text-foreground active:scale-90",
            collapsed && "absolute",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Search launcher */}
      <div className="px-3">
        <button
          onClick={onOpenSearch}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-white/50 bg-white/40 px-2.5 py-2 text-sm text-muted-foreground backdrop-blur-sm transition-all duration-150 hover:bg-white/70 active:scale-[0.98]",
            collapsed && "justify-center px-0",
          )}
        >
          <Search size={16} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search…</span>
              <kbd className="rounded border border-white/60 bg-white/60 px-1.5 py-0.5 text-[10px] font-medium">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="mt-3 flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.97]",
                collapsed && "justify-center px-0",
                active
                  ? "bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10 text-primary ring-1 ring-white/50"
                  : "text-foreground/70 hover:translate-x-0.5 hover:bg-white/50 hover:text-foreground",
              )}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Account */}
      <div className="border-t border-white/40 p-3">
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-semibold text-white">
            {(displayName || email || "?").charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{displayName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{email}</p>
              </div>
              <button
                onClick={() => signOut({ redirectUrl: "/sign-in" })}
                className="rounded-md p-1.5 text-muted-foreground transition-all duration-150 hover:bg-white/60 hover:text-foreground active:scale-90"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

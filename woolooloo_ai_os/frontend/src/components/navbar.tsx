"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/auth";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/clients", label: "Clients", icon: "groups" },
  { href: "/tasks", label: "Tasks", icon: "checklist" },
  { href: "/time-tracking", label: "Time", icon: "schedule" },
  { href: "/agents", label: "Agents", icon: "smart_toy" },
  { href: "/reports", label: "Reports", icon: "assessment" },
  { href: "/staff", label: "Staff", icon: "badge" },
  { href: "/wiki", label: "Wiki", icon: "auto_stories" },
  { href: "/config", label: "Config", icon: "settings" },
];

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (pathname === "/login") return null;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-md-surface-container-low/80 backdrop-blur-md border-b border-md-outline-variant/50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 text-md-on-surface hover:bg-md-on-surface/5 rounded-full px-3 py-2 transition-colors" aria-label="Woolooloo AI OS Home">
            <div className="h-10 w-10 rounded-full bg-md-primary flex items-center justify-center text-md-on-primary shadow-md-1">
              <span className="material-symbols-rounded text-2xl">flock</span>
            </div>
            <span className="text-title-large hidden sm:block">Woolooloo OS</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative flex items-center gap-2 rounded-full px-4 py-2 text-label-large font-medium
                    transition-all duration-200 ease-in-out
                    min-h-[48px] min-w-[48px]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    ${active
                      ? "bg-md-secondary-container text-md-on-secondary-container"
                      : "text-md-on-surface hover:bg-md-on-surface/5"
                    }
                  `}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="material-symbols-rounded text-20">
                    {item.icon}
                  </span>
                  <span className="hidden xl:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="
                  flex items-center gap-2 rounded-full px-3 py-2 h-12
                  text-md-on-surface hover:bg-md-on-surface/5
                  transition-all duration-200
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                "
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="h-8 w-8 rounded-full bg-md-primary flex items-center justify-center text-md-on-primary text-label-large">
                  D
                </div>
                <span className="hidden sm:inline text-label-large">Dustin</span>
                <span className="material-symbols-rounded text-18">
                  {userMenuOpen ? "expand_less" : "expand_more"}
                </span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-md-surface-container-high rounded-2xl shadow-md-3 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-md-outline-variant/50">
                    <p className="text-title-small text-md-on-surface">Dustin</p>
                    <p className="text-body-small text-md-on-surface-variant">dustin@woolooloo.co.za</p>
                  </div>
                  <Link href="/config" className="flex items-center gap-3 px-4 py-3 text-label-large text-md-on-surface hover:bg-md-on-surface/5 transition-colors">
                    <span className="material-symbols-rounded text-20">settings</span>
                    Settings
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-label-large text-md-error hover:bg-md-error/8 transition-colors"
                  >
                    <span className="material-symbols-rounded text-20">logout</span>
                    Sign out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden flex items-center justify-center h-12 w-12 rounded-full text-md-on-surface hover:bg-md-on-surface/5 transition-colors"
              aria-expanded={menuOpen}
              aria-label="Toggle menu"
            >
              <span className="material-symbols-rounded text-24">
                {menuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden pb-4 border-t border-md-outline-variant/50 pt-4">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`
                      flex items-center gap-3 rounded-full px-4 py-3 text-label-large font-medium min-h-[48px]
                      transition-all duration-200
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                      ${active
                        ? "bg-md-secondary-container text-md-on-secondary-container"
                        : "text-md-on-surface hover:bg-md-on-surface/5"
                      }
                    `}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="material-symbols-rounded text-20">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

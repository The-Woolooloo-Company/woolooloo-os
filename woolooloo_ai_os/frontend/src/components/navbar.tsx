"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import { logout, getSession, ensureUserPermissions } from "@/lib/auth";
import { ThemeToggle } from "./theme-toggle";
import { getUserPages, ALL_PAGES, PageId } from "@/lib/access-control";


interface DropdownItem {
  href: string;
  label: string;
  icon: string;
  description?: string;
}

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [opsOpen, setOpsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const opsRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const session = getSession();



  // Ensure permissions are initialized for this user
  useEffect(() => {
    if (session) ensureUserPermissions(session.username, session.isAdmin);
  }, [session]);

  // Tick to force re-render after permissions are set
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (session) {
      const t = setTimeout(() => setTick(n => n + 1), 150);
      return () => clearTimeout(t);
    }
  }, []);

  // Get user's accessible pages
  const userPages = useMemo(() => {
    if (!session) return [];
    return getUserPages(session.username);
  }, [session, tick]);

  // Build nav items from user's accessible pages
  const navItems = useMemo(() =>
    userPages.filter(p => p.category === 'main').map(p => ({ href: p.path, label: p.label, icon: p.icon })),
    [userPages]
  );
  const opsItems: DropdownItem[] = useMemo(() =>
    userPages.filter(p => p.category === 'ops').map(p => ({
      href: p.path, label: p.label, icon: p.icon,
      description: p.id === 'tasks' ? 'Linear tasks & backlog' : p.id === 'time-tracking' ? 'Clockify entries' : 'Team directory',
    })),
    [userPages]
  );
  const moreItems: DropdownItem[] = useMemo(() =>
    userPages.filter(p => p.category === 'more').map(p => ({
      href: p.path, label: p.label, icon: p.icon,
      description: p.id === 'wiki' ? 'Knowledge base' : p.id === 'staging' ? 'Deploy previews' : p.id === 'config' ? 'System settings' : p.id === 'audit' ? 'Activity audit log' : p.id === 'leads' ? 'Lead pipeline' : 'Marketing campaigns',
    })),
    [userPages]
  );

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (opsRef.current && !opsRef.current.contains(e.target as Node)) setOpsOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (pathname === "/login") return null;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isAnyActive = (items: DropdownItem[]) => items.some(i => isActive(i.href));

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
                  <span className="material-symbols-rounded text-20">{item.icon}</span>
                  <span className="hidden xl:inline">{item.label}</span>
                </Link>
              );
            })}

            {/* WoolWorks shortcut */}
                        <Link
                href="/woolworks"
                className={`
                  relative flex items-center gap-2 rounded-full px-4 py-2 text-label-large font-medium
                  transition-all duration-200 ease-in-out
                  min-h-[48px] min-w-[48px]
                  ${pathname === '/woolworks'
                    ? "bg-md-secondary-container text-md-on-secondary-container"
                    : "text-md-on-surface hover:bg-md-on-surface/5"
                  }
                `}
              >
                <span className="material-symbols-rounded text-20">build</span>
                <span className="hidden xl:inline">WoolWorks</span>
              </Link>

            {/* Ops dropdown */}
            <div ref={opsRef} className="relative">
              <button
                onClick={() => { setOpsOpen(!opsOpen); setMoreOpen(false); }}
                className={`
                  flex items-center gap-2 rounded-full px-4 py-2 text-label-large font-medium
                  transition-all duration-200 min-h-[48px]
                  ${isAnyActive(opsItems)
                    ? "bg-md-secondary-container text-md-on-secondary-container"
                    : "text-md-on-surface hover:bg-md-on-surface/5"
                  }
                `}
              >
                <span className="material-symbols-rounded text-20">work_history</span>
                <span className="hidden xl:inline">Ops</span>
                <span className="material-symbols-rounded text-16">
                  {opsOpen ? "expand_less" : "expand_more"}
                </span>
              </button>
              {opsOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-md-surface-container-high rounded-2xl shadow-md-3 overflow-hidden z-50 border border-md-outline-variant/30">
                  {opsItems.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        isActive(item.href)
                          ? "bg-md-secondary-container/50 text-md-on-secondary-container"
                          : "text-md-on-surface hover:bg-md-on-surface/5"
                      }`}
                    >
                      <span className="material-symbols-rounded text-20">{item.icon}</span>
                      <div>
                        <p className="text-label-large">{item.label}</p>
                        {item.description && <p className="text-body-small text-md-on-surface-variant">{item.description}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* More dropdown */}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => { setMoreOpen(!moreOpen); setOpsOpen(false); }}
                className={`
                  flex items-center gap-2 rounded-full px-4 py-2 text-label-large font-medium
                  transition-all duration-200 min-h-[48px]
                  ${isAnyActive(moreItems)
                    ? "bg-md-secondary-container text-md-on-secondary-container"
                    : "text-md-on-surface hover:bg-md-on-surface/5"
                  }
                `}
              >
                <span className="material-symbols-rounded text-20">more_horiz</span>
                <span className="hidden xl:inline">More</span>
                <span className="material-symbols-rounded text-16">
                  {moreOpen ? "expand_less" : "expand_more"}
                </span>
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-md-surface-container-high rounded-2xl shadow-md-3 overflow-hidden z-50 border border-md-outline-variant/30">
                  {moreItems.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        isActive(item.href)
                          ? "bg-md-secondary-container/50 text-md-on-secondary-container"
                          : "text-md-on-surface hover:bg-md-on-surface/5"
                      }`}
                    >
                      <span className="material-symbols-rounded text-20">{item.icon}</span>
                      <div>
                        <p className="text-label-large">{item.label}</p>
                        {item.description && <p className="text-body-small text-md-on-surface-variant">{item.description}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
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
                  {session?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="hidden sm:inline text-label-large">{session?.username || 'User'}</span>
                <span className="material-symbols-rounded text-18">
                  {userMenuOpen ? "expand_less" : "expand_more"}
                </span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-md-surface-container-high rounded-2xl shadow-md-3 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-md-outline-variant/50">
                    <p className="text-title-small text-md-on-surface">{session?.username || 'User'}</p>
                    {session?.isAdmin && <p className="text-body-small text-md-primary">Admin</p>}
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
                      flex items-center gap-3 rounded-xl px-4 py-3 text-label-large font-medium min-h-[48px]
                      transition-all duration-200
                      ${active
                        ? "bg-md-secondary-container text-md-on-secondary-container"
                        : "text-md-on-surface hover:bg-md-on-surface/5"
                      }
                    `}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="material-symbols-rounded text-20">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}

              {/* Mobile Ops section */}
              <div className="pt-3 pb-1">
                <p className="text-label-small text-md-on-surface-variant px-4">Operations</p>
              </div>
              {opsItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`
                      flex items-center gap-3 rounded-xl px-4 py-3 text-label-large min-h-[48px]
                      transition-all duration-200
                      ${active
                        ? "bg-md-secondary-container text-md-on-secondary-container"
                        : "text-md-on-surface hover:bg-md-on-surface/5"
                      }
                    `}
                  >
                    <span className="material-symbols-rounded text-20">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}

              {/* Mobile More section */}
              <div className="pt-3 pb-1">
                <p className="text-label-small text-md-on-surface-variant px-4">More</p>
              </div>
              {moreItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`
                      flex items-center gap-3 rounded-xl px-4 py-3 text-label-large min-h-[48px]
                      transition-all duration-200
                      ${active
                        ? "bg-md-secondary-container text-md-on-secondary-container"
                        : "text-md-on-surface hover:bg-md-on-surface/5"
                      }
                    `}
                  >
                    <span className="material-symbols-rounded text-20">{item.icon}</span>
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

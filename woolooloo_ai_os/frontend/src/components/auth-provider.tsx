"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated, getSession, ensureUserPermissions, bootstrapDefaultUser } from "@/lib/auth";

interface AuthContextType {
  authenticated: boolean;
  session: { username: string; isAdmin: boolean } | null;
}

const AuthContext = createContext<AuthContextType>({ authenticated: false, session: null });

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [session, setSession] = useState<{ username: string; isAdmin: boolean } | null>(null);

  useEffect(() => {
    // Bootstrap default admin user on first load
    bootstrapDefaultUser();
    
    if (pathname === "/login") return; // Don't redirect on login page

    const checkAuth = () => {
      const auth = isAuthenticated();
      const sess = getSession();
      setAuthenticated(auth);
      setSession(sess ? { username: sess.username, isAdmin: sess.isAdmin } : null);
      // Ensure permissions exist for the current user on every page load
      if (sess) ensureUserPermissions(sess.username, sess.isAdmin);

      if (!auth && pathname !== "/login") {
        router.push("/login");
      }
    };

    checkAuth();
  }, [pathname, router]);

  // Still rendering children during SSR, client will redirect
  return (
    <AuthContext.Provider value={{ authenticated: authenticated ?? true, session }}>
      {children}
    </AuthContext.Provider>
  );
}

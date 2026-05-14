"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated, getSession } from "@/lib/auth";

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
    if (pathname === "/login") return; // Don't redirect on login page

    const checkAuth = () => {
      const auth = isAuthenticated();
      const sess = getSession();
      setAuthenticated(auth);
      setSession(sess ? { username: sess.username, isAdmin: sess.isAdmin } : null);

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

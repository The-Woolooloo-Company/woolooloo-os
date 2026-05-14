"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        router.push("/");
        router.refresh();
      } else {
        setError("Invalid username or password");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-md-surface flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-md-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-md-primary to-md-primary-container opacity-90" />
        <div className="relative z-10 flex flex-col items-center justify-center p-16 text-center">
          <div className="h-24 w-24 rounded-3xl bg-md-on-primary/20 flex items-center justify-center mb-8">
            <span className="material-symbols-rounded text-64 text-md-on-primary">flock</span>
          </div>
          <h1 className="text-display-medium text-md-on-primary mb-4">Woolooloo AI OS</h1>
          <p className="text-body-large text-md-on-primary/80 max-w-md">
            AI Operating System for Woolooloo Technologies. Manage clients, projects, tasks, and team productivity with intelligent automation.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-md-primary flex items-center justify-center">
              <span className="material-symbols-rounded text-40 text-md-on-primary">flock</span>
            </div>
          </div>

          <h2 className="text-headline-large text-md-on-surface mb-2">Welcome back</h2>
          <p className="text-body-large text-md-on-surface-variant mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-2xl bg-md-error-container text-md-on-error-container p-4 flex items-center gap-3" role="alert">
                <span className="material-symbols-rounded text-20">error</span>
                <p className="text-label-large">{error}</p>
              </div>
            )}

            <Input
              label="Username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              startIcon={<span className="material-symbols-rounded text-20">person</span>}
              autoComplete="username"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              startIcon={<span className="material-symbols-rounded text-20">lock</span>}
              autoComplete="current-password"
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-5 h-5 rounded border-md-outline text-md-primary focus:ring-md-primary" />
                <span className="text-label-medium text-md-on-surface-variant">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-label-medium text-md-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="filled"
              size="lg"
              className="w-full"
              loading={loading}
            >
              Sign in
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-md-outline-variant/50">
            <p className="text-body-small text-md-on-surface-variant text-center">
              Default credentials: <span className="font-medium">dustin</span> / <span className="font-medium">WooloolooOS!</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

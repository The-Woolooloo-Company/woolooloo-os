"use client";

import { useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStaff } from "@/hooks/useStaff";

export default function StaffPage() {
  const { staff, loading } = useStaff();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = staff;
    if (filterRole !== "all") {
      result = result.filter(s => s.role === filterRole);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(st =>
        st.name.toLowerCase().includes(s) ||
        st.email.toLowerCase().includes(s)
      );
    }
    return result;
  }, [staff, filterRole, search]);

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-display-small text-md-on-surface">Staff</h1>
          <p className="text-body-large text-md-on-surface-variant mt-1">
            Team members from Linear and Clockify
          </p>
        </div>

        <Card variant="tonal" className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="Search staff..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                startIcon={<span className="material-symbols-rounded text-20">search</span>}
              />
              <div className="flex gap-2">
                <Button variant={filterRole === "all" ? "filled" : "outlined"} size="sm" onClick={() => setFilterRole("all")}>All</Button>
                <Button variant={filterRole === "developer" ? "filled" : "outlined"} size="sm" onClick={() => setFilterRole("developer")}>Developers</Button>
                <Button variant={filterRole === "manager" ? "filled" : "outlined"} size="sm" onClick={() => setFilterRole("manager")}>Managers</Button>
                <Button variant={filterRole === "ai" ? "filled-tonal" : "outlined"} size="sm" onClick={() => setFilterRole("ai")}>AI Agents</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {filtered.map(person => (
            <Card key={person.id} className="hover:shadow-md-2 transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-md-primary-container flex items-center justify-center text-md-on-primary-container text-headline-small font-medium flex-shrink-0">
                    {person.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-title-large text-md-on-surface">{person.name}</h3>
                    <p className="text-body-small text-md-on-surface-variant">{person.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={person.role === "ai" ? "tertiary-tonal" : person.role === "manager" ? "secondary-tonal" : "primary-tonal"}>
                      {person.role === "ai" ? "🤖 AI Agent" : person.role.charAt(0).toUpperCase() + person.role.slice(1)}
                    </Badge>
                    <Badge variant="secondary-tonal">{person.source}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <span className="material-symbols-rounded text-48 text-md-on-surface-variant/40">badge</span>
              <p className="text-body-large text-md-on-surface-variant mt-4">No staff found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

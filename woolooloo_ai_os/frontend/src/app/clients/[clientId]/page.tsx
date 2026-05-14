"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/clients/${clientId}/projects`);
  }, [clientId, router]);

  return (
    <div className="min-h-screen bg-md-surface flex items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-md-primary border-r-transparent" />
    </div>
  );
}

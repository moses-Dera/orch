"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function GithubCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    // Prevent double execution in React strict mode
    if (processed) return;

    const linkInstallation = async () => {
      const installationId = searchParams.get("installation_id");

      if (!installationId) {
        setError("No installation ID found in the URL.");
        return;
      }

      setProcessed(true);

      try {
        await api.setGithubInstallation(installationId);
        toast.success("GitHub App linked automatically!");
        // Redirect back to the github dashboard
        router.push("/github");
      } catch (err: any) {
        console.error("Failed to link installation:", err);
        setError(err.message || "Failed to link GitHub installation.");
        toast.error("Failed to link GitHub installation.");
      }
    };

    linkInstallation();
  }, [searchParams, router, processed]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      {error ? (
        <div className="text-center space-y-4">
          <div className="text-red-500 font-semibold text-lg">Linking Failed</div>
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          <button 
            onClick={() => router.push("/github")}
            className="px-4 py-2 bg-[var(--surface)] border rounded-md text-sm hover:bg-[var(--background)]"
          >
            Go Back
          </button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--accent)]" />
          <h2 className="text-lg font-semibold">Linking GitHub App...</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Please wait while we connect your repository to Orch.
          </p>
        </div>
      )}
    </div>
  );
}

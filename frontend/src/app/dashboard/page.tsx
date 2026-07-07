import { UploadZone } from "@/components/prism/UploadZone";
import { WorkspaceGrid } from "@/components/prism/WorkspaceGrid";
import { AccountChip } from "@/components/prism/AccountChip";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Your Workspaces</h1>
              <p className="mt-1 text-muted-foreground">
                Isolated, source-grounded study environments.
              </p>
            </div>
            <AccountChip />
          </div>

          {/* Drag & drop upload zone (functional: hits /ingest/*) */}
          <UploadZone />

          {/* Live grid: created workspaces (this session in mock mode, or
              GET /workspaces in live mode) plus demo samples. */}
          <WorkspaceGrid />
        </div>
      </div>
    </RequireAuth>
  );
}

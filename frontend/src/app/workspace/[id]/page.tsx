import { WorkspaceShell } from "@/components/prism/WorkspaceShell";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { MOCK_WORKSPACES } from "@/lib/mockData";

export default function WorkspacePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { doc?: string };
}) {
  const title =
    MOCK_WORKSPACES.find((w) => w.id === params.id)?.title ?? "Workspace";
  return (
    <RequireAuth>
      <WorkspaceShell
        workspaceId={params.id}
        workspaceTitle={title}
        initialDocumentId={searchParams.doc}
      />
    </RequireAuth>
  );
}

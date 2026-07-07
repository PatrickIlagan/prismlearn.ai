import { RequireAuth } from "@/components/auth/RequireAuth";
import { WorkspaceLobby } from "@/components/lobby/WorkspaceLobby";

export default function WorkspaceOverviewPage({ params }: { params: { id: string } }) {
  return (
    <RequireAuth>
      <WorkspaceLobby workspaceId={params.id} />
    </RequireAuth>
  );
}

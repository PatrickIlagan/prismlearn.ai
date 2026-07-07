import { RequireAuth } from "@/components/auth/RequireAuth";
import { PracticeExamArena } from "@/components/exam/PracticeExamArena";

export default function PracticeExamPage({ params }: { params: { id: string } }) {
  return (
    <RequireAuth>
      <PracticeExamArena workspaceId={params.id} />
    </RequireAuth>
  );
}

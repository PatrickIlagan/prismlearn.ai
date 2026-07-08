import { RequireAuth } from "@/components/auth/RequireAuth";
import { PracticeExamArena } from "@/components/exam/PracticeExamArena";

export default function PracticeExamPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { doc?: string };
}) {
  return (
    <RequireAuth>
      <PracticeExamArena workspaceId={params.id} documentId={searchParams.doc} />
    </RequireAuth>
  );
}

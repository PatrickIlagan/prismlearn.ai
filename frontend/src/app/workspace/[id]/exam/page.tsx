import { RequireAuth } from "@/components/auth/RequireAuth";
import { PracticeExamArena } from "@/components/exam/PracticeExamArena";

export default function PracticeExamPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { doc?: string; chapter?: string; chapterTitle?: string };
}) {
  return (
    <RequireAuth>
      <PracticeExamArena
        workspaceId={params.id}
        documentId={searchParams.doc}
        chapterAnchorId={searchParams.chapter}
        chapterTitle={searchParams.chapterTitle}
      />
    </RequireAuth>
  );
}

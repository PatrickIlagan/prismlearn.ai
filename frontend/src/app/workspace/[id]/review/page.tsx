import { RequireAuth } from "@/components/auth/RequireAuth";
import { WeaknessReview } from "@/components/review/WeaknessReview";

export default function WeaknessReviewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { doc?: string };
}) {
  return (
    <RequireAuth>
      <WeaknessReview workspaceId={params.id} documentId={searchParams.doc} />
    </RequireAuth>
  );
}

import { RequireAuth } from "@/components/auth/RequireAuth";
import { WeaknessReview } from "@/components/review/WeaknessReview";

export default function WeaknessReviewPage({ params }: { params: { id: string } }) {
  return (
    <RequireAuth>
      <WeaknessReview workspaceId={params.id} />
    </RequireAuth>
  );
}

import { RecommendationRunClient } from './recommendation-run-client';

export default async function RecommendationRunPage({
  params,
}: {
  readonly params: Promise<{ readonly operationId: string }>;
}) {
  const { operationId } = await params;
  return <RecommendationRunClient operationId={operationId} />;
}

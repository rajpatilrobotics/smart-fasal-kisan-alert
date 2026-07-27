import { FarmerCaseDetailsClient } from './farmer-case-details-client';

export default async function FarmerCaseDetailsPage({
  params,
}: {
  readonly params: Promise<{ readonly caseId: string }>;
}) {
  const { caseId } = await params;
  return <FarmerCaseDetailsClient caseId={caseId} />;
}

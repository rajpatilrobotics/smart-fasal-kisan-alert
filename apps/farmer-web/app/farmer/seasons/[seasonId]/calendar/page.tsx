import { SeasonCalendarClient } from './season-calendar-client';

export default async function SeasonCalendarPage({
  params,
}: {
  readonly params: Promise<{ readonly seasonId: string }>;
}) {
  const { seasonId } = await params;
  return <SeasonCalendarClient seasonId={seasonId} />;
}

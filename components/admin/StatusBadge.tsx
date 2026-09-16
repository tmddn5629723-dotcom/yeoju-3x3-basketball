import { TEAM_STATUS_BADGE_CLASS, type TeamStatus } from "@/config/tournament";

export function StatusBadge({ status }: { status: TeamStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TEAM_STATUS_BADGE_CLASS[status]}`}
    >
      {status}
    </span>
  );
}

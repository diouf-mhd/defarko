import { Badge } from "./ui";
import { REQUEST_STATUS } from "@/lib/status";
import type { RequestStatus } from "@/lib/types";

export default function StatusBadge({ status }: { status: RequestStatus }) {
  const s = REQUEST_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

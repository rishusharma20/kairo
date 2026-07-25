import { fetchAuditLogsAction } from "./actions";
import { AuditClient } from "./audit-client";

export default async function AdminAuditPage() {
  // Fetch initial audit logs on the server for instant rendering
  const initialLogs = await fetchAuditLogsAction();

  return <AuditClient initialLogs={initialLogs} />;
}

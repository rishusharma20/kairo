import { fetchPaymentsAction } from "./actions";
import { PaymentsClient } from "./payments-client";

export default async function AdminPaymentsPage() {
  // Fetch initial payment requests on the server for instant rendering
  const initialPayments = await fetchPaymentsAction();

  return <PaymentsClient initialPayments={initialPayments} />;
}

import { getSession } from "@/lib/auth";
import { getCachedUser } from "@/lib/services/user";
import { redirect } from "next/navigation";
import BillingClient from "./billing-client";

export default async function BillingDashboard() {
  const session = await getSession();
  
  if (!session) {
    redirect("/auth/login");
  }

  const user = await getCachedUser(session.userId);

  if (!user) {
    redirect("/auth/login");
  }

  return <BillingClient user={{ plan: user.plan, daily_limit: user.daily_limit }} />;
}

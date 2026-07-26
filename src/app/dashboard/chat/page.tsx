import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { KairoChat } from "@/components/chat/kairo-chat";

export const metadata = {
  title: "Kairo Chat | Dashboard",
  description: "Ask Kairo anything.",
};

export default async function DashboardChatPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <div className="w-full flex justify-center pb-8">
      <KairoChat />
    </div>
  );
}

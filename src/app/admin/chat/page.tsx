import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { KairoChat } from "@/components/chat/kairo-chat";

export const metadata = {
  title: "Kairo Chat | Admin",
  description: "Ask Kairo anything from the Admin panel.",
};

export default async function AdminChatPage() {
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

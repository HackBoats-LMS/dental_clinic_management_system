import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import QueueView from "./queue-view";

export default async function ReceptionistQueuePage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "receptionist" && session.user.role !== "admin")) {
    redirect("/api/auth/signin");
  }

  return <QueueView />;
}

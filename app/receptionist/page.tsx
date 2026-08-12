import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ReceptionistDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "receptionist") {
    redirect("/api/auth/signin");
  }
  
  redirect("/receptionist/todays-calls");
}

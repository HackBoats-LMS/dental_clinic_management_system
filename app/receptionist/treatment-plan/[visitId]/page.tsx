import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TreatmentPlanClient from "./treatment-plan-client";

export default async function TreatmentPlanPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "receptionist" && session.user.role !== "admin")) {
    redirect("/api/auth/signin");
  }

  const { visitId } = await params;

  const visit = await prisma.visit.findUnique({
    where: { visitId },
    include: {
      patient: { select: { patientId: true, name: true, phoneNumber: true, email: true } },
      doctor: { select: { doctorId: true, name: true } },
      familyMember: { select: { name: true, relation: true } },
      treatmentPlan: {
        include: { sessions: { orderBy: { sessionNumber: "asc" } } },
      },
    },
  });

  if (!visit) {
    redirect("/receptionist/todays-calls");
  }

  return (
    <TreatmentPlanClient
      visit={{
        visitId: visit.visitId,
        visitDate: visit.visitDate.toISOString(),
        problems: visit.problems,
        procedures: visit.procedures,
        patient: {
          patientId: visit.patient.patientId,
          name: visit.patient.name,
          phoneNumber: visit.patient.phoneNumber,
        },
        doctor: {
          doctorId: visit.doctor.doctorId,
          name: visit.doctor.name,
        },
        familyMember: visit.familyMember
          ? { name: visit.familyMember.name, relation: visit.familyMember.relation }
          : null,
      }}
      existingPlan={
        visit.treatmentPlan
          ? {
              id: visit.treatmentPlan.id,
              selectedProcedure: visit.treatmentPlan.selectedProcedure,
              totalSessions: visit.treatmentPlan.totalSessions,
              status: visit.treatmentPlan.status,
              sessions: visit.treatmentPlan.sessions.map((s) => ({
                id: s.id,
                sessionNumber: s.sessionNumber,
                scheduledDate: s.scheduledDate.toISOString(),
                status: s.status,
              })),
            }
          : null
      }
    />
  );
}

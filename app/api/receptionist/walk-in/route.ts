import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/eventBus";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@/app/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";

function isAuthorized(role: string | undefined) {
  return role === "receptionist" || role === "admin";
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAuthorized(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone")?.trim();
    const email = searchParams.get("email")?.trim().toLowerCase() || null;
    const name = searchParams.get("name")?.trim();

    if (!phone && !email && !name) {
      return NextResponse.json({ error: "Name, phone or email is required" }, { status: 400 });
    }

    let patients: Array<{ patientId: string; name: string; phoneNumber: string | null }> = [];

    // Exact match on phone first, then email, then fuzzy match on name.
    if (phone) {
      const p = await prisma.patient.findUnique({ where: { phoneNumber: phone } });
      if (p) patients.push(p);
    }
    if (patients.length === 0 && email) {
      const p = await prisma.patient.findUnique({ where: { email } });
      if (p) patients.push(p);
    }
    if (patients.length === 0 && name) {
      patients = await prisma.patient.findMany({
        where: { name: { contains: name, mode: "insensitive" } },
        orderBy: { name: "asc" },
        take: 5,
      });
    }

    if (patients.length === 0) {
      return NextResponse.json({ patients: [] });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const results = await Promise.all(
      patients.map(async (patient) => {
        const ops = await prisma.op.findMany({
          where: { patientId: patient.patientId },
          include: {
            doctor: { select: { name: true } },
            requests: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
            visits: {
              orderBy: { visitDate: "desc" },
              take: 1,
              select: { isVerified: true, visitDate: true, tokenNumber: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        const now = new Date();
        const opsData = ops.map((op) => {
          const latestVisit = op.visits[0];
          const checkedInToday = !!(
            latestVisit &&
            latestVisit.isVerified &&
            latestVisit.visitDate >= todayStart
          );
          return {
            opId: op.opId,
            doctor: { name: op.doctor.name },
            requests: op.requests.map((r) => ({ status: r.status })),
            checkedInToday,
            tokenNumber: checkedInToday ? latestVisit.tokenNumber : null,
            expiresAt: op.expiresAt.toISOString(),
            expired: op.expiresAt < now,
          };
        });

        return {
          patient: {
            patientId: patient.patientId,
            name: patient.name,
            phoneNumber: patient.phoneNumber,
          },
          ops: opsData,
        };
      })
    );

    return NextResponse.json({ patients: results });
  } catch (error) {
    console.error("Error looking up patient:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    if (!session?.user || !isAuthorized(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { opId, doctorId, name, phoneNumber, email, issueToken, patientId } = body as {
      opId?: string;
      doctorId?: string;
      name?: string;
      phoneNumber?: string;
      email?: string;
      issueToken?: boolean;
      patientId?: string;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ─── Check in against an existing OP ────────────────────────────────────
    if (opId) {
      const op = await prisma.op.findUnique({
        where: { opId },
        include: {
          doctor: { select: { name: true } },
          requests: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
          visits: {
            orderBy: { visitDate: "desc" },
            take: 1,
            select: { isVerified: true, visitDate: true, tokenNumber: true },
          },
        },
      });

      if (!op) {
        return NextResponse.json({ error: "OP not found" }, { status: 404 });
      }
      if (op.expiresAt < new Date()) {
        return NextResponse.json({ error: "OP has expired" }, { status: 400 });
      }
      if (op.requests[0]?.status !== "APPROVED") {
        return NextResponse.json({ error: "OP is not approved yet" }, { status: 400 });
      }

      const result = await prisma.$transaction(
        async (tx) => {
          const verifiedToday = await tx.visit.count({
            where: { doctorId: op.doctorId, isVerified: true, visitDate: { gte: today } },
          });
          const tokenNumber = verifiedToday + 1;
          const visit = await tx.visit.create({
            data: {
              visitDate: new Date(),
              isVerified: true,
              tokenNumber,
              doctorId: op.doctorId,
              patientId: op.patientId,
              opId: op.opId,
            },
            include: {
              patient: { select: { patientId: true, name: true, phoneNumber: true } },
            },
          });
          return { visit, tokenNumber, patient: visit.patient };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      broadcast({ type: "QUEUE_UPDATE", doctorId: op.doctorId });

      return NextResponse.json(
        {
          message: `Token #${result.tokenNumber} assigned to ${result.patient.name}`,
          tokenNumber: result.tokenNumber,
          patient: result.patient,
          visit: result.visit,
          op: { opId: op.opId, doctor: op.doctor, visits: [{ tokenNumber: result.tokenNumber }] },
        },
        { status: 201 }
      );
    }

    // ─── Create a new OP (walk-in / customer without email) ─────────────────
    const trimmedName = name?.trim();
    const trimmedPhone = phoneNumber?.trim();
    const trimmedEmail = email?.trim().toLowerCase() || null;

    if (!doctorId) {
      return NextResponse.json({ error: "Doctor is required" }, { status: 400 });
    }

    if (!patientId && !trimmedName) {
      return NextResponse.json(
        { error: "Patient name (or an existing patient) is required" },
        { status: 400 }
      );
    }

    const doctor = await prisma.doctor.findUnique({ where: { doctorId } });
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Use an existing patient directly (quick OP from the lookup panel),
        // otherwise dedupe by phone, then email, so the same person is never
        // registered twice.
        let patient = patientId
          ? await tx.patient.findUnique({ where: { patientId } })
          : null;

        if (!patient && trimmedPhone) {
          patient = await tx.patient.findUnique({ where: { phoneNumber: trimmedPhone } });
        }
        if (!patient && trimmedEmail) {
          patient = await tx.patient.findUnique({ where: { email: trimmedEmail } });
        }

        if (patient) {
          // Attach an email to the existing record when one was not provided earlier.
          if (trimmedEmail && !patient.email) {
            patient = await tx.patient.update({
              where: { patientId: patient.patientId },
              data: { email: trimmedEmail },
            });
          }
        } else {
          patient = await tx.patient.create({
            data: {
              name: trimmedName!,
              phoneNumber: trimmedPhone || null,
              email: trimmedEmail,
            },
          });
        }

        // OP valid for 24 hours, approved immediately so it is ready to use.
        const op = await tx.op.create({
          data: {
            patientId: patient.patientId,
            doctorId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });

        const request = await tx.request.create({
          data: {
            patientId: patient.patientId,
            opId: op.opId,
            status: "APPROVED",
            approvedById: role === "receptionist" ? session.user.id : null,
            approvedAt: new Date(),
          },
        });

        let visit = null;
        let tokenNumber = 0;
        if (issueToken) {
          const verifiedToday = await tx.visit.count({
            where: { doctorId, isVerified: true, visitDate: { gte: today } },
          });
          tokenNumber = verifiedToday + 1;
          visit = await tx.visit.create({
            data: {
              visitDate: new Date(),
              isVerified: true,
              tokenNumber,
              doctorId,
              patientId: patient.patientId,
              opId: op.opId,
            },
          });
        }

        return { patient, op, request, visit, tokenNumber };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (issueToken) {
      broadcast({ type: "QUEUE_UPDATE", doctorId });
    }

    return NextResponse.json(
      {
        message: issueToken
          ? `Token #${result.tokenNumber} assigned to ${result.patient.name}`
          : `OP created for ${result.patient.name}`,
        tokenNumber: result.tokenNumber,
        op: result.op,
        patient: result.patient,
        visit: result.visit,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating receptionist OP:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

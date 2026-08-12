import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],

  callbacks: {

    // 🔐 SIGN IN
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email;
        if (!email) return false;

        // check existing roles
        const patient = await prisma.patient.findUnique({ where: { email } });
        if (patient) return true;

        const doctor = await prisma.doctor.findUnique({ where: { email } });
        if (doctor) return true;

        const admin = await prisma.admin.findUnique({ where: { email } });
        if (admin) return true;

        const receptionist = await prisma.receptionist.findUnique({ where: { email } });
        if (receptionist) return true;

        // default → create patient
        await prisma.patient.create({
          data: {
            name: user.name || "",
            email,
          },
        });

        return true;
      }

      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user?.email) {
        const email = user.email;
        token.email = email;

        const patient = await prisma.patient.findUnique({ where: { email } });
        if (patient) {
          token.role = "patient";
          token.id = patient.patientId;
          token.profileComplete = patient.profileComplete;
        }

        const doctor = await prisma.doctor.findUnique({ where: { email } });
        if (doctor) {
          token.role = "doctor";
          token.id = doctor.doctorId;
        }

        const admin = await prisma.admin.findUnique({ where: { email } });
        if (admin) {
          token.role = "admin";
          token.id = admin.adminId;
        }

        const receptionist = await prisma.receptionist.findUnique({ where: { email } });
        if (receptionist) {
          token.role = "receptionist";
          token.id = receptionist.receptionistId;
        }
      }

      const role = token.role as string | undefined;
      const id = token.id as string | undefined;

      if (!role || !id) return token;

      if (trigger === "update" || !token.name) {

        if (role === "patient") {
          const p = await prisma.patient.findUnique({
            where: { patientId: id as string }
          });

          if (p) {
            Object.assign(token, {
              id: p.patientId,
              name: p.name,
              email: p.email,
              phoneNumber: p.phoneNumber,
              profileComplete: p.profileComplete,
            });
          }
        }

        if (role === "doctor") {
          const d = await prisma.doctor.findUnique({
            where: { doctorId: id as string }
          });

          if (d) {
            Object.assign(token, {
              id: d.doctorId,
              name: d.name,
              email: d.email,
              phoneNumber: d.phoneNo,
            });
          }
        }

        if (role === "admin") {
          const a = await prisma.admin.findUnique({
            where: { adminId: id as string }
          });

          if (a) {
            Object.assign(token, {
              id: a.adminId,
              name: a.name,
              email: a.email,
              phoneNumber: a.phone,
            });
          }
        }

        if (role === "receptionist") {
          const r = await prisma.receptionist.findUnique({
            where: { receptionistId: id as string }
          });

          if (r) {
            Object.assign(token, {
              id: r.receptionistId,
              name: r.name,
              email: r.email,
              phoneNumber: r.phone,
            });
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.phoneNumber = token.phoneNumber;
        session.user.profileComplete = token.profileComplete;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },
};
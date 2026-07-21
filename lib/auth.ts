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
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email;
        if (!email) return false;

        // Check if user is an admin
        const admin = await prisma.admin.findFirst({
          where: { email },
        });
        if (admin) return true;

        // Check if user is a receptionist
        const receptionist = await prisma.receptionist.findFirst({
          where: { email },
        });
        if (receptionist) return true;

        return false; // Not authorized
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.email) {
        const admin = await prisma.admin.findFirst({ where: { email: user.email } });
        if (admin) {
          token.role = "admin";
        } else {
          const receptionist = await prisma.receptionist.findFirst({ where: { email: user.email } });
          if (receptionist) {
            token.role = "receptionist";
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
};

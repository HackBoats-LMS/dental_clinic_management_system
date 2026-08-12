import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
      phoneNumber?: string | null;
      profileComplete?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: string;
    phoneNumber?: string | null;
    profileComplete?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    phoneNumber?: string | null;
    profileComplete?: boolean;
  }
}

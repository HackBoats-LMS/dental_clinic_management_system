import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (path.startsWith("/receptionist") && token?.role !== "receptionist" && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (path.startsWith("/upload-recordings") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/receptionist/:path*", "/upload-recordings/:path*"],
};

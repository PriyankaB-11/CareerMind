export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/upload/:path*", "/job-match/:path*", "/history/:path*", "/reports/:path*"],
};

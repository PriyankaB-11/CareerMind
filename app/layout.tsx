import type { Metadata } from "next";
import { Space_Grotesk, Sora } from "next/font/google";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { SiteHeader } from "@/components/site-header";
import { ChunkErrorReloader } from "@/components/chunk-error-reloader";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareerMind",
  description: "Persistent AI-powered career intelligence for modern professionals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${sora.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <ChunkErrorReloader />
        <AuthSessionProvider>
          <div className="min-h-screen bg-[radial-gradient(circle_at_14%_-6%,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_88%_0%,rgba(56,189,248,0.14),transparent_34%),linear-gradient(to_bottom,#f7fcff_0%,#f8fafc_42%,#ffffff_100%)]">
            <SiteHeader />
            {children}
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}

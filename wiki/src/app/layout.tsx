import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Sidebar from "@/components/Sidebar";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import { getNav } from "@/lib/content";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workspace Wiki",
  description: "Operational playbooks and knowledge base",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nav = await getNav();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[#1a1a2e] text-slate-100">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#111122] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-lg font-semibold text-slate-100">Workspace Wiki</div>
                <SearchBar />
                <ThemeToggle />
              </div>
            </header>
            <div className="flex flex-1">
              <div className="hidden h-[calc(100vh-64px)] w-72 flex-shrink-0 md:block">
                <Sidebar nav={nav} />
              </div>
              <main className="flex-1 px-6 py-8">
                <div className="mb-6 md:hidden">
                  <Sidebar nav={nav} className="border border-slate-800" />
                </div>
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}

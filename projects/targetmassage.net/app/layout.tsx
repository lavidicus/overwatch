import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Target Massage - Deep Tissue Massage & Release Therapy",
  description:
    "Professional deep tissue massage and release therapy by David Martin, Licensed Massage Therapist with 24+ years of experience. Located at 5615 Jackson Street Ext Bldg N. Call (318) 442-1100.",
  keywords:
    "massage therapy, deep tissue massage, release therapy, David Martin, licensed massage therapist, pain relief, muscle pain",
  openGraph: {
    title: "Target Massage - Deep Tissue Massage & Release Therapy",
    description:
      "Professional massage therapy by David Martin, LMT with 24+ years experience.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-secondary text-charcoal antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

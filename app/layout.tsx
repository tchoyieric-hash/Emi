import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EMi — Un lien, une histoire, une famille",
  description: "Un lien, une histoire, une famille. Partage tes moments et reste proche de ta communauté avec EMi.",
  applicationName: "EMi",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "EMi" },
};

export const viewport: Viewport = {
  themeColor: "#5520c9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
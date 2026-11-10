import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Defar ko : trouve un ouvrier près de chez toi",
  description:
    "Électricien, soudeur, maçon, mécanicien, enseignant… trouve un ouvrier de confiance et contacte-le par WhatsApp ou par téléphone.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Defar ko", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1b1fa8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#f3f6fd] pb-20 shadow-xl">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}

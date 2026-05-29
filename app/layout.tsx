import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { AppShell } from "@/components/AppShell";
import "@/styles/global.css";
import "@/styles/components.css";
import "@/app/pages.css";
import "@/app/auth.css";
import "@/app/admin.css";

export const metadata: Metadata = {
  title: "PaySafe — Escrow Mobile Money",
  description: "Tiers de confiance pour Mobile Money en Afrique de l'Ouest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}

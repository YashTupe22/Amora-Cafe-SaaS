import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppStoreProvider } from "@/lib/appStore";
import { LanguageProvider } from "@/lib/i18n";
import SwRegister from "@/components/SwRegister";

export const metadata: Metadata = {
  title: "Synplix — Management",
  description: "Business management platform by Synplix — bills, menu, staff & more.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Synplix",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppStoreProvider>
          <LanguageProvider>
            <SwRegister />
            {children}
          </LanguageProvider>
        </AppStoreProvider>
      </body>
    </html>
  );
}

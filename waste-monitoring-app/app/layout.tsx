import type {
  Metadata,
  Viewport,
} from "next";

import "./globals.css";

import AuthGate from "@/components/AuthGate";
import AppNavigation from "@/components/AppNavigation";
import PWARegister from "@/components/PWARegister";
import ThemeToggle from "@/components/ThemeToggle";
import SidebarNotificationBell from "@/components/SidebarNotificationBell";

const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title:
    "Waste Monitoring | PT.DREAMWEAR",

  description:
    "Sistem monitoring limbah dan kebersihan PT.DREAMWEAR",

  applicationName:
    "Waste Monitoring",

  manifest:
    `${basePath}/manifest.webmanifest`,

  icons: {
    icon: [
      {
        url:
          `${basePath}/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        url:
          `${basePath}/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
      },
    ],

    apple: [
      {
        url:
          `${basePath}/apple-touch-icon.png`,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },

  appleWebApp: {
    capable: true,
    title:
      "Waste Monitoring",
    statusBarStyle:
      "default",
  },
};

export const viewport: Viewport = {
  width:
    "device-width",

  initialScale: 1,

  viewportFit:
    "cover",

  themeColor:
    "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="bg-slate-100 text-slate-900 antialiased">

        <PWARegister />

        <ThemeToggle />


        <AuthGate>
          <AppNavigation />
          <SidebarNotificationBell />

          <div className="min-h-screen pb-24 md:pb-0 md:pl-64">
            {children}
          </div>
        </AuthGate>

      </body>
    </html>
  );
}

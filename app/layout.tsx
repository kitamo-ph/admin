import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://admin.kitamo.online",
  ),
  title: {
    default: "KitaMo Admin",
    template: "%s · KitaMo Admin",
  },
  description:
    "KitaMo's internal super-admin site: reason-logged, time-limited, read-only access to businesses.",
  applicationName: "KitaMo Admin Platform",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  icons: {
    icon: "/kitamo-mark.png",
    shortcut: "/kitamo-mark.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f7f6f2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body>{children}</body>
    </html>
  );
}

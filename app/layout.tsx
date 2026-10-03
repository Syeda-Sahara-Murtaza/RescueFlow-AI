import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import {RescueProvider} from "@/components/rescue/provider";

export const metadata: Metadata = {
  title: "RescueFlow AI — Emergency Command Center",
  description: "One connected response workspace: reports, incidents, missions, resources, and live operational context.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><RescueProvider>{children}</RescueProvider></body>
    </html>
  );
}

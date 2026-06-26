import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "TripMuse - AI Travel Planner",
    template: "%s | TripMuse",
  },

  description:
    "Turn your destination, travel days and budget into a personalized AI itinerary you can save, collect and share.",

  applicationName: "TripMuse",

  keywords: [
    "TripMuse",
    "AI travel planner",
    "AI itinerary generator",
    "trip planner",
    "travel itinerary",
    "travel journal",
  ],

  authors: [
    {
      name: "TripMuse",
    },
  ],

  creator: "TripMuse",
  publisher: "TripMuse",
  category: "Travel",

  openGraph: {
    type: "website",
    siteName: "TripMuse",
    title: "TripMuse - AI Travel Planner",
    description:
      "Plan smarter and travel happier with a personalized AI itinerary.",
    locale: "en_US",
  },

  twitter: {
    card: "summary",
    title: "TripMuse - AI Travel Planner",
    description:
      "Turn your travel ideas into a personalized AI itinerary.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  appleWebApp: {
    capable: true,
    title: "TripMuse",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#fafafa",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#fafafa] text-gray-950">
        {children}
      </body>
    </html>
  );
}

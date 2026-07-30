import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito, Caveat } from "next/font/google";
import { AccentSync } from "@/components/AccentSync";
import "./globals.css";

const APP_NAME = "KidsKatalog";
const APP_DEFAULT_TITLE = "KidsKatalog — Browse toys. Build a Kart.";
const APP_TITLE_TEMPLATE = "%s · KidsKatalog";
const APP_DESCRIPTION =
  "A kid-friendly virtual toy catalog. Browse, save favorites to a Kart, and email mom or dad a PDF with affiliate buy links.";

const display = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const body = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const script = Caveat({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    // Transparent status bar so the header gradient shows through in standalone PWA
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2bb8a8" },
    { media: "(prefers-color-scheme: dark)", color: "#2bb8a8" },
  ],
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-accent="both"
      className={`${display.variable} ${body.variable} ${script.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AccentSync />
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito, Caveat } from "next/font/google";
import { AccentSync } from "@/components/AccentSync";
import { StandaloneClass } from "@/components/StandaloneClass";
import { ROUTE_CHANGE_BOOT_SCRIPT } from "@/lib/route-change";
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
      className={`${display.variable} ${body.variable} ${script.variable} h-full overflow-hidden antialiased`}
    >
      <body className="flex h-full min-h-0 flex-col overflow-hidden">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=window.matchMedia('(display-mode: standalone)').matches;var ios='standalone' in navigator&&navigator.standalone===true;if(m||ios)document.documentElement.setAttribute('data-standalone','true');}catch(e){}})();`,
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: ROUTE_CHANGE_BOOT_SCRIPT }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var raw=localStorage.getItem('kidskatalog-accent');if(!raw)return;var data=JSON.parse(raw);var aud=data&&data.state&&data.state.audience;if(aud==='boys')document.documentElement.dataset.accent='boys';else if(aud==='girls')document.documentElement.dataset.accent='girls';else document.documentElement.dataset.accent='both';}catch(e){}})();`,
          }}
        />
        <StandaloneClass />
        <AccentSync />
        {children}
      </body>
    </html>
  );
}

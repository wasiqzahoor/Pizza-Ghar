import "./globals.css";
import GlobalPopup from "@/components/GlobalPopup";

const SITE_URL = "https://pizza-ghar-pos.vercel.app";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Pizza Ghar POS — Fast Food Restaurant Management",
    template: "%s | Pizza Ghar POS",
  },
  description:
    "Pizza Ghar POS is a complete fast food restaurant management system: billing, kitchen display, inventory, recipes, reports and printer integration — fast, reliable and easy to use.",
  keywords: [
    "restaurant POS",
    "fast food POS",
    "pizza POS",
    "billing software",
    "kitchen display system",
    "inventory management",
    "cafe POS system",
    "Pakistan POS",
    "Pizza Ghar",
  ],
  applicationName: "Pizza Ghar POS",
  authors: [{ name: "NewAiTechSofts PVT LTD" }],
  creator: "NewAiTechSofts PVT LTD",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Pizza Ghar POS",
    title: "Pizza Ghar POS — Fast Food Restaurant Management",
    description:
      "Complete fast food restaurant management: billing, kitchen display, inventory, reports and auto-printing.",
    locale: "en_US",
    images: [
      {
        url: "/icon-192.png",
        width: 192,
        height: 192,
        alt: "Pizza Ghar POS",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Pizza Ghar POS — Fast Food Restaurant Management",
    description:
      "Complete fast food restaurant management: billing, kitchen display, inventory, reports and auto-printing.",
    images: ["/icon-192.png"],
  },
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ef4444",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <GlobalPopup />
        {children}
      </body>
    </html>
  );
}

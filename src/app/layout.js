import "./globals.css";
import GlobalPopup from "@/components/GlobalPopup";

export const metadata = {
  title: "Pizza Ghar POS",
  description: "Restaurant POS System",
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

import "./globals.css";
import GlobalPopup from "@/components/GlobalPopup";

export const metadata = {
  title: "Pizza Ghar POS",
  description: "Restaurant POS System",
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

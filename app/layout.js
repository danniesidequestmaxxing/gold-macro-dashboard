import "./globals.css";

export const metadata = {
  title: "Gold Macro Regime Dashboard",
  description: "Real-time XAU/USD regime scoring matrix with FRED + AI-powered macro data",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

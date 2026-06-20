import "./globals.css";

export const metadata = {
  title: "BlokWeather Ai",
  description: "Real-time environmental monitoring and fleet management dashboard powered by AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}

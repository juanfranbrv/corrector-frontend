// src/app/layout.tsx
import type { Metadata } from "next";
import ThemeRegistry from "@/components/ThemeRegistry"; // Ajusta la ruta si es necesario
import "./globals.css"; // Tailwind se importa aquí

export const metadata: Metadata = {
  title: "English Corrector App",
  description: "AI-powered English essay correction assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry options={{ key: 'mui' }}>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
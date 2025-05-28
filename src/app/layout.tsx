// src/app/layout.tsx
import type { Metadata } from "next";
import ThemeRegistry from "@/components/ThemeRegistry";
import "./globals.css";
import Link from 'next/link'; // Importar Link
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

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
    <html lang="en" suppressHydrationWarning={true}>
      <body>
        <ThemeRegistry options={{ key: 'mui' }}>
          {/* Barra de navegación simple de ejemplo */}
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                  English Corrector
                </Link>
              </Typography>
              <Button color="inherit" component={Link} href="/auth">
                Login/Signup
              </Button>
            </Toolbar>
          </AppBar>
          <main>{children}</main> {/* Envuelve el contenido principal */}
        </ThemeRegistry>
      </body>
    </html>
  );
}
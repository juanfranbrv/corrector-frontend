// src/app/layout.tsx
import type { Metadata } from "next";
import { Mona_Sans } from "next/font/google"; // Importar Mona Sans
import ThemeRegistry from "@/components/ThemeRegistry";
import "./globals.css";
import Link from 'next/link';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
// Quitamos Button de aquí, lo manejaremos en un componente NavUser
// import Button from '@mui/material/Button';

import { AuthProvider } from "@/context/AuthContext"; // Importar AuthProvider
import NavUserStatus from "@/components/NavUserStatus"; // Crearemos este componente

const monaSans = Mona_Sans({ weight: ['300', '400', '700'], subsets: ["latin"] }); // Configurar Mona Sans

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
      <body className={monaSans.className}> {/* Aplicar la clase de Mona Sans */}
        <AuthProvider> {/* Envolver con AuthProvider */}
          <ThemeRegistry options={{ key: 'mui' }}>
            <AppBar position="static">
              <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                  <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                    English Corrector
                  </Link>
                </Typography>
                <NavUserStatus /> {/* Componente para mostrar estado de login/logout */}
              </Toolbar>
            </AppBar>
            <main>{children}</main>
          </ThemeRegistry>
        </AuthProvider> {/* Cerrar AuthProvider */}
      </body>
    </html>
  );
}

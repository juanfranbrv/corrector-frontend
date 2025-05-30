// src/app/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Nuestro AuthContext
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

// Interfaz para el TokenPayload que esperamos del backend
interface UserProfileData {
  sub: string; // User ID
  email?: string;
  // Añade otros campos que definiste en TokenPayload en auth_utils.py
}

export default function DashboardPage() {
  const { user, session, loading: authLoading } = useAuth(); // Renombrar loading a authLoading para evitar colisión
  const router = useRouter();

  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Efecto para proteger la ruta
  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user || !session) {
      router.replace('/auth');
    }
  }, [user, session, authLoading, router]);

  const fetchUserProfile = async () => {
    if (!session?.access_token) {
      setProfileError("No hay token de acceso disponible.");
      return;
    }

    setIsLoadingProfile(true);
    setProfileError(null);
    setProfileData(null);

    try {
      const response = await fetch('http://localhost:8000/users/me/', { // URL del backend
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('No autorizado. Tu sesión podría haber expirado o el token es inválido.');
        }
        const errorData = await response.text();
        throw new Error(`Error del servidor [${response.status}]: ${errorData || response.statusText}`);
      }

      const data: UserProfileData = await response.json();
      setProfileData(data);
    } catch (e: any) {
      console.error("Error fetching user profile:", e);
      setProfileError(e.message);
    } finally {
      setIsLoadingProfile(false);
    }
  };


  // Si la autenticación aún está cargando o no hay usuario, mostrar loader o nada
  if (authLoading || (!user && !authLoading)) { // Mostrar loader si auth está cargando o si no hay usuario y auth ya terminó de cargar (para permitir redirección)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Si no hay usuario después de que authLoading es false, el useEffect ya debería haber redirigido.
  // Pero por si acaso, para evitar renderizar el dashboard:
  if (!user || !session) {
      return null; // O un mensaje de "Redirigiendo..."
  }


  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard del Profesor
        </Typography>
        <Typography variant="body1" gutterBottom>
          ¡Bienvenido, {user.email}! Esta es tu área personal.
        </Typography>

        <Button
          variant="contained"
          onClick={fetchUserProfile}
          disabled={isLoadingProfile}
          sx={{ my: 2 }}
        >
          {isLoadingProfile ? <CircularProgress size={24} /> : 'Cargar Mi Perfil (desde Backend)'}
        </Button>

        {profileError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Error al cargar perfil: {profileError}
          </Alert>
        )}

        {profileData && (
          <Box sx={{ mt: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
            <Typography variant="h6">Datos del Perfil (desde API Backend):</Typography>
            <Typography>User ID (sub): {profileData.sub}</Typography>
            {profileData.email && <Typography>Email (del token): {profileData.email}</Typography>}
            {/* Muestra otros campos de profileData si los tienes */}
          </Box>
        )}

        <Typography variant="body2" sx={{ mt: 3 }}>
          Aquí podrás gestionar tus exámenes y correcciones.
        </Typography>
      </Paper>
    </Container>
  );
}
// src/app/dashboard/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';

export default function DashboardPage() {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si la carga de sesión aún no ha terminado, no hagas nada todavía.
    if (loading) {
      return;
    }

    // Si no hay usuario ni sesión, y la carga ha terminado, redirigir a /auth.
    if (!user || !session) {
      router.replace('/auth'); // Usar replace para no añadir al historial de navegación
    }
  }, [user, session, loading, router]);

  // Mostrar un loader mientras se verifica la sesión o se redirige.
  if (loading || (!user || !session)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Si el usuario está autenticado, mostrar el contenido del dashboard.
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard del Profesor
        </Typography>
        <Typography variant="body1">
          ¡Bienvenido, {user.email}! Esta es tu área personal.
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Aquí podrás gestionar tus exámenes y correcciones.
        </Typography>
        {/* Aquí iría el contenido real del dashboard más adelante */}
      </Paper>
    </Container>
  );
}
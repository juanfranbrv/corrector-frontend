// src/app/auth/page.tsx
'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation'; // Para redireccionar después del login/signup
import { supabase } from '@/lib/supabaseClient'; // Nuestro cliente Supabase

import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import GoogleIcon from '@mui/icons-material/Google'; // Icono de Google

// Interfaz para el panel de pestañas
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0); // 0 para Login, 1 para Signup

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError(null); // Limpiar errores al cambiar de pestaña
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccessMessage('¡Inicio de sesión exitoso! Redirigiendo...');
      // Redirigir al dashboard o a la página principal después del login
      // Por ahora, redirigiremos a la página principal '/'
      router.push('/');
      // O podrías hacer router.refresh() si quieres que el layout detecte el cambio de sesión
    }
    setLoading(false);
  };

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Opciones adicionales, como redirección después de la confirmación (si está activada)
      // options: {
      //   emailRedirectTo: `${window.location.origin}/`,
      // },
    });

    if (error) {
      setError(error.message);
    } else {
      // data.user será null si tienes la confirmación de email activada y el usuario no ha confirmado aún.
      // data.session será null hasta que el usuario confirme (si la confirmación está activada).
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        // Esto puede ocurrir si la confirmación de email está desactivada y el usuario ya existe pero no está confirmado.
        // O si hay alguna otra política de Supabase que impida el login inmediato.
        setError("El usuario podría ya existir o requiere confirmación.");
      } else if (data.user?.role === "authenticated") {
        setSuccessMessage(
          '¡Registro exitoso! Revisa tu email para confirmar (si es necesario) o inicia sesión.'
        );
        // Si la confirmación de email está DESACTIVADA, el usuario ya está logueado.
        // Podrías redirigir aquí también.
        // Si está ACTIVADA, el usuario necesita confirmar.
        // Por ahora, simplemente mostramos un mensaje y dejamos que el usuario inicie sesión.
        setTabValue(0); // Cambiar a la pestaña de Login
      } else {
         // Si la confirmación de email está activada, Supabase envía un email de confirmación
        setSuccessMessage('¡Registro enviado! Por favor, revisa tu email para confirmar tu cuenta.');
      }
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`, // A dónde redirigir después del login con Google
        // queryParams: {
        //   access_type: 'offline',
        //   prompt: 'consent',
        // },
      },
    });

    if (error) {
      setError(`Error con Google Login: ${error.message}`);
      setLoading(false);
    }
    // Si no hay error, Supabase redirigirá al usuario a Google y luego de vuelta.
    // El setLoading(false) no se alcanzará aquí si la redirección ocurre.
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 2 }}>
        <Typography component="h1" variant="h5" sx={{ mt: 2 }}>
          Acceso de Profesores
        </Typography>

        <Tabs value={tabValue} onChange={handleTabChange} aria-label="Login y Signup tabs" centered sx={{my: 2}}>
          <Tab label="Iniciar Sesión" id="auth-tab-0" aria-controls="auth-tabpanel-0" />
          <Tab label="Registrarse" id="auth-tab-1" aria-controls="auth-tabpanel-1" />
        </Tabs>

        <TabPanel value={tabValue} index={0}> {/* Panel de Login */}
          <Box component="form" onSubmit={handleLogin} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="login-email"
              label="Correo Electrónico"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="login-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 1 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Iniciar Sesión'}
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}> {/* Panel de Signup */}
          <Box component="form" onSubmit={handleSignup} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="signup-email"
              label="Correo Electrónico"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="signup-password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 1 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Registrarse'}
            </Button>
          </Box>
        </TabPanel>

        <Box sx={{width: '100%', px:3, mb: 2}}>
            <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleLogin}
                disabled={loading}
                sx={{ mt: 1 }}
            >
                {loading ? <CircularProgress size={24} /> : `Continuar con Google`}
            </Button>
        </Box>


        {error && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
            {successMessage}
          </Alert>
        )}
      </Paper>
    </Container>
  );
}
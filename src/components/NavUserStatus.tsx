// src/components/NavUserStatus.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useAuth } from '@/context/AuthContext'; // Nuestro hook useAuth

export default function NavUserStatus() {
  const { user, session, loading, signOut } = useAuth();

  if (loading) {
    return <CircularProgress size={24} color="inherit" />;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {user && session ? (
        <>
          <Typography variant="body2" sx={{ color: 'white' }}>
            {user.email}
          </Typography>
          <Button color="inherit" onClick={signOut}>
            Logout
          </Button>
        </>
      ) : (
        <Button color="inherit" component={Link} href="/auth">
          Login / Signup
        </Button>
      )}
    </Box>
  );
}
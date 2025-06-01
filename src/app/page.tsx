// src/app/page.tsx
'use client';

import React from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Importar íconos
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import SchoolIcon from '@mui/icons-material/School';
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const Feature = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <Paper elevation={0} sx={{ p: 3, height: '100%', backgroundColor: 'transparent', textAlign: 'center' }}>
    <Box sx={{ color: 'primary.main', mb: 2 }}>
      {icon}
    </Box>
    <Typography variant="h6" component="h3" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {description}
    </Typography>
  </Paper>
);

const ProcessStep = ({ number, title, description }: { number: number, title: string, description: string }) => (
  <Box sx={{ 
    display: 'flex', 
    alignItems: 'flex-start', 
    gap: 2,
    p: 2,
    borderRadius: 1,
    '&:hover': {
      bgcolor: 'rgba(33, 150, 243, 0.04)'
    }
  }}>
    <Box sx={{ 
      minWidth: 40, 
      height: 40, 
      borderRadius: '50%', 
      bgcolor: 'primary.main',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.25rem',
      fontWeight: 'bold'
    }}>
      {number}
    </Box>
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem' }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Box>
  </Box>
);

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleGetStarted = () => {
    router.push(user ? '/dashboard' : '/auth');
  };

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* Hero Section */}
      <Box 
        sx={{
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          color: 'white',
          pt: { xs: 8, md: 12 },
          pb: { xs: 8, md: 12 },
          position: 'relative',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: 4 }}>
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="h2" 
                component="h1" 
                sx={{ 
                  fontWeight: 700,
                  mb: 3,
                  fontSize: { xs: '2.5rem', md: '3.5rem' }
                }}
              >
                Asistente IA para Corrección de Redacciones en Inglés
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  mb: 4,
                  opacity: 0.9,
                  fontWeight: 300
                }}
              >
                Simplifica la corrección de redacciones manuscritas con IA y criterios Cambridge
              </Typography>
              <Button 
                variant="contained" 
                size="large"
                onClick={handleGetStarted}
                sx={{
                  backgroundColor: 'white',
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                  },
                  px: 4,
                  py: 1.5,
                }}
              >
                {user ? 'Ir al Dashboard' : 'Prueba Gratuita para Profesores'}
              </Button>
            </Box>
            <Box sx={{ flex: 1, position: 'relative', height: { xs: '300px', md: '500px' }, width: '100%' }}>
              <Image
                src="/file.svg"
                alt="English essay correction illustration"
                fill
                style={{ objectFit: 'contain' }}
                priority
              />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Typography 
          variant="h3" 
          component="h2" 
          align="center" 
          sx={{ mb: 2, fontWeight: 600 }}
        >
          Diseñado para Profesores de Inglés
        </Typography>
        <Typography 
          variant="h6" 
          align="center" 
          color="text.secondary" 
          sx={{ mb: 8, maxWidth: '800px', mx: 'auto' }}
        >
          Ahorra tiempo en la corrección mientras proporcionas feedback detallado y profesional a tus estudiantes
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4 }}>
          <Feature
            icon={<AutoStoriesIcon sx={{ fontSize: 40 }} />}
            title="Criterios Cambridge"
            description="Correcciones basadas en estándares reconocidos internacionalmente para evaluación de redacciones"
          />
          <Feature
            icon={<SchoolIcon sx={{ fontSize: 40 }} />}
            title="Optimizado para Educación"
            description="Interfaz diseñada específicamente para instituciones educativas y profesores de inglés"
          />
          <Feature
            icon={<PsychologyAltIcon sx={{ fontSize: 40 }} />}
            title="IA Avanzada"
            description="Tecnología de visión artificial para transcripción precisa de texto manuscrito"
          />
        </Box>
      </Container>

      {/* Process Section */}
      <Box sx={{ bgcolor: 'grey.50', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <Typography 
            variant="h3" 
            component="h2" 
            align="center" 
            sx={{ mb: 8, fontWeight: 600 }}
          >
            Proceso Simple y Eficiente
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <ProcessStep
              number={1}
              title="Digitaliza la Redacción"
              description="Escanea o fotografía la redacción manuscrita del estudiante"
            />
            <ProcessStep
              number={2}
              title="Sube el Archivo"
              description="Sube la imagen a la plataforma con un solo clic"
            />
            <ProcessStep
              number={3}
              title="Obtén la Transcripción"
              description="La IA transcribe automáticamente el texto manuscrito"
            />
            <ProcessStep
              number={4}
              title="Recibe la Evaluación"
              description="Obtén un análisis detallado basado en criterios Cambridge"
            />
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <Paper 
            elevation={3}
            sx={{ 
              p: { xs: 3, md: 6 }, 
              textAlign: 'center',
              borderRadius: 2,
              background: 'linear-gradient(to right bottom, #ffffff, #f5f5f5)'
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h3" gutterBottom>
              Optimiza tu Tiempo de Corrección
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4, maxWidth: '600px', mx: 'auto' }}>
              Únete a cientos de profesores que ya están ahorrando horas de trabajo mientras proporcionan feedback más detallado a sus estudiantes.
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              onClick={handleGetStarted}
              sx={{ px: 4, py: 1.5 }}
            >
              {user ? 'Ir al Dashboard' : 'Comenzar Prueba Gratuita'}
            </Button>
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              Sin compromiso - Cancela en cualquier momento
            </Typography>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
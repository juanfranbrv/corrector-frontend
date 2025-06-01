// src/app/upload-exam/page.tsx
'use client';

import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Correcto para App Router
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Definir la URL base de la API consistentemente
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function UploadExamPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) {
      router.replace('/auth');
    }
  }, [user, session, authLoading, router]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMessage(null);
    setSelectedFile(null);
    // No es necesario revocar previewUrl aquí si se hace en el useEffect de selectedFile

    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecciona un archivo de imagen válido.');
        event.target.value = ''; // Limpiar el input para permitir re-seleccionar el mismo archivo
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`El archivo es demasiado grande. Máximo ${MAX_FILE_SIZE_MB} MB.`);
        event.target.value = '';
        return;
      }
      setSelectedFile(file);
    } else {
      // Si no se seleccionan archivos (ej. se cancela el diálogo), limpiar
      setSelectedFile(null);
    }
  };

  // Efecto para crear y limpiar la URL de vista previa del objeto
  useEffect(() => {
    let objectUrl: string | null = null;
    if (selectedFile) {
      objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(null); // Limpiar preview si no hay archivo seleccionado
    }

    // Función de limpieza
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedFile]); // Este efecto se ejecuta cada vez que selectedFile cambia

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Por favor, selecciona un archivo.');
      return;
    }
    if (!session?.access_token) {
      setError('No autenticado. Por favor, inicia sesión de nuevo.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_URL}/exam_papers/upload_image/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorDetail = responseData.detail || response.statusText || 'Error desconocido del servidor';
        throw new Error(errorDetail);
      }

      setSuccessMessage(
        `¡"${responseData.filename || selectedFile.name}" subida con éxito! ID: ${
          responseData.id
        }. Redirigiendo al dashboard...`
      );

      // Limpiar estado del formulario
      setSelectedFile(null); // Esto también limpiará previewUrl a través del useEffect
      const fileInput = document.getElementById('exam-image-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = ''; // Limpiar el valor del input de archivo

      // Redirigir al dashboard después de un breve retraso
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500); // 1.5 segundos de retraso

    } catch (e: unknown) {
      const err = e as Error;
      console.error('Error al subir:', err);
      setError(err.message || 'Error desconocido al procesar la subida.');
    } finally {
      setIsLoading(false);
    }
  };

  // Manejo de carga de autenticación y redirección si no está autenticado
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <CircularProgress />
      </Box>
    );
  }
  // Si después de cargar auth ya no hay usuario, no renderizar nada o redirigir (ya se hace en useEffect)
  if (!user && !authLoading) {
      return null; // O un mensaje de "Necesitas iniciar sesión"
  }


  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Subir Nueva Redacción
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<CloudUploadIcon />}
            sx={{ mb: 2, py: 1.5, textTransform: 'none' }}
          >
            Seleccionar Imagen (Máx. {MAX_FILE_SIZE_MB} MB)
            <input
              id="exam-image-upload"
              type="file"
              hidden
              accept="image/*"
              onChange={handleFileChange}
            />
          </Button>

          {selectedFile && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>
              Archivo: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
            </Typography>
          )}

          {previewUrl && (
            <Box
              sx={{
                mb: 2,
                border: '1px dashed grey',
                p: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center', // Para centrar la imagen si es más pequeña que el contenedor
                position: 'relative',
                width: '100%',
                minHeight: '200px', // Altura mínima para el contenedor de vista previa
                maxHeight: '400px', // Altura máxima para que no sea demasiado grande
                overflow: 'hidden', // Para contener la imagen
              }}
            >
              <Image
                src={previewUrl}
                alt="Vista previa de la redacción"
                fill // 'fill' necesita un contenedor con position: 'relative' y dimensiones definidas
                style={{ objectFit: 'contain', borderRadius: '4px' }} // 'contain' para que se vea completa
                priority // Si es la imagen principal de la vista
              />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading || !selectedFile}
            sx={{ mt: 2, py: 1.5 }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Subir Redacción'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
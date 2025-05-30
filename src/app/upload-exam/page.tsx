// src/app/upload-exam/page.tsx
'use client';

import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Nuestro AuthContext

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
// import TextField from '@mui/material/TextField'; // Descomentar si se usa el título
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const MAX_FILE_SIZE_MB = 5; // Límite de 5 MB
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function UploadExamPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // const [title, setTitle] = useState<string>(''); // Descomentar si se usa el título
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Proteger la ruta: redirigir si no está autenticado
  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) {
      router.replace('/auth');
    }
  }, [user, session, authLoading, router]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null); // Limpiar errores anteriores al seleccionar nuevo archivo
    setSuccessMessage(null); // Limpiar mensajes de éxito anteriores
    setSelectedFile(null); // Limpiar selección previa
    setPreviewUrl(null);   // Limpiar vista previa previa

    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      // 1. Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecciona un archivo de imagen válido (jpg, png, gif, webp, etc.).');
        event.target.value = ''; // Limpiar el input file
        return; 
      }

      // 2. Validar tamaño del archivo
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`El archivo es demasiado grande. El tamaño máximo permitido es de ${MAX_FILE_SIZE_MB} MB.`);
        event.target.value = ''; // Limpiar el input file
        return;
      }

      // Si pasa ambas validaciones
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Crear URL para vista previa
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Por favor, selecciona un archivo para subir.');
      return;
    }
    if (!session?.access_token) {
      setError('No estás autenticado. Por favor, inicia sesión de nuevo.');
      // Podrías redirigir a /auth aquí también
      // router.push('/auth');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    // if (title) formData.append('title', title); // Descomentar si se usa el título

    try {
      const response = await fetch('http://localhost:8000/exam_papers/upload_image/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          // 'Content-Type' es establecido automáticamente por el navegador para FormData
        },
        body: formData,
      });

      const responseData = await response.json(); // Intentar parsear JSON siempre

      if (!response.ok) {
        // Usar el mensaje de 'detail' del backend si está disponible, sino un mensaje genérico
        throw new Error(responseData.detail || `Error del servidor: ${response.status}`);
      }

      setSuccessMessage(`¡Redacción "${responseData.filename}" subida exitosamente! ID: ${responseData.id}`);
      setSelectedFile(null);
      setPreviewUrl(null);
      // setTitle(''); // Limpiar título
      // Limpiar el valor del input de archivo para permitir subir el mismo archivo de nuevo si se desea
      const fileInput = document.getElementById('exam-image-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      // Opcional: Redirigir o mostrar más feedback
      // router.push('/dashboard'); 
    } catch (e: any) {
      console.error('Error al subir la redacción:', e);
      setError(e.message || "Ocurrió un error desconocido al subir el archivo.");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || (!user && !authLoading && !router.asPath.startsWith('/auth'))) { // Evitar loader si ya estamos en /auth o si la redirección está en curso
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!user || !session) { // Si después de la carga no hay usuario, el useEffect ya debería haber redirigido.
      return null; 
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Subir Nueva Redacción
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          {/* 
          <TextField
            margin="normal"
            fullWidth
            id="title"
            label="Título de la Redacción (Opcional)"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          */}

          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<CloudUploadIcon />}
            sx={{ mb: 2, py: 1.5, textTransform: 'none' }} // textTransform para evitar mayúsculas
          >
            Seleccionar Imagen (Máx. {MAX_FILE_SIZE_MB} MB)
            <input
              id="exam-image-upload" // Añadido ID para poder limpiarlo
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
            <Box sx={{ mb: 2, border: '1px dashed grey', p:1, display: 'flex', justifyContent: 'center', borderRadius: 1 }}>
              <img 
                src={previewUrl} 
                alt="Vista previa de la redacción" 
                style={{ maxHeight: '300px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px' }} 
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
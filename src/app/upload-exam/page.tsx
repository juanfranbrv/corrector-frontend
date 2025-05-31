// src/app/upload-exam/page.tsx
'use client';

import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image'; // Usar next/image

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
    if (!user || !session) router.replace('/auth');
  }, [user, session, authLoading, router]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null); setSuccessMessage(null); setSelectedFile(null); setPreviewUrl(null);
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecciona un archivo de imagen válido.');
        event.target.value = ''; return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`El archivo es demasiado grande. Máximo ${MAX_FILE_SIZE_MB} MB.`);
        event.target.value = ''; return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) { setError('Por favor, selecciona un archivo.'); return; }
    if (!session?.access_token) { setError('No autenticado.'); return; }
    setIsLoading(true); setError(null); setSuccessMessage(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://localhost:8000'}/exam_papers/upload_image/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.detail || `Error: ${response.status}`);
      setSuccessMessage(`¡"${responseData.filename}" subida! ID: ${responseData.id}`);
      setSelectedFile(null); setPreviewUrl(null);
      const fileInput = document.getElementById('exam-image-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (e: unknown) { // Corregido: e: unknown
      const err = e as Error; // Type assertion
      console.error('Error al subir:', err);
      setError(err.message || "Error desconocido.");
    } finally { setIsLoading(false); }
  };

  if (authLoading || (!user && !authLoading && typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth'))) {
    return (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}><CircularProgress /></Box>);
  }
  if (!user || !session) return null;

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">Subir Nueva Redacción</Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <Button variant="outlined" component="label" fullWidth startIcon={<CloudUploadIcon />} sx={{ mb: 2, py: 1.5, textTransform: 'none' }}>
            Seleccionar Imagen (Máx. {MAX_FILE_SIZE_MB} MB)
            <input id="exam-image-upload" type="file" hidden accept="image/*" onChange={handleFileChange} />
          </Button>
          {selectedFile && (<Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>Archivo: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</Typography>)}
          {previewUrl && (
            <Box sx={{ mb: 2, border: '1px dashed grey', p:1, display: 'flex', justifyContent: 'center', position: 'relative', width: '100%', minHeight: '200px', maxHeight: '350px' }}>
              <Image src={previewUrl} alt="Vista previa de la redacción" fill style={{ objectFit: 'contain', borderRadius: '4px' }} />
            </Box>
          )}
          {error && (<Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>)}
          {successMessage && (<Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>)}
          <Button type="submit" fullWidth variant="contained" disabled={isLoading || !selectedFile} sx={{ mt: 2, py: 1.5 }}>
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Subir Redacción'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
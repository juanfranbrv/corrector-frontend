// src/app/upload-exam/page.tsx
'use client';

import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField'; // <--- NUEVA IMPORTACIÓN
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
// import Grid from '@mui/material/Grid'; // Descomentar si usas el grid de previsualizaciones

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_TOTAL_FILES = 5;
const API_BACKEND_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://127.0.0.1:8000'; // Asegúrate de usar la variable correcta

interface PreviewableFile {
  file: File;
  previewUrl: string;
}

export default function UploadExamPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [selectedFileObjects, setSelectedFileObjects] = useState<PreviewableFile[]>([]);
  const [essayTitle, setEssayTitle] = useState<string>(''); // <--- NUEVO ESTADO PARA EL TÍTULO
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) router.replace('/auth');
  }, [user, session, authLoading, router]);

  useEffect(() => {
    return () => {
      selectedFileObjects.forEach(f => URL.revokeObjectURL(f.previewUrl));
    };
  }, [selectedFileObjects]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    // No limpiar successMessage aquí para que el usuario lo vea si acaba de tener éxito.
    // Se limpiará al iniciar una nueva subida.

    if (event.target.files && event.target.files.length > 0) {
      const filesArray = Array.from(event.target.files);
      const newFileObjects: PreviewableFile[] = [...selectedFileObjects];

      if (newFileObjects.length + filesArray.length > MAX_TOTAL_FILES) {
        setError(`Puedes subir un máximo de ${MAX_TOTAL_FILES} páginas por ensayo.`);
        event.target.value = '';
        return;
      }

      for (const file of filesArray) {
        if (!file.type.startsWith('image/')) {
          setError(`Archivo '${file.name}' no es una imagen. Solo se añadirán imágenes.`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          setError(`Archivo '${file.name}' es demasiado grande (Máx ${MAX_FILE_SIZE_MB}MB).`);
          continue;
        }
        if (!newFileObjects.some(fo => fo.file.name === file.name && fo.file.size === file.size)) {
          newFileObjects.push({ file, previewUrl: URL.createObjectURL(file) });
        }
      }
      setSelectedFileObjects(newFileObjects);
    }
    event.target.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    const fileObjectToRemove = selectedFileObjects[indexToRemove];
    if (fileObjectToRemove) {
      URL.revokeObjectURL(fileObjectToRemove.previewUrl);
    }
    setSelectedFileObjects(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedFileObjects.length === 0) {
      setError('Por favor, selecciona al menos un archivo de imagen.');
      return;
    }
    // Opcional: Validar que el título no esté vacío si lo haces obligatorio
    // if (!essayTitle.trim()) {
    //   setError('Por favor, introduce un título para el ensayo.');
    //   return;
    // }
    if (!session?.access_token) {
      setError('No autenticado. Por favor, inicia sesión de nuevo.');
      // Podrías redirigir a /auth aquí
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    selectedFileObjects.forEach(fileObject => {
      formData.append('files', fileObject.file);
    });

    // Añadir el título del ensayo al FormData si se proporcionó
    if (essayTitle.trim()) {
      formData.append('essay_title', essayTitle.trim()); // <--- ENVIAR EL TÍTULO
    }

    try {
      const response = await fetch(`${API_BACKEND_URL}/exam_papers/upload_multiple_images/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          // 'Content-Type' NO se establece manualmente para FormData con archivos; el navegador lo hace.
        },
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorDetail = responseData.detail || response.statusText || 'Error desconocido del servidor';
        throw new Error(errorDetail);
      }

      setSuccessMessage(
        `¡Ensayo "${responseData.filename || 'Ensayo'}" (${selectedFileObjects.length} pág.) subido! ID: ${responseData.id}. Redirigiendo...`
      );
      
      selectedFileObjects.forEach(f => URL.revokeObjectURL(f.previewUrl));
      setSelectedFileObjects([]);
      setEssayTitle(''); // Limpiar el título del ensayo

      setTimeout(() => {
        router.push('/dashboard');
      }, 2500); // Un poco más de tiempo para leer el mensaje

    } catch (e: unknown) {
      const err = e as Error;
      console.error('Error al subir:', err);
      setError(err.message || 'Error desconocido al procesar la subida.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}><CircularProgress /></Box>);
  }
  if (!user && !authLoading) {
      // Podrías mostrar un mensaje o simplemente no renderizar nada si se va a redirigir.
      // router.replace('/auth') ya está en el useEffect.
      return null; 
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Subir Páginas del Ensayo
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          
          {/* CAMPO PARA EL TÍTULO DEL ENSAYO */}
          <TextField
            margin="normal"
            fullWidth
            id="essay-title"
            label="Título del Ensayo (Opcional)"
            name="essayTitle"
            value={essayTitle}
            onChange={(e) => setEssayTitle(e.target.value)}
            helperText="Dale un nombre a tu ensayo para identificarlo fácilmente."
            sx={{ mb: 2 }}
          />

          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<CloudUploadIcon />}
            sx={{ mb: 2, py: 1.5, textTransform: 'none' }}
            disabled={isLoading}
          >
            Seleccionar Imágenes (Máx. {MAX_TOTAL_FILES} páginas, {MAX_FILE_SIZE_MB}MB por pág.)
            <input
              id="exam-image-upload"
              type="file"
              hidden
              multiple
              accept="image/*"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </Button>

          {selectedFileObjects.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Páginas Seleccionadas ({selectedFileObjects.length} / {MAX_TOTAL_FILES}):
              </Typography>
              <List dense sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p:0 }}>
                {selectedFileObjects.map((fileObj, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <IconButton edge="end" aria-label="delete" onClick={() => removeFile(index)} disabled={isLoading}>
                        <DeleteIcon />
                      </IconButton>
                    }
                    sx={{borderBottom: index < selectedFileObjects.length -1 ? '1px solid' : 'none', borderColor: 'divider'}}
                  >
                    <ListItemAvatar>
                      <Avatar variant="square" sx={{ bgcolor: 'transparent' }}>
                        <Image src={fileObj.previewUrl} alt={`Pág. ${index + 1}`} width={40} height={50} style={{ objectFit: 'contain' }}/>
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${index + 1}. ${fileObj.file.name}`}
                      secondary={`${(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB`}
                    />
                  </ListItem>
                ))}
              </List>
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
            disabled={isLoading || selectedFileObjects.length === 0}
            sx={{ mt: 2, py: 1.5 }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : `Subir ${selectedFileObjects.length} Página(s)`}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
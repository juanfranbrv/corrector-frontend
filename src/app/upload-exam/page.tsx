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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar'; // Para miniaturas en la lista
import Avatar from '@mui/material/Avatar'; // Para miniaturas
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import Grid from '@mui/material/Grid';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_TOTAL_FILES = 5; // Límite opcional en el número de páginas/archivos
const API_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://127.0.0.1:8000';

interface PreviewableFile {
  file: File;
  previewUrl: string;
}

export default function UploadExamPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [selectedFileObjects, setSelectedFileObjects] = useState<PreviewableFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) router.replace('/auth');
  }, [user, session, authLoading, router]);

  // Limpiar URLs de objeto cuando el componente se desmonte
  useEffect(() => {
    return () => {
      selectedFileObjects.forEach(f => URL.revokeObjectURL(f.previewUrl));
    };
  }, [selectedFileObjects]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMessage(null);

    if (event.target.files && event.target.files.length > 0) {
      const filesArray = Array.from(event.target.files);
      const newFileObjects: PreviewableFile[] = [...selectedFileObjects];

      if (newFileObjects.length + filesArray.length > MAX_TOTAL_FILES) {
        setError(`Puedes subir un máximo de ${MAX_TOTAL_FILES} páginas por ensayo.`);
        event.target.value = ''; // Limpiar para permitir re-seleccionar
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
        // Evitar duplicados (opcional, basado en nombre y tamaño)
        if (!newFileObjects.some(fo => fo.file.name === file.name && fo.file.size === file.size)) {
          newFileObjects.push({ file, previewUrl: URL.createObjectURL(file) });
        }
      }
      setSelectedFileObjects(newFileObjects);
    }
    event.target.value = ''; // Limpiar el input para permitir re-seleccionar mismos archivos
  };

  const removeFile = (indexToRemove: number) => {
    const fileObjectToRemove = selectedFileObjects[indexToRemove];
    if (fileObjectToRemove) {
      URL.revokeObjectURL(fileObjectToRemove.previewUrl); // Limpiar URL de objeto
    }
    setSelectedFileObjects(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedFileObjects.length === 0) {
      setError('Por favor, selecciona al menos un archivo de imagen.');
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
    selectedFileObjects.forEach(fileObject => {
      formData.append('files', fileObject.file); // El backend espera 'files'
    });
    // Opcional: Si quieres enviar un nombre para el ensayo desde el frontend
    // const essayTitle = "Ensayo de Prueba"; // Podrías tener un input para esto
    // if (essayTitle) formData.append('filename_prefix', essayTitle);

    try {
      const response = await fetch(`${API_URL}/exam_papers/upload_multiple_images/`, {
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
        `¡Ensayo "${responseData.filename}" (${selectedFileObjects.length} pág.) subido! ID: ${responseData.id}. Redirigiendo...`
      );
      
      selectedFileObjects.forEach(f => URL.revokeObjectURL(f.previewUrl)); // Limpiar todas las URLs de objeto
      setSelectedFileObjects([]); // Limpiar selección

      setTimeout(() => {
        router.push('/dashboard');
      }, 2000); // 2 segundos de retraso

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
      return null; 
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Subir Páginas del Ensayo
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<CloudUploadIcon />}
            sx={{ mb: 2, py: 1.5, textTransform: 'none' }}
          >
            Seleccionar Imágenes (Máx. {MAX_TOTAL_FILES} páginas, {MAX_FILE_SIZE_MB}MB por pág.)
            <input
              id="exam-image-upload"
              type="file"
              hidden
              multiple // Permitir selección múltiple
              accept="image/*"
              onChange={handleFileChange}
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
                      <IconButton edge="end" aria-label="delete" onClick={() => removeFile(index)}>
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
              {/* Opcional: Grid de previsualizaciones más grandes
              <Grid container spacing={1} sx={{mt: 1}}>
                {selectedFileObjects.map((fileObj, index) => (
                  <Grid item xs={6} sm={4} md={3} key={`preview-${index}`}>
                    <Paper variant="outlined" sx={{ aspectRatio: '3/4', position: 'relative', overflow: 'hidden' }}>
                      <Image src={fileObj.previewUrl} alt={`Vista previa página ${index + 1}`} fill style={{ objectFit: 'contain' }} />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              */}
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
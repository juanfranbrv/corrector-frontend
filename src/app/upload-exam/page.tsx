// src/app/upload-exam/page.tsx
'use client';

import React, { useState, ChangeEvent, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

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
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import TextField from '@mui/material/TextField'; // Asegúrate de que esta línea esté presente

// import Grid from '@mui/material/Grid'; // Descomentar si usas el grid de previsualizaciones

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_TOTAL_FILES = 5;
const API_BACKEND_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://127.0.0.1:8000'; // Asegúrate de usar la variable correcta

interface ExistingImage {
  id: number;
  image_url: string;
  page_number?: number | null;
  file?: undefined; // Para distinguir de nuevas
}

// Extiende PreviewableFile para nuevas imágenes
interface PreviewableFile {
  file: File;
  previewUrl: string;
  id?: undefined;
  image_url?: undefined;
}

type ImageItem = ExistingImage | PreviewableFile;

function ClientOnlyUploadExamPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paperId = searchParams.get('id');

  const [selectedFileObjects, setSelectedFileObjects] = useState<ImageItem[]>([]);
  const [essayTitle, setEssayTitle] = useState<string>(''); // <--- NUEVO ESTADO PARA EL TÍTULO
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [initialImages, setInitialImages] = useState<ExistingImage[]>([]); // Para comparar eliminaciones
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) router.replace('/auth');
  }, [user, session, authLoading, router]);

  // Limpieza de previews solo para nuevas imágenes
  useEffect(() => {
    return () => {
      selectedFileObjects.forEach(f => {
        if ('previewUrl' in f && f.previewUrl) {
          URL.revokeObjectURL(f.previewUrl);
        }
      });
    };
  }, [selectedFileObjects]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (event.target.files && event.target.files.length > 0) {
      const filesArray = Array.from(event.target.files);
      // Mezclar imágenes existentes y nuevas
      const newFileObjects: ImageItem[] = [...selectedFileObjects];
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
        // Corregir comparación de duplicados solo para nuevas imágenes
        if (!newFileObjects.some(fo => 'file' in fo && fo.file && fo.file.name === file.name && fo.file.size === file.size)) {
          newFileObjects.push({ file, previewUrl: URL.createObjectURL(file) });
        }
      }
      setSelectedFileObjects(newFileObjects);
    }
    event.target.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    const fileObjectToRemove = selectedFileObjects[indexToRemove];
    if ('previewUrl' in fileObjectToRemove && fileObjectToRemove.previewUrl) {
      URL.revokeObjectURL(fileObjectToRemove.previewUrl);
    }
    setSelectedFileObjects(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedFileObjects.length === 0) {
      setError('Por favor, selecciona al menos una página.');
      return;
    }
    if (!session?.access_token) {
      setError('No autenticado. Por favor, inicia sesión de nuevo.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (paperId) {
        // --- MODO EDICIÓN ---
        // 1. Detectar imágenes eliminadas
        const initialIds = initialImages.map(img => img.id);
        const currentIds = selectedFileObjects.filter(img => 'id' in img && img.id).map(img => (img as ExistingImage).id);
        const deletedIds = initialIds.filter(id => !currentIds.includes(id));
        // 2. Eliminar imágenes eliminadas
        for (const delId of deletedIds) {
          await fetch(`${API_BACKEND_URL}/exam_images/${delId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        }
        // 3. Añadir imágenes nuevas
        const newFiles = selectedFileObjects.filter(img => 'file' in img && img.file) as PreviewableFile[];
        if (newFiles.length > 0) {
          const formData = new FormData();
          newFiles.forEach(f => formData.append('files', f.file));
          await fetch(`${API_BACKEND_URL}/exam_papers/${paperId}/add_images`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
          });
        }
        // 4. Reordenar imágenes (después de añadir/eliminar)
        // Obtener ids en el orden actual (solo imágenes existentes, las nuevas se añaden al final por backend)
        const updatedRes = await fetch(`${API_BACKEND_URL}/exam_papers/${paperId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const updatedData = await updatedRes.json();
        // Combinar ids: primero los que están en selectedFileObjects y existen en backend, luego los nuevos
        const orderedIds = selectedFileObjects
          .filter(img => 'id' in img && img.id)
          .map(img => (img as ExistingImage).id);
        // Si hay nuevas imágenes, agregarlas al final (el backend las añade al final)
        const backendIds = (updatedData.images || []).map((img: { id: number }) => img.id);
        const newBackendIds = backendIds.filter((id: number) => !orderedIds.includes(id));
        const finalOrder = [...orderedIds, ...newBackendIds];
        await fetch(`${API_BACKEND_URL}/exam_papers/${paperId}/reorder_images`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ image_ids: finalOrder }),
        });
        // 5. Actualizar título si cambió
        if (essayTitle.trim() && essayTitle.trim() !== updatedData.filename) {
          await fetch(`${API_BACKEND_URL}/exam_papers/${paperId}/filename`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ filename: essayTitle.trim() }),
          });
        }
        setSuccessMessage('Redacción actualizada correctamente. Redirigiendo...');
        // Redirigir según origen: dashboard o página del ensayo
        const from = searchParams.get('from');
        setTimeout(() => {
          if (from === 'essay' && paperId) {
            router.push(`/essay/${paperId}`);
          } else {
            router.push('/dashboard');
          }
        }, 2000);
      } else {
        // --- MODO CREACIÓN (igual que antes) ---
        const formData = new FormData();
        selectedFileObjects.forEach(fileObject => {
          if ('file' in fileObject && fileObject.file) {
            formData.append('files', fileObject.file);
          }
        });
        if (essayTitle.trim()) {
          formData.append('essay_title', essayTitle.trim());
        }
        const response = await fetch(`${API_BACKEND_URL}/exam_papers/upload_multiple_images/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
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
        setTimeout(() => router.push('/dashboard'), 2500);
      }
      // Limpiar previews solo de nuevas imágenes
      selectedFileObjects.forEach(f => {
        if ('previewUrl' in f && f.previewUrl) {
          URL.revokeObjectURL(f.previewUrl);
        }
      });
      setSelectedFileObjects([]);
      setEssayTitle('');
    } catch (e) {
      const err = e as Error;
      setError(err.message || 'Error desconocido al guardar.');
    } finally {
      setIsLoading(false);
    }
  };

  // Drag & Drop handler
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(selectedFileObjects);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setSelectedFileObjects(reordered);
  };

  // Cargar datos si hay id (modo edición)
  useEffect(() => {
    if (!paperId || !session?.access_token) return;
    setIsEditMode(true);
    setIsLoading(true);
    fetch(`${API_BACKEND_URL}/exam_papers/${paperId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('No se pudo cargar la redacción.');
        return res.json();
      })
      .then((data) => {
        setEssayTitle(data.filename || '');
        // Tipado estricto al mapear imágenes existentes
        const imgs: ExistingImage[] = (data.images || []).map((img: { id: number; image_url: string; page_number?: number | null }) => ({
          id: img.id,
          image_url: img.image_url,
          page_number: img.page_number
        }));
        setSelectedFileObjects(imgs);
        setInitialImages(imgs);
      })
      .catch(e => setError(e.message || 'Error al cargar la redacción.'))
      .finally(() => setIsLoading(false));
  }, [paperId, session]);

  if (authLoading) {
    return (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}><CircularProgress /></Box>);
  }
  if (!user && !authLoading) {
      // Podrías mostrar un mensaje o simplemente no renderizar nada si se va a redirigir.
      // router.replace('/auth') ya está en el useEffect.
      return null; 
  }

  // --- NUEVO DISEÑO DE UI PARA SUBIDA Y GESTIÓN DE PÁGINAS ---
  // 1. Separa las imágenes nuevas (aún no subidas) de las existentes
  const existingImages = selectedFileObjects.filter(img => 'id' in img && img.id) as ExistingImage[];
  const newImages = selectedFileObjects.filter(img => 'file' in img && img.file) as PreviewableFile[];
  // Unifica todas las imágenes para el lightbox
  const allImagesForLightbox = [
    ...newImages.map(img => ({ src: img.previewUrl })),
    ...existingImages.map(img => ({ src: img.image_url }))
  ];

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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEssayTitle(e.target.value)}
            helperText="Dale un nombre a tu ensayo para identificarlo fácilmente."
            sx={{ mb: 2 }}
          />

          {/* SUBIR NUEVAS IMÁGENES */}
          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<CloudUploadIcon />}
            sx={{ mb: 2, py: 1.5, textTransform: 'none' }}
            disabled={isLoading}
          >
            Seleccionar Imágenes para añadir (Máx. {MAX_TOTAL_FILES} páginas, {MAX_FILE_SIZE_MB}MB por pág.)
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

          {/* NUEVAS IMÁGENES (AÚN NO SUBIDAS) */}
          {newImages.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Páginas nuevas para subir:
              </Typography>
              <List dense sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p:0 }}>
                {newImages.map((fileObj, index) => (
                  <ListItem
                    key={`new-${index}`}
                    secondaryAction={
                      <IconButton edge="end" aria-label="delete" onClick={() => removeFile(selectedFileObjects.indexOf(fileObj))} disabled={isLoading}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar variant="square" sx={{ bgcolor: 'transparent', width: 80, height: 100 }}>
                        <Image src={fileObj.previewUrl} alt={`Nueva pág. ${index + 1}`} width={80} height={100} style={{ objectFit: 'contain', cursor: 'pointer' }} onClick={() => { setLightboxIndex(index); setLightboxOpen(true); }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={fileObj.file.name}
                      secondary={`${(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* EXISTING IMAGES (YA SUBIDAS) */}
          {existingImages.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Páginas ya subidas (puedes reordenar o eliminar):
              </Typography>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="existing-files-droppable">
                  {(provided) => (
                    <List
                      dense
                      sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p:0 }}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {existingImages.map((fileObj, index) => (
                        <Draggable key={`existing-${fileObj.id}`} draggableId={`existing-${fileObj.id}`} index={index}>
                          {(provided, snapshot) => (
                            <ListItem
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              secondaryAction={
                                <IconButton edge="end" aria-label="delete" onClick={() => removeFile(selectedFileObjects.indexOf(fileObj))} disabled={isLoading}>
                                  <DeleteIcon />
                                </IconButton>
                              }
                              sx={{
                                borderBottom: index < existingImages.length -1 ? '1px solid' : 'none',
                                borderColor: 'divider',
                                background: snapshot.isDragging ? 'rgba(0,0,0,0.04)' : 'inherit',
                              }}
                            >
                              <ListItemAvatar>
                                <Avatar variant="square" sx={{ bgcolor: 'transparent', width: 80, height: 100 }}>
                                  <Image src={fileObj.image_url} alt={`Pág. ${index + 1}`} width={80} height={100} style={{ objectFit: 'contain', cursor: 'pointer' }} onClick={() => { setLightboxIndex(newImages.length + index); setLightboxOpen(true); }} />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={`Página ${index + 1}`}
                                // secondary eliminado (no mostrar url)
                              />
                            </ListItem>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </List>
                  )}
                </Droppable>
              </DragDropContext>
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
            disabled={isLoading || (newImages.length === 0 && existingImages.length === 0)}
            sx={{ mt: 2, py: 1.5 }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : (paperId ? 'Guardar Cambios' : `Subir ${newImages.length} Página(s)`)}
          </Button>
        </Box>
      </Paper>

      {/* Lightbox para previsualización ampliada */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={allImagesForLightbox}
        index={lightboxIndex}
        styles={{ container: { backgroundColor: 'rgba(0,0,0,0.95)' } }}
      />
    </Container>
  );
}

export default function UploadExamPage() {
  return (
    <Suspense fallback={<div style={{textAlign:'center',marginTop:40}}><CircularProgress /><br/>Cargando...</div>}>
      <ClientOnlyUploadExamPage />
    </Suspense>
  );
}
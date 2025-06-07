import React, { useState } from 'react';
import { Box, Typography, Button, Alert, CircularProgress, Paper, Avatar, IconButton } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import Image from 'next/image';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// Unifica el tipo ExamImage para que incluya exam_paper_id y sea compatible con el backend y frontend
export interface ExamImage {
  id: number;
  image_url: string;
  page_number?: number | null;
  exam_paper_id?: number;
}

interface ExamImagesManagerProps {
  paperId: number;
  images: ExamImage[];
  onClose: () => void;
  onImagesUpdated: (images: ExamImage[]) => void;
  token: string;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const API_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://127.0.0.1:8000';

export const ExamImagesManager: React.FC<ExamImagesManagerProps> = ({ paperId, images, onClose, onImagesUpdated, token }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localImages, setLocalImages] = useState<ExamImage[]>(images);

  React.useEffect(() => { setLocalImages(images); }, [images]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (event.target.files && event.target.files.length > 0) {
      const filesArray = Array.from(event.target.files);
      for (const file of filesArray) {
        if (!file.type.startsWith('image/')) {
          setError(`Archivo '${file.name}' no es una imagen.`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          setError(`Archivo '${file.name}' es demasiado grande (Máx ${MAX_FILE_SIZE_MB}MB).`);
          continue;
        }
      }
      setSelectedFiles(filesArray);
    }
    event.target.value = '';
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('files', file));
    try {
      const response = await fetch(`${API_URL}/exam_papers/${paperId}/add_images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Error al subir imágenes');
      onImagesUpdated(data.images || []);
      setSelectedFiles([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (imageId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/exam_images/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Error al eliminar imagen');
      onImagesUpdated(data.images || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(localImages);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setLocalImages(reordered);
    // Llamar al backend para guardar el nuevo orden
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/exam_papers/${paperId}/reorder_images`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image_ids: reordered.map(img => img.id) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Error al reordenar imágenes');
      onImagesUpdated(data.images || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, minWidth: 350 }}>
      <Typography variant="h6" gutterBottom>Gestionar Páginas</Typography>
      <Button
        variant="outlined"
        component="label"
        fullWidth
        startIcon={<CloudUploadIcon />}
        sx={{ mb: 2, py: 1.5, textTransform: 'none' }}
        disabled={isLoading}
      >
        Añadir Imágenes
        <input
          type="file"
          hidden
          multiple
          accept="image/*"
          onChange={handleFileChange}
          disabled={isLoading}
        />
      </Button>
      {selectedFiles.length > 0 && (
        <Button onClick={handleUpload} variant="contained" fullWidth sx={{ mb: 2 }} disabled={isLoading}>
          {isLoading ? <CircularProgress size={20} /> : `Subir ${selectedFiles.length} imagen(es)`}
        </Button>
      )}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="images-list">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 8, padding: 0 }}
            >
              {localImages.map((img, idx) => (
                <Draggable key={img.id} draggableId={img.id.toString()} index={idx}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        borderBottom: idx < localImages.length - 1 ? '1px solid #e0e0e0' : 'none',
                        background: snapshot.isDragging ? '#f5f5f5' : 'white',
                        ...provided.draggableProps.style,
                      }}
                    >
                      <span {...provided.dragHandleProps} style={{ cursor: 'grab', marginRight: 8, display: 'flex', alignItems: 'center' }}>
                        <DragIndicatorIcon fontSize="medium" />
                      </span>
                      <Avatar variant="square" sx={{ bgcolor: 'transparent', width: 80, height: 100, mr: 2 }}>
                        <Image src={img.image_url} alt={`Pág. ${img.page_number || idx + 1}`} width={80} height={100} style={{ objectFit: 'contain' }}/>
                      </Avatar>
                      <Typography sx={{ flex: 1 }}>{`Pág. ${img.page_number || idx + 1}`}</Typography>
                      <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(img.id)} disabled={isLoading}>
                        <DeleteIcon />
                      </IconButton>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button onClick={onClose} color="primary">Cerrar</Button>
      </Box>
    </Paper>
  );
};

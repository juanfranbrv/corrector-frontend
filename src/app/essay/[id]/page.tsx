// src/app/essay/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DeleteIcon from '@mui/icons-material/Delete';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';

const API_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://127.0.0.1:8000';

interface ExamImage {
  id: number;
  image_url: string;
  page_number?: number | null;
  exam_paper_id: number;
}
interface ExamPaper {
  id: number;
  filename: string | null;
  images: ExamImage[];
  status: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  transcribed_text?: string | null;
  transcription_credits_consumed?: number;
  corrected_feedback?: string | null;
  correction_credits_consumed?: number;
  correction_prompt_version?: string | null;
  corrected_at?: string | null;
}

export default function EssayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [essayId, setEssayId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function unwrapParams() {
      const resolvedParams = await params;
      if (isMounted) setEssayId(resolvedParams.id);
    }
    unwrapParams();
    return () => { isMounted = false; };
  }, [params]);

  useEffect(() => {
    if (!essayId || authLoading) return;
    if (!session?.access_token) {
      setError('No autenticado. Por favor, inicia sesión de nuevo.');
      return;
    }
    const fetchPaper = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/exam_papers/${essayId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        if (!res.ok) throw new Error('No se pudo cargar la redacción.');
        const data = await res.json();
        setPaper(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchPaper();
  }, [essayId, session, authLoading]);

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openTranscriptionEditor, setOpenTranscriptionEditor] = useState(false);
  const [editableTranscriptionText, setEditableTranscriptionText] = useState('');
  const [isSavingTranscription, setIsSavingTranscription] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');

  const handleTranscribe = async () => {
    if (!session?.access_token || !paper) return;
    setSnackbarMessage('Transcribiendo...'); setSnackbarSeverity('info'); setSnackbarOpen(true);
    try {
      const response = await fetch(`${API_URL}/exam_papers/${paper.id}/transcribe`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
      const resData = await response.json();
      if (!response.ok) throw new Error(typeof resData.detail === 'string' ? resData.detail : `Error ${response.status}`);
      setPaper(prev => prev ? { ...prev, ...resData } : resData);
      setSnackbarMessage('Transcripción completa.'); setSnackbarSeverity('success');
      setOpenTranscriptionEditor(true);
      setEditableTranscriptionText(resData.transcribed_text || '');
    } catch (e) {
      setSnackbarMessage('Error transcribiendo: ' + (e instanceof Error ? e.message : String(e))); setSnackbarSeverity('error');
    } finally { setSnackbarOpen(true); }
  };

  const handleCorrect = async () => {
    if (!session?.access_token || !paper) return;
    setSnackbarMessage('Corrigiendo...'); setSnackbarSeverity('info'); setSnackbarOpen(true);
    try {
      const response = await fetch(`${API_URL}/exam_papers/${paper.id}/correct`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
      const resData = await response.json();
      if (!response.ok) throw new Error(typeof resData.detail === 'string' ? resData.detail : `Error ${response.status}`);
      setPaper(prev => prev ? { ...prev, ...resData } : resData);
      setSnackbarMessage('Corrección completa.'); setSnackbarSeverity('success');
    } catch (e) {
      setSnackbarMessage('Error corrigiendo: ' + (e instanceof Error ? e.message : String(e))); setSnackbarSeverity('error');
    } finally { setSnackbarOpen(true); }
  };

  const handleOpenTranscriptionEditor = () => {
    if (!paper) return;
    setEditableTranscriptionText(paper.transcribed_text || '');
    setOpenTranscriptionEditor(true);
  };
  const handleCloseTranscriptionEditor = () => {
    setOpenTranscriptionEditor(false);
  };
  const handleSaveEditedTranscription = async () => {
    if (!session?.access_token || !paper) return;
    setIsSavingTranscription(true);
    try {
      const response = await fetch(`${API_URL}/exam_papers/${paper.id}/transcribed_text`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ transcribed_text: editableTranscriptionText }),
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(typeof resData.detail === 'string' ? resData.detail : `Error ${response.status}`);
      setPaper(prev => prev ? { ...prev, ...resData } : resData);
      setSnackbarMessage('Transcripción actualizada.'); setSnackbarSeverity('success');
      setOpenTranscriptionEditor(false);
    } catch (e) {
      setSnackbarMessage('Error al guardar: ' + (e instanceof Error ? e.message : String(e))); setSnackbarSeverity('error');
    } finally { setIsSavingTranscription(false); setSnackbarOpen(true); }
  };
  const handleClickOpenDeleteDialog = () => setOpenDeleteDialog(true);
  const handleCloseDeleteDialog = () => setOpenDeleteDialog(false);
  const handleConfirmDelete = async () => {
    if (!session?.access_token || !paper) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/exam_papers/${paper.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.detail || `Error: ${res.statusText}`);
      setSnackbarMessage('Redacción eliminada.'); setSnackbarSeverity('success');
      router.push('/dashboard');
    } catch (e) {
      setSnackbarMessage('Error al eliminar: ' + (e instanceof Error ? e.message : String(e))); setSnackbarSeverity('error');
    } finally { setIsDeleting(false); setOpenDeleteDialog(false); setSnackbarOpen(true); }
  };
  const handleCloseSnackbar = (_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!paper) return null;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" gutterBottom>Redacción: {paper.filename || `ID: ${paper.id}`}</Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>Estado: {paper.status}</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>Subido: {new Date(paper.created_at).toLocaleDateString()}</Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <IconButton onClick={handleTranscribe} color="primary" title="Transcribir" disabled={paper.status !== 'uploaded'}>
            <TextFieldsIcon />
          </IconButton>
          <IconButton onClick={handleOpenTranscriptionEditor} color="primary" title="Revisar transcripción" disabled={paper.status !== 'transcribed'}>
            <SpellcheckIcon />
          </IconButton>
          <IconButton onClick={handleCorrect} color="primary" title="Corregir" disabled={paper.status !== 'transcribed'}>
            <AccountBalanceWalletIcon />
          </IconButton>
          <IconButton onClick={handleClickOpenDeleteDialog} color="error" title="Eliminar">
            <DeleteIcon />
          </IconButton>
          <IconButton component={Button} href={`/upload-exam?id=${paper.id}&from=essay`} color="primary" title="Gestionar páginas">
            <CloudUploadIcon />
          </IconButton>
        </Stack>
        {paper.images && paper.images.length > 0 && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', my: 2 }}>
            {paper.images.map((img) => (
              <Box key={img.id} sx={{ width: 120, height: 160, border: '1px solid #eee', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                <img src={img.image_url} alt={`Página ${img.page_number || ''}`} width={120} height={160} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
            ))}
          </Box>
        )}
        <Typography variant="h6" sx={{ mt: 3 }}>Transcripción</Typography>
        <Paper variant="outlined" sx={{ p: 2, my: 1, background: '#fafafa', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          {paper.transcribed_text || <span style={{ color: '#aaa' }}>Sin transcripción aún.</span>}
        </Paper>
        <Typography variant="h6" sx={{ mt: 3 }}>Feedback de Corrección</Typography>
        <Paper variant="outlined" sx={{ p: 2, my: 1, background: '#f5f5f5' }}>
          {paper.corrected_feedback ? (
            <div dangerouslySetInnerHTML={{ __html: paper.corrected_feedback.replace(/\n/g, '<br/>') }} />
          ) : (
            <span style={{ color: '#aaa' }}>Sin corrección aún.</span>
          )}
        </Paper>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => router.back()}>Volver</Button>
      </Paper>
      {/* Diálogo para editar transcripción */}
      <Dialog open={openTranscriptionEditor} onClose={handleCloseTranscriptionEditor} maxWidth="md" fullWidth>
        <DialogTitle>Editar Transcripción</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            fullWidth
            value={editableTranscriptionText}
            onChange={e => setEditableTranscriptionText(e.target.value)}
            variant="outlined"
            minRows={8}
            sx={{ fontFamily: 'monospace', fontSize: '1rem', mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTranscriptionEditor} disabled={isSavingTranscription}>Cancelar</Button>
          <Button onClick={handleSaveEditedTranscription} variant="contained" disabled={isSavingTranscription}>{isSavingTranscription ? 'Guardando...' : 'Guardar'}</Button>
        </DialogActions>
      </Dialog>
      {/* Diálogo para eliminar */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Seguro que quieres eliminar {paper.filename || `ID: ${paper.id}`}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus disabled={isDeleting}>{isDeleting ? <CircularProgress size={20} /> : 'Eliminar'}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

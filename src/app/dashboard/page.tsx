// src/app/dashboard/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

import {
  Container,
  Typography,
  CircularProgress,
  Paper,
  Box,
  Button,
  Alert,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tabs,
  Tab,
  TextField,
  Chip,
  Stack,
  ButtonGroup
} from '@mui/material';
import { grey, blue, green, orange, red } from '@mui/material/colors';

import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LaunchIcon from '@mui/icons-material/Launch';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';

const API_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://127.0.0.1:8000';

type ExamPaperStatus = 
  | 'uploaded' 
  | 'transcribed' 
  | 'correcting' 
  | 'corrected' 
  | 'error_transcription' 
  | 'error_correction';

interface UserProfileData {
  sub: string;
  email?: string;
  aud?: string;
  role?: string;
  exp?: number;
  current_paper_count: number;
  max_paper_quota: number;
  credits?: number;
}

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
  status: ExamPaperStatus;
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

export default function DashboardPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  console.log("DEBUG: API_URL usada en Dashboard:", API_URL);

  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [examPapers, setExamPapers] = useState<ExamPaper[]>([]);
  const [isLoadingPapers, setIsLoadingPapers] = useState(false);
  const [papersError, setPapersError] = useState<string | null>(null);

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<ExamPaper | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isTranscribingId, setIsTranscribingId] = useState<number | null>(null);
  const [isCorrectingId, setIsCorrectingId] = useState<number | null>(null);

  const [openTranscriptionEditor, setOpenTranscriptionEditor] = useState(false);
  const [editingPaper, setEditingPaper] = useState<ExamPaper | null>(null);
  const [editableTranscriptionText, setEditableTranscriptionText] = useState('');
  const [isSavingTranscription, setIsSavingTranscription] = useState(false);
  const [activeImagePageIndex, setActiveImagePageIndex] = useState(0);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] =
    useState<'success' | 'error' | 'info'>('success');

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) router.replace('/auth');
  }, [user, session, authLoading, router]);

  const fetchUserProfile = useCallback(async () => {
    console.log("DEBUG: fetchUserProfile - Access Token:", session?.access_token);
    if (!session?.access_token) { setProfileError('No hay token de acceso válido.'); return; }
    setIsLoadingProfile(true); setProfileError(null);
    try {
      const response = await fetch(`${API_URL}/users/me/`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      console.log("DEBUG: fetchUserProfile - Response Status:", response.status);
      if (!response.ok) { const errData = await response.json().catch(()=>({detail: `Error ${response.status}: ${response.statusText}`})); console.error("DEBUG: fetchUserProfile - Error Data:", errData); throw new Error(errData.detail || `Error del servidor [${response.status}]`); }
      const data = await response.json(); setProfileData(data);
    } catch (e: unknown) { 
      const error = e instanceof Error ? e : new Error(String(e));
      console.error("DEBUG: fetchUserProfile - Catch Error:", error); 
      setProfileError(error.message); 
    } finally { setIsLoadingProfile(false); }
  }, [session]);

  const fetchExamPapers = useCallback(async (showNotification = false) => {
    console.log("DEBUG: fetchExamPapers - Access Token:", session?.access_token);
    if (!session?.access_token) { setPapersError('No hay token de acceso válido.'); return; }
    setIsLoadingPapers(true); setPapersError(null);
    try {
      const response = await fetch(`${API_URL}/exam_papers/`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      console.log("DEBUG: fetchExamPapers - Response Status:", response.status);
      if (!response.ok) { 
        const errData = await response.json().catch(()=>({detail: `Error ${response.status}: ${response.statusText}`})); 
        console.error("DEBUG: fetchExamPapers - Error Data:", errData); 
        throw new Error(errData.detail || `Error del servidor [${response.status}]`); 
      }
      const data: ExamPaper[] = await response.json();
      console.log("DEBUG: Datos de ExamPapers recibidos:", data); // <--- CONSOLE.LOG AÑADIDO AQUÍ
      setExamPapers(data);
      if (showNotification) { setSnackbarMessage('Lista de redacciones actualizada.'); setSnackbarSeverity('info'); setSnackbarOpen(true); }
    } catch (e: unknown) { 
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('DEBUG: fetchExamPapers - Catch Error:', error); 
      setPapersError(error.message); 
    } finally { setIsLoadingPapers(false); }
  }, [session]);

  useEffect(() => {
    if (user && session) { fetchUserProfile(); fetchExamPapers(); }
  }, [user, session, fetchUserProfile, fetchExamPapers]);

  const handleClickOpenDeleteDialog = (paper: ExamPaper) => { setPaperToDelete(paper); setOpenDeleteDialog(true); };
  const handleCloseDeleteDialog = () => { setOpenDeleteDialog(false); setPaperToDelete(null); };
  const handleConfirmDelete = async () => {
    if (!paperToDelete || !session?.access_token) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/exam_papers/${paperToDelete.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.detail || `Error: ${res.statusText}`);
      setSnackbarMessage('Redacción eliminada.'); setSnackbarSeverity('success');
      setExamPapers((p) => p.filter((i) => i.id !== paperToDelete.id));
      fetchUserProfile();
    } catch (e: unknown) { 
      const error = e instanceof Error ? e : new Error(String(e));
      setSnackbarMessage(`Error al eliminar: ${error.message}`); 
      setSnackbarSeverity('error'); 
    } finally { setIsDeleting(false); handleCloseDeleteDialog(); setSnackbarOpen(true); }
  };

  const handleTranscribe = async (paperId: number) => {
    if (!session?.access_token) { setSnackbarMessage('Error auth.'); setSnackbarSeverity('error'); setSnackbarOpen(true); return; }
    setIsTranscribingId(paperId); setSnackbarMessage('Transcribiendo...'); setSnackbarSeverity('info'); setSnackbarOpen(true);
    try {
      const response = await fetch(`${API_URL}/exam_papers/${paperId}/transcribe`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
      const resData: ExamPaper | { detail: string } = await response.json();
      if (!response.ok) throw new Error((resData as {detail: string}).detail || `Error ${response.status}`);
      const updatedPaper = resData as ExamPaper;
      setExamPapers((prev) => prev.map((p) => (p.id === paperId ? { ...p, ...updatedPaper } : p)));
      setSnackbarMessage(`Transcripción de '${updatedPaper.filename || 'ID:'+paperId}' completa.`); setSnackbarSeverity('success');
      fetchUserProfile();
      handleOpenTranscriptionEditor(updatedPaper);
    } catch (e: unknown) { 
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('Error transcribiendo:', error); 
      setSnackbarMessage(`Error transcripción: ${error.message}`); 
      setSnackbarSeverity('error'); 
      setExamPapers((prev) => prev.map((p) => p.id === paperId ? { ...p, status: 'error_transcription' } : p));
    } finally { setIsTranscribingId(null); setSnackbarOpen(true); }
  };

  const handleOpenTranscriptionEditor = (paper: ExamPaper) => {
    setEditingPaper(paper);
    setEditableTranscriptionText(paper.transcribed_text || '');
    setActiveImagePageIndex(0); 
    setOpenTranscriptionEditor(true);
  };
  const handleCloseTranscriptionEditor = () => {
    setOpenTranscriptionEditor(false); setEditingPaper(null); setEditableTranscriptionText('');
  };
  const handleSaveEditedTranscription = async () => {
    if (!editingPaper || !session?.access_token) return;
    setIsSavingTranscription(true);
    try {
      const response = await fetch(`${API_URL}/exam_papers/${editingPaper.id}/transcribed_text`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ transcribed_text: editableTranscriptionText }),
      });
      const resData: ExamPaper | { detail: string } = await response.json();
      if (!response.ok) throw new Error((resData as {detail: string}).detail || `Error ${response.status}`);
      const updatedPaper = resData as ExamPaper;
      setExamPapers((prev) => prev.map((p) => (p.id === editingPaper.id ? { ...p, ...updatedPaper } : p)));
      setSnackbarMessage('Transcripción actualizada.'); setSnackbarSeverity('success');
      handleCloseTranscriptionEditor();
    } catch (e: unknown) { 
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('Error guardando transcripción:', error); 
      setSnackbarMessage(`Error al guardar: ${error.message}`); 
      setSnackbarSeverity('error'); 
    } finally { setIsSavingTranscription(false); setSnackbarOpen(true); }
  };

  const handleCorrect = async (paperId: number) => {
    if (!session?.access_token) { setSnackbarMessage('Error auth.'); setSnackbarSeverity('error'); setSnackbarOpen(true); return; }
    setIsCorrectingId(paperId); setSnackbarMessage('Corrigiendo...'); setSnackbarSeverity('info'); setSnackbarOpen(true);
    try {
      const response = await fetch(`${API_URL}/exam_papers/${paperId}/correct`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
      const resData: ExamPaper | { detail: string } = await response.json();
      if (!response.ok) throw new Error((resData as {detail: string}).detail || `Error ${response.status}`);
      const updatedPaper = resData as ExamPaper;
      setExamPapers((prev) => prev.map((p) => (p.id === paperId ? { ...p, ...updatedPaper } : p)));
      setSnackbarMessage(`Corrección de '${updatedPaper.filename || 'ID:'+paperId}' completa.`); setSnackbarSeverity('success');
      fetchUserProfile();
    } catch (e: unknown) { 
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('Error corrigiendo:', error); 
      setSnackbarMessage(`Error corrección: ${error.message}`); 
      setExamPapers((prev) => prev.map((p) => p.id === paperId ? { ...p, status: 'error_correction' } : p));
    } finally { setIsCorrectingId(null); setSnackbarOpen(true); }
  };
  const handleCloseSnackbar = (_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  if (authLoading) return (<Box sx={{display:'flex',justifyContent:'center',alignItems:'center',height:'calc(100vh - 64px)'}}><CircularProgress size={60}/><Typography sx={{ml:2}}>Cargando...</Typography></Box>);
  if (!user || !session) return null;

  const quotaReached = profileData ? profileData.current_paper_count >= profileData.max_paper_quota : false;  const getStatusText = (status: ExamPaperStatus): string => {
    if (status === 'uploaded') return 'Subido';
    if (status === 'transcribed') return 'Transcrito';
    if (status === 'correcting') return 'Corrigiendo...';
    if (status === 'corrected') return 'Corregido';
    if (status === 'error_transcription') return 'Error Trans.';
    if (status === 'error_correction') return 'Error Corr.';
    return status;
  };
  
  const getStatusChipProps = (status: ExamPaperStatus): { 
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning', 
    bgcolor: string 
  } => {
    switch (status) {
      case 'uploaded':
        return { color: 'default', bgcolor: grey[100] };
      case 'transcribed':
        return { color: 'info', bgcolor: blue[50] };
      case 'correcting':
        return { color: 'warning', bgcolor: orange[50] };
      case 'corrected':
        return { color: 'success', bgcolor: green[50] };
      case 'error_transcription':
      case 'error_correction':
        return { color: 'error', bgcolor: red[50] };
      default:
        return { color: 'default', bgcolor: grey[100] };
    }
  };


  const sortedExamPapers = examPapers.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const sortedEditingPaperImages = editingPaper?.images ? 
    [...editingPaper.images].sort((a, b) => (a.page_number || 0) - (b.page_number || 0)) 
    : [];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, boxShadow: 'none', border: 'none', bgcolor: 'transparent' }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">Dashboard del Profesor</Typography>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="body1">¡Bienvenido, {user.email}!</Typography>
          {profileData && (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 1, color: 'text.secondary' }}><AccountBalanceWalletIcon fontSize="small" /><Typography variant="body2">Créditos: {profileData.credits ?? 'N/A'}</Typography></Box>)}
        </Box>
        {profileData && (<Typography variant="subtitle1" color={quotaReached ? 'error.main' : 'text.secondary'} sx={{ mb: 3, textAlign: 'center', fontWeight: quotaReached ? 'bold' : 'normal' }}>Redacciones: {profileData.current_paper_count} / {profileData.max_paper_quota} {quotaReached && <span style={{ marginLeft: '8px' }}>(Límite)</span>}</Typography>)}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3, justifyContent: 'center' }}>
          <Button variant="contained" color="primary" component={Link} href="/upload-exam" sx={{ py: 1.5, minWidth: '200px' }} disabled={quotaReached || isLoadingProfile || authLoading}>Subir Redacción</Button>
          <Button variant="outlined" onClick={() => {fetchUserProfile(); fetchExamPapers();}} disabled={isLoadingProfile || isLoadingPapers} sx={{ py: 1.5, minWidth: '200px' }}>{isLoadingProfile || isLoadingPapers ? <CircularProgress size={24} /> : `Refrescar Todo`}</Button>
        </Box>
        {profileError && !profileData && <Alert severity="error" sx={{ mt: 2, mb: 2 }}>Error perfil: {profileError}</Alert>}
        
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}><Typography variant="h5" component="h2">Mis Redacciones</Typography><IconButton onClick={() => { fetchExamPapers(true); fetchUserProfile(); }} disabled={isLoadingPapers || isLoadingProfile} color="primary"><RefreshIcon /></IconButton></Box>
          {papersError && <Alert severity="error" sx={{ mb: 2 }}>Error redacciones: {papersError}</Alert>}
          {isLoadingPapers && !papersError && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
          {!isLoadingPapers && examPapers.length === 0 && !papersError && (
            <Typography sx={{ textAlign: 'center', color: 'text.secondary', my: 3 }}>No has subido redacciones. <Link href="/upload-exam" style={{ color: 'primary.main' }}>Sube una</Link>.</Typography>
          )}
          {!isLoadingPapers && examPapers.length > 0 && (
            <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              {sortedExamPapers.map((paper) => {
                const isProcessingAny = isTranscribingId === paper.id || isCorrectingId === paper.id || isSavingTranscription;

                return (
                  <Card key={paper.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1.5px solid', borderColor: 'grey.400', boxShadow: 'none' }}>
                    <Box sx={{ p: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                        {paper.filename || `Redacción ${paper.id}`}
                      </Typography>
                      <Chip
                        label={getStatusText(paper.status)}
                        color={getStatusChipProps(paper.status).color}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                    <CardContent sx={{ 
                      height: '120px', 
                      overflow: 'hidden',
                      p: 2,
                      '& pre': {
                        fontFamily: 'monospace',
                        fontSize: '0.92rem',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.4',
                        margin: 0
                      }
                    }}>
                      <pre>
                        {paper.transcribed_text 
                          ? paper.transcribed_text
                              .replace(/---[\s-]*(?:Página|Fin de Página|Page)[\s-]*\d+[\s-]*---/g, ' ')
                              .replace(/\n{2,}/g, '\n')
                              .trim()
                              .slice(0, 200) + '...' 
                          : 'Sin texto transcrito'}
                      </pre>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 3 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                        {/* Botón: Gestionar páginas */}
                        <IconButton
                          size="small"
                          color="primary"
                          title="Gestionar páginas"
                          disabled={paper.status !== 'uploaded'}
                        >
                          <RefreshIcon />
                        </IconButton>
                        {/* Botón: Transcribir */}
                        <IconButton
                          onClick={() => handleTranscribe(paper.id)}
                          size="small"
                          color="primary"
                          title="Transcribir"
                          disabled={paper.status !== 'uploaded'}
                        >
                          <TextFieldsIcon />
                        </IconButton>
                        {/* Botón: Revisar transcripción */}
                        <IconButton
                          onClick={() => handleOpenTranscriptionEditor(paper)}
                          size="small"
                          color="primary"
                          title="Revisar transcripción"
                          disabled={paper.status !== 'transcribed'}
                        >
                          <SpellcheckIcon />
                        </IconButton>
                        {/* Botón: Corregir */}
                        <IconButton
                          onClick={() => handleCorrect(paper.id)}
                          size="small"
                          color="primary"
                          title="Corregir"
                          disabled={paper.status !== 'transcribed'}
                        >
                          <AccountBalanceWalletIcon />
                        </IconButton>
                        {/* Botón: Borrar */}
                        <IconButton
                          onClick={() => handleClickOpenDeleteDialog(paper)}
                          size="small"
                          color="error"
                          title="Eliminar"
                          disabled={false} // Siempre activo
                        >
                          <DeleteIcon />
                        </IconButton>
                        <Box sx={{ flexGrow: 1 }} />
                        {/* Botón: Abrir (alineado a la derecha) */}
                        <IconButton
                          component={Link}
                          href={`/essay/${paper.id}`}
                          size="small"
                          color="primary"
                          title="Abrir"
                          disabled={paper.status !== 'transcribed' && paper.status !== 'corrected'}
                        >
                          <LaunchIcon />
                        </IconButton>
                      </Stack>
                    </CardActions>
                  </Card>
                );
              })}
            </Box>
          )}
        </Box>
      </Paper>
      {/* Diálogos y snackbars */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Seguro que quieres eliminar {paperToDelete?.filename || `ID: ${paperToDelete?.id}`}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus disabled={isDeleting}>{isDeleting?<CircularProgress size={20}/>:'Eliminar'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openTranscriptionEditor}
        onClose={handleCloseTranscriptionEditor}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { height: '90vh', maxHeight: 'calc(100% - 64px)', width: '95vw', maxWidth: '1800px' } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          Revisar y Editar Transcripción: {editingPaper?.filename || `ID: ${editingPaper?.id || '...'}`}
          {sortedEditingPaperImages.length > 1 && ` (Página ${activeImagePageIndex + 1} de ${sortedEditingPaperImages.length})`}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1, p: 1, overflow: 'hidden', height: 'calc(100% - 64px - 52px - 16px)' }}>
          <Box sx={{ flex: { xs: '1 1 auto', md: '0 1 45%' }, display: 'flex', flexDirection: 'column', p: 0.5, overflow: 'hidden', minHeight: { xs: '200px', md: 'auto' } }}>
            {sortedEditingPaperImages.length > 0 ? (
              <>
                {sortedEditingPaperImages.length > 1 && (
                  <Tabs
                    value={activeImagePageIndex}
                    onChange={(event, newValue) => setActiveImagePageIndex(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="navegación de páginas de imagen"
                    sx={{ borderBottom: 1, borderColor: 'divider', mb: 0.5, flexShrink: 0 }}
                  >
                    {sortedEditingPaperImages.map((img, index) => (
                      <Tab label={`Pág ${img.page_number || index + 1}`} key={img.id || index} sx={{minWidth: '60px'}}/>
                    ))}
                  </Tabs>
                )}
                <Box sx={{ flexGrow: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {sortedEditingPaperImages[activeImagePageIndex]?.image_url ? (
                    <img
                      src={sortedEditingPaperImages[activeImagePageIndex].image_url}
                      alt={`Página ${sortedEditingPaperImages[activeImagePageIndex].page_number || activeImagePageIndex + 1}`}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  ) : ( <Typography>Error al cargar imagen de página.</Typography> )}
                </Box>
              </>
            ) : (<Typography>No hay imágenes para esta redacción.</Typography>)}
          </Box>
          <Box sx={{ flex: { xs: '1 1 auto', md: '1 1 55%' }, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: { xs: '200px', md: 'auto' } }}>
            <TextField
              multiline
              fullWidth
              value={editableTranscriptionText}
              onChange={(e) => setEditableTranscriptionText(e.target.value)}
              variant="outlined"
              placeholder="Edita la transcripción completa aquí..."
              helperText="La transcripción de todas las páginas se muestra aquí (con separadores). Edita según sea necesario."
              sx={{ flexGrow:1, '& .MuiInputBase-root':{height:'100%',display:'flex',flexDirection:'column', alignItems: 'flex-start'}, '& .MuiInputBase-inputMultiline':{flexGrow:1,height:'100% !important',overflowY:'auto !important',p:1.5,fontFamily:'monospace',fontSize:'0.95rem',lineHeight:1.6} }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTranscriptionEditor} disabled={isSavingTranscription}>Cancelar</Button>
          <Button onClick={handleSaveEditedTranscription} variant="contained" disabled={isSavingTranscription} startIcon={isSavingTranscription?<CircularProgress size={16}/>:null}>{isSavingTranscription ? 'Guardando...' : 'Guardar Cambios'}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        onClose={handleCloseSnackbar}
        autoHideDuration={6000}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

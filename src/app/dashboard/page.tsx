// src/app/dashboard/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField'; // Para el editor de texto

import RefreshIcon from '@mui/icons-material/Refresh';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EditNoteIcon from '@mui/icons-material/EditNote'; // Icono para editar transcripción

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';

import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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
interface ExamPaper {
  id: number;
  filename: string | null;
  image_url: string | null;
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

export default function DashboardPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [examPapers, setExamPapers] = useState<ExamPaper[]>([]);
  const [isLoadingPapers, setIsLoadingPapers] = useState(false);
  const [papersError, setPapersError] = useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<ExamPaper | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isTranscribingId, setIsTranscribingId] = useState<number | null>(null);
  // const [openTranscriptionDialog, setOpenTranscriptionDialog] = useState(false); // Ya no se usa para ver, se edita
  // const [currentTranscriptionText, setCurrentTranscriptionText] = useState(''); // Ya no se usa así

  const [isCorrectingId, setIsCorrectingId] = useState<number | null>(null);
  const [openCorrectionDialog, setOpenCorrectionDialog] = useState(false);
  const [currentCorrectionFeedback, setCurrentCorrectionFeedback] = useState('');

  // Nuevos estados para el editor de transcripción
  const [openTranscriptionEditor, setOpenTranscriptionEditor] = useState(false);
  const [editingPaper, setEditingPaper] = useState<ExamPaper | null>(null);
  const [editableTranscriptionText, setEditableTranscriptionText] = useState('');
  const [isSavingTranscription, setIsSavingTranscription] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] =
    useState<'success' | 'error' | 'info'>('success');

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) router.replace('/auth');
  }, [user, session, authLoading, router]);

  const fetchUserProfile = useCallback(async () => {
    if (!session?.access_token) {
      setProfileError('No hay token de acceso.');
      return;
    }
    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      const response = await fetch(`${API_URL}/users/me/`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || `Error del servidor [${response.status}]`);
      }
      const data: UserProfileData = await response.json();
      setProfileData(data);
    } catch (e: unknown) {
      const error = e as Error;
      setProfileError(error.message);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [session]);

  const fetchExamPapers = useCallback(
    async (showNotification = false) => {
      if (!session?.access_token) {
        setPapersError('No hay token.');
        return;
      }
      setIsLoadingPapers(true);
      setPapersError(null);
      try {
        const response = await fetch(`${API_URL}/exam_papers/`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: response.statusText }));
          throw new Error(errorData.detail || `Error del servidor [${response.status}]`);
        }
        const data: ExamPaper[] = await response.json();
        setExamPapers(data);
        if (showNotification) {
          setSnackbarMessage('Lista de redacciones actualizada.');
          setSnackbarSeverity('info');
          setSnackbarOpen(true);
        }
      } catch (e: unknown) {
        const error = e as Error;
        console.error('Error fetching exam papers:', e);
        setPapersError(error.message);
      } finally {
        setIsLoadingPapers(false);
      }
    },
    [session],
  );

  useEffect(() => {
    if (user && session) {
      fetchUserProfile();
      fetchExamPapers();
    }
  }, [user, session, fetchUserProfile, fetchExamPapers]);

  const openLightbox = (index: number) => {
    setLightboxImageIndex(index);
    setLightboxOpen(true);
  };
  const lightboxSlides = examPapers.filter((p) => p.image_url).map((p) => ({ src: p.image_url! }));

  const handleClickOpenDeleteDialog = (paper: ExamPaper) => {
    setPaperToDelete(paper);
    setOpenDeleteDialog(true);
  };
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setPaperToDelete(null);
  };
  const handleConfirmDelete = async () => {
    if (!paperToDelete || !session?.access_token) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/exam_papers/${paperToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.detail || `Error: ${res.statusText}`);
      setSnackbarMessage('Redacción eliminada con éxito.');
      setSnackbarSeverity('success');
      setExamPapers((p) => p.filter((i) => i.id !== paperToDelete.id));
      fetchUserProfile();
    } catch (e: unknown) {
      const error = e as Error;
      setSnackbarMessage(`Error al eliminar: ${error.message}`);
      setSnackbarSeverity('error');
    } finally {
      setIsDeleting(false);
      handleCloseDeleteDialog();
      setSnackbarOpen(true);
    }
  };

  const handleTranscribe = async (paperId: number) => {
    if (!session?.access_token) {
      setSnackbarMessage('Error de autenticación.'); setSnackbarSeverity('error'); setSnackbarOpen(true); return;
    }
    setIsTranscribingId(paperId);
    setSnackbarMessage('Iniciando transcripción...'); setSnackbarSeverity('info'); setSnackbarOpen(true);
    try {
      const response = await fetch(`${API_URL}/exam_papers/${paperId}/transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const responseData: ExamPaper | { detail: string } = await response.json();
      if (!response.ok) {
        const detailMessage = (responseData as { detail: string }).detail || `Error ${response.status}`;
        throw new Error(detailMessage);
      }
      const updatedPaper = responseData as ExamPaper;
      setExamPapers((prevPapers) => prevPapers.map((p) => (p.id === paperId ? { ...p, ...updatedPaper } : p)));
      setSnackbarMessage(`Transcripción para '${updatedPaper.filename || 'ID: ' + paperId}' completada.`);
      setSnackbarSeverity('success');
      fetchUserProfile();
      // Abrir editor después de transcribir automáticamente
      handleOpenTranscriptionEditor(updatedPaper);
    } catch (e: unknown) {
      const error = e as Error;
      console.error('Error transcribing exam paper:', e);
      setSnackbarMessage(`Error en transcripción: ${error.message}`);
      setSnackbarSeverity('error');
      setExamPapers((prevPapers) => prevPapers.map((p) => (p.id === paperId ? { ...p, status: 'error_transcription' } : p)));
    } finally {
      setIsTranscribingId(null);
      setSnackbarOpen(true);
    }
  };

  const handleOpenTranscriptionEditor = (paper: ExamPaper) => {
    setEditingPaper(paper);
    setEditableTranscriptionText(paper.transcribed_text || '');
    setOpenTranscriptionEditor(true);
  };
  const handleCloseTranscriptionEditor = () => {
    setOpenTranscriptionEditor(false);
    setEditingPaper(null);
    setEditableTranscriptionText('');
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
      const responseData: ExamPaper | { detail: string } = await response.json();
      if (!response.ok) {
        const detailMessage = (responseData as { detail: string }).detail || `Error ${response.status}`;
        throw new Error(detailMessage);
      }
      const updatedPaper = responseData as ExamPaper;
      setExamPapers((prevPapers) => prevPapers.map((p) => (p.id === editingPaper.id ? { ...p, ...updatedPaper } : p)));
      setSnackbarMessage('Transcripción actualizada con éxito.');
      setSnackbarSeverity('success');
      handleCloseTranscriptionEditor();
    } catch (e: unknown) {
      const error = e as Error;
      console.error('Error saving edited transcription:', e);
      setSnackbarMessage(`Error al guardar: ${error.message}`);
      setSnackbarSeverity('error');
    } finally {
      setIsSavingTranscription(false);
      setSnackbarOpen(true);
    }
  };


  const handleCorrect = async (paperId: number) => {
    if (!session?.access_token) {
      setSnackbarMessage('Error de autenticación.'); setSnackbarSeverity('error'); setSnackbarOpen(true); return;
    }
    setIsCorrectingId(paperId);
    setSnackbarMessage('Iniciando corrección...'); setSnackbarSeverity('info'); setSnackbarOpen(true);
    try {
      const response = await fetch(`${API_URL}/exam_papers/${paperId}/correct`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const responseData: ExamPaper | { detail: string } = await response.json();
      if (!response.ok) {
        const detailMessage = (responseData as { detail: string }).detail || `Error ${response.status}`;
        throw new Error(detailMessage);
      }
      const updatedPaper = responseData as ExamPaper;
      setExamPapers((prevPapers) => prevPapers.map((p) => (p.id === paperId ? { ...p, ...updatedPaper } : p)));
      setSnackbarMessage(`Corrección para '${updatedPaper.filename || 'ID: ' + paperId}' completada.`);
      setSnackbarSeverity('success');
      fetchUserProfile();
    } catch (e: unknown) {
      const error = e as Error;
      console.error('Error correcting exam paper:', e);
      setSnackbarMessage(`Error en corrección: ${error.message}`);
      setSnackbarSeverity('error');
      setExamPapers((prevPapers) => prevPapers.map((p) => (p.id === paperId ? { ...p, status: 'error_correction' } : p)));
    } finally {
      setIsCorrectingId(null);
      setSnackbarOpen(true);
    }
  };

  const handleOpenCorrectionDialog = (feedback: string | null | undefined) => {
    setCurrentCorrectionFeedback(feedback || 'No hay feedback de corrección disponible.');
    setOpenCorrectionDialog(true);
  };
  const handleCloseCorrectionDialog = () => setOpenCorrectionDialog(false);

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  if (authLoading) {
    return (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}><CircularProgress size={60} /><Typography sx={{ ml: 2 }}>Cargando sesión...</Typography></Box>);
  }
  if (!user || !session) return null;

  const quotaReached = profileData ? profileData.current_paper_count >= profileData.max_paper_quota : false;
  const getStatusDisplay = (paper: ExamPaper): string => {
    if (isTranscribingId === paper.id) return 'Transcribiendo...';
    if (isCorrectingId === paper.id) return 'Corrigiendo...';
    // Puedes añadir mapeos más amigables para los estados de error si lo deseas
    const statusMap: { [key: string]: string } = {
      uploaded: 'Subido',
      transcribing: 'Transcribiendo...',
      transcribed: 'Transcrito',
      correcting: 'Corrigiendo...',
      corrected: 'Corregido',
      error_transcription: 'Error Transcripción',
      error_correction: 'Error Corrección',
    };
    return statusMap[paper.status] || paper.status;
  };

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">Dashboard del Profesor</Typography>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="body1">¡Bienvenido, {user.email}!</Typography>
            {profileData && (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 1, color: 'text.secondary' }}><AccountBalanceWalletIcon fontSize="small" /><Typography variant="body2">Créditos: {profileData.credits ?? 'N/A'}</Typography></Box>)}
          </Box>
          {profileData && (<Typography variant="subtitle1" color={quotaReached ? 'error.main' : 'text.secondary'} sx={{ mb: 3, textAlign: 'center', fontWeight: quotaReached ? 'bold' : 'normal' }}>Redacciones: {profileData.current_paper_count} / {profileData.max_paper_quota} {quotaReached && <span style={{ marginLeft: '8px' }}>(Límite)</span>}</Typography>)}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3, justifyContent: 'center' }}>
            <Button variant="contained" color="primary" component={Link} href="/upload-exam" sx={{ py: 1.5, minWidth: '200px' }} disabled={quotaReached || isLoadingProfile || authLoading}>Subir Redacción</Button>
            <Button variant="outlined" onClick={fetchUserProfile} disabled={isLoadingProfile || authLoading} sx={{ py: 1.5, minWidth: '200px' }}>{isLoadingProfile ? <CircularProgress size={24} /> : `Refrescar Perfil`}</Button>
          </Box>
          {profileError && !profileData && <Alert severity="error" sx={{ mt: 2, mb: 2 }}>Error al cargar perfil: {profileError}</Alert>}
          
          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}><Typography variant="h5" component="h2">Mis Redacciones</Typography><IconButton onClick={() => { fetchExamPapers(true); fetchUserProfile(); }} disabled={isLoadingPapers || isLoadingProfile} color="primary"><RefreshIcon /></IconButton></Box>
            {papersError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar redacciones: {papersError}</Alert>}
            {isLoadingPapers && !papersError && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
            {!isLoadingPapers && examPapers.length === 0 && !papersError && (<Typography sx={{ textAlign: 'center', color: 'text.secondary', my: 3 }}>No has subido redacciones. <Link href="/upload-exam" style={{ color: 'primary.main' }}>Sube una</Link>.</Typography>)}
            {!isLoadingPapers && examPapers.length > 0 && (
              <TableContainer component={Paper} elevation={2}>
                <Table sx={{ minWidth: 950 }} aria-label="tabla de redacciones">
                  <TableHead sx={{ backgroundColor: 'primary.dark' }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ID</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nombre</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Estado</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Subido</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Imagen</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Transcripción</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Corrección</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {examPapers.map((paper) => {
                      const canTranscribeAI = (paper.status === 'uploaded' || paper.status === 'error_transcription');
                      const canReviewOrEditTranscription = paper.transcribed_text !== null && paper.transcribed_text !== undefined; // Permitir revisar/editar si hay texto, independientemente del estado inicial.

                      const canCorrect = paper.status === 'transcribed' && !!paper.transcribed_text;
                      const canViewCorrection = paper.status === 'corrected' && !!paper.corrected_feedback;
                      
                      const isProcessing = isTranscribingId === paper.id || isCorrectingId === paper.id;

                      return (
                        <TableRow key={paper.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: 'action.hover' } }}>
                          <TableCell>{paper.id}</TableCell>
                          <TableCell sx={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={paper.filename || undefined}>{paper.filename || 'N/A'}</TableCell>
                          <TableCell>{getStatusDisplay(paper)}</TableCell>
                          <TableCell>{new Date(paper.created_at).toLocaleDateString()}</TableCell>
                          <TableCell align="center">{paper.image_url && (<IconButton onClick={() => openLightbox(lightboxSlides.findIndex((slide) => slide.src === paper.image_url))} size="small"><ImageIcon /></IconButton>)}</TableCell>
                          
                          <TableCell align="center">
                            {canReviewOrEditTranscription || paper.status === 'transcribed' ? (
                              <Button size="small" variant="outlined" color="info" startIcon={<EditNoteIcon />} onClick={() => handleOpenTranscriptionEditor(paper)} disabled={isProcessing} sx={{ minWidth: '120px' }}>
                                Revisar
                              </Button>
                            ) : canTranscribeAI ? (
                              <Button size="small" variant="outlined" startIcon={isTranscribingId === paper.id ? <CircularProgress size={16} /> : <TextFieldsIcon />} onClick={() => handleTranscribe(paper.id)} disabled={isProcessing} sx={{ minWidth: '120px' }}>
                                {isTranscribingId === paper.id ? 'Procesando' : 'Transcribir'}
                              </Button>
                            ) : ( <Typography variant="caption" color="textSecondary">-</Typography> )}
                          </TableCell>

                          <TableCell align="center">
                            {canViewCorrection ? (
                              <IconButton size="small" color="success" onClick={() => handleOpenCorrectionDialog(paper.corrected_feedback)}><VisibilityIcon fontSize="inherit" /></IconButton>
                            ) : (
                              <Button size="small" variant="outlined" color="secondary" startIcon={isCorrectingId === paper.id ? <CircularProgress size={16} /> : <SpellcheckIcon />} onClick={() => handleCorrect(paper.id)} disabled={!canCorrect || isProcessing} sx={{ minWidth: '120px' }}>
                                {isCorrectingId === paper.id ? 'Procesando' : 'Corregir'}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleClickOpenDeleteDialog(paper)} disabled={isDeleting && paperToDelete?.id === paper.id || isProcessing}><DeleteIcon fontSize="inherit" /></IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Paper>
      </Container>

      <Lightbox open={lightboxOpen} close={() => setLightboxOpen(false)} slides={lightboxSlides} index={lightboxImageIndex} />

      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent><DialogContentText>¿Seguro que quieres eliminar la redacción '{paperToDelete?.filename || `ID: ${paperToDelete?.id}`}'?</DialogContentText></DialogContent>
        <DialogActions><Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>Cancelar</Button><Button onClick={handleConfirmDelete} color="error" autoFocus disabled={isDeleting}>{isDeleting ? <CircularProgress size={20} /> : 'Eliminar'}</Button></DialogActions>
      </Dialog>

      {/* Diálogo para Editar Transcripción */}
      <Dialog
        open={openTranscriptionEditor}
        onClose={handleCloseTranscriptionEditor}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { height: '90vh', maxHeight: 'calc(100% - 64px)' } }} // 64px es un margen típico
      >
        <DialogTitle>Revisar y Editar Transcripción {editingPaper ? `(ID: ${editingPaper.id} - ${editingPaper.filename || 'Sin nombre'})` : ''}</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, p: 1, overflow: 'hidden' }}>
          <Box sx={{ flex: { xs: 1, md: 0.5 }, overflowY: 'auto', border: '1px solid', borderColor: 'divider', p: 0.5, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            {editingPaper?.image_url ? (
              <img src={editingPaper.image_url} alt={`Redacción de ${editingPaper.filename || 'estudiante'}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (<Typography>No hay imagen disponible.</Typography>)}
          </Box>
          <Box sx={{ flex: { xs: 1, md: 0.5 }, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <TextField
              multiline
              fullWidth
              value={editableTranscriptionText}
              onChange={(e) => setEditableTranscriptionText(e.target.value)}
              variant="outlined"
              placeholder="Texto transcrito..."
              sx={{ 
                flexGrow: 1, 
                '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' }, // Contenedor del textarea
                '& .MuiInputBase-inputMultiline': { height: '100% !important', overflowY: 'auto !important', p:1 } // El textarea en sí
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTranscriptionEditor} disabled={isSavingTranscription}>Cancelar</Button>
          <Button onClick={handleSaveEditedTranscription} variant="contained" disabled={isSavingTranscription} startIcon={isSavingTranscription ? <CircularProgress size={16} /> : null}>
            {isSavingTranscription ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para Feedback de Corrección */}
      <Dialog open={openCorrectionDialog} onClose={handleCloseCorrectionDialog} maxWidth="lg" fullWidth>
        <DialogTitle>Feedback de Corrección</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ '& h1': { typography: 'h4', mt: 2, mb: 1 }, '& h2': { typography: 'h5', mt: 2, mb: 1 }, '& h3': { typography: 'h6', mt: 2, mb: 0.5 }, '& p': { typography: 'body1', mb: 1 }, '& ul': { pl: 3, mb: 1, listStylePosition: 'outside' }, '& li': { mb: 0.5 }, '& strong': { fontWeight: 'bold' }, '& blockquote': { borderLeft: '4px solid', borderColor: 'divider', pl: 2, ml: 0, my: 1, fontStyle: 'italic', color: 'text.secondary' }, '& pre': { backgroundColor: 'action.hover', p: 1, borderRadius: 1, overflowX: 'auto', my:1 }, '& code': { fontFamily: 'monospace', backgroundColor: 'action.selected', px: 0.5, borderRadius: 0.5, fontSize: '0.9em' }}}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentCorrectionFeedback}</ReactMarkdown>
          </Box>
        </DialogContent>
        <DialogActions><Button onClick={handleCloseCorrectionDialog}>Cerrar</Button></DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }} variant="filled">{snackbarMessage}</Alert>
      </Snackbar>
    </>
  );
}
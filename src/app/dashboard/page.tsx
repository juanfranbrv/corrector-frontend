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
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import TextFieldsIcon from '@mui/icons-material/TextFields'; // Para Transcribir
import SpellcheckIcon from '@mui/icons-material/Spellcheck'; // Para Corregir
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';

import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

// Para renderizar Markdown  (opcional pero recomendado)
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Para tablas, footnotes, etc. en Markdown

const API_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://127.0.0.1:8000'; // Asegúrate que sea la URL correcta

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
  // Nuevos campos para corrección
  corrected_feedback?: string | null;
  correction_credits_consumed?: number;
  correction_prompt_version?: string | null;
  corrected_at?: string | null; // La API devuelve datetime, aquí lo trataremos como string
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
  const [openTranscriptionDialog, setOpenTranscriptionDialog] = useState(false);
  const [currentTranscriptionText, setCurrentTranscriptionText] = useState('');

  // Nuevos estados para corrección
  const [isCorrectingId, setIsCorrectingId] = useState<number | null>(null);
  const [openCorrectionDialog, setOpenCorrectionDialog] = useState(false);
  const [currentCorrectionFeedback, setCurrentCorrectionFeedback] = useState('');

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
        const errorData = await response
          .json()
          .catch(() => ({ detail: response.statusText }));
        throw new Error(
          errorData.detail || `Error del servidor [${response.status}]`,
        );
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
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            errorData.detail || `Error del servidor [${response.status}]`,
          );
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
  const lightboxSlides = examPapers
    .filter((p) => p.image_url)
    .map((p) => ({ src: p.image_url! }));

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
      const res = await fetch(
        `${API_URL}/exam_papers/${paperToDelete.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.detail || `Error: ${res.statusText}`);
      setSnackbarMessage('Redacción eliminada con éxito.');
      setSnackbarSeverity('success');
      setExamPapers((p) => p.filter((i) => i.id !== paperToDelete.id));
      fetchUserProfile(); // Actualizar contador y créditos
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
      setSnackbarMessage('Error de autenticación.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    setIsTranscribingId(paperId);
    setSnackbarMessage('Iniciando transcripción...');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
    try {
      const response = await fetch(
        `${API_URL}/exam_papers/${paperId}/transcribe`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      const responseData: ExamPaper | { detail: string } =
        await response.json();
      if (!response.ok) {
        const detailMessage =
          (responseData as { detail: string }).detail || `Error ${response.status}`;
        throw new Error(detailMessage);
      }
      const updatedPaper = responseData as ExamPaper;
      setExamPapers((prevPapers) =>
        prevPapers.map((p) => (p.id === paperId ? { ...p, ...updatedPaper } : p)),
      );
      setSnackbarMessage(
        `Transcripción para '${updatedPaper.filename || 'ID: ' + paperId}' completada.`,
      );
      setSnackbarSeverity('success');
      fetchUserProfile(); // Actualizar créditos
    } catch (e: unknown) {
      const error = e as Error;
      console.error('Error transcribing exam paper:', e);
      setSnackbarMessage(`Error en transcripción: ${error.message}`);
      setSnackbarSeverity('error');
      setExamPapers((prevPapers) =>
        prevPapers.map((p) =>
          p.id === paperId ? { ...p, status: 'error_transcription' } : p,
        ),
      );
    } finally {
      setIsTranscribingId(null);
      setSnackbarOpen(true);
    }
  };

  const handleCorrect = async (paperId: number) => {
    if (!session?.access_token) {
      setSnackbarMessage('Error de autenticación.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    setIsCorrectingId(paperId);
    setSnackbarMessage('Iniciando corrección...');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
    try {
      const response = await fetch(
        `${API_URL}/exam_papers/${paperId}/correct`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      const responseData: ExamPaper | { detail: string } =
        await response.json();
      if (!response.ok) {
        const detailMessage =
          (responseData as { detail: string }).detail || `Error ${response.status}`;
        throw new Error(detailMessage);
      }
      const updatedPaper = responseData as ExamPaper;
      setExamPapers((prevPapers) =>
        prevPapers.map((p) => (p.id === paperId ? { ...p, ...updatedPaper } : p)),
      );
      setSnackbarMessage(
        `Corrección para '${updatedPaper.filename || 'ID: ' + paperId}' completada.`,
      );
      setSnackbarSeverity('success');
      fetchUserProfile(); // Actualizar créditos
    } catch (e: unknown) {
      const error = e as Error;
      console.error('Error correcting exam paper:', e);
      setSnackbarMessage(`Error en corrección: ${error.message}`);
      setSnackbarSeverity('error');
      setExamPapers((prevPapers) =>
        prevPapers.map((p) =>
          p.id === paperId ? { ...p, status: 'error_correction' } : p,
        ),
      );
    } finally {
      setIsCorrectingId(null);
      setSnackbarOpen(true);
    }
  };

  const handleOpenTranscriptionDialog = (text: string | null | undefined) => {
    setCurrentTranscriptionText(text || 'No hay texto transcrito disponible.');
    setOpenTranscriptionDialog(true);
  };
  const handleCloseTranscriptionDialog = () => setOpenTranscriptionDialog(false);

  const handleOpenCorrectionDialog = (feedback: string | null | undefined) => {
    setCurrentCorrectionFeedback(feedback || 'No hay feedback de corrección disponible.');
    setOpenCorrectionDialog(true);
  };
  const handleCloseCorrectionDialog = () => setOpenCorrectionDialog(false);


  const handleCloseSnackbar = (
    event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <CircularProgress size={60} /> <Typography sx={{ ml: 2 }}>Cargando sesión...</Typography>
      </Box>
    );
  }
  if (!user || !session) return null;

  const quotaReached = profileData
    ? profileData.current_paper_count >= profileData.max_paper_quota
    : false;

  const getStatusDisplay = (paper: ExamPaper): string => {
    if (isTranscribingId === paper.id) return 'Transcribiendo...';
    if (isCorrectingId === paper.id) return 'Corrigiendo...';
    // Puedes añadir mapeos más amigables si quieres
    // ej. "error_transcription" -> "Error en Transcripción"
    return paper.status;
  };

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Dashboard del Profesor
          </Typography>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="body1">¡Bienvenido, {user.email}!</Typography>
            {profileData && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 1, color: 'text.secondary' }}>
                <AccountBalanceWalletIcon fontSize="small" />
                <Typography variant="body2">Créditos disponibles: {profileData.credits ?? 'N/A'}</Typography>
              </Box>
            )}
          </Box>
          {profileData && (
            <Typography variant="subtitle1" color={quotaReached ? 'error.main' : 'text.secondary'} sx={{ mb: 3, textAlign: 'center', fontWeight: quotaReached ? 'bold' : 'normal' }}>
              Redacciones Subidas: {profileData.current_paper_count} / {profileData.max_paper_quota} {quotaReached && <span style={{ marginLeft: '8px' }}>(Límite alcanzado)</span>}
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3, justifyContent: 'center' }}>
            <Button variant="contained" color="primary" component={Link} href="/upload-exam" sx={{ py: 1.5, minWidth: '200px' }} disabled={quotaReached || isLoadingProfile || authLoading}>
              Subir Nueva Redacción
            </Button>
            <Button variant="outlined" onClick={fetchUserProfile} disabled={isLoadingProfile || authLoading} sx={{ py: 1.5, minWidth: '200px' }}>
              {isLoadingProfile ? <CircularProgress size={24} /> : `Refrescar Perfil (${profileData?.current_paper_count ?? '?'}/${profileData?.max_paper_quota ?? '?'})`}
            </Button>
          </Box>
          {profileError && !profileData && <Alert severity="error" sx={{ mt: 2, mb: 2 }}>Error al cargar perfil: {profileError}</Alert>}
          
          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" component="h2">Mis Redacciones Subidas</Typography>
              <IconButton onClick={() => { fetchExamPapers(true); fetchUserProfile(); }} disabled={isLoadingPapers || isLoadingProfile} color="primary" aria-label="refrescar todo">
                <RefreshIcon />
              </IconButton>
            </Box>
            {papersError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar redacciones: {papersError}</Alert>}
            {isLoadingPapers && !papersError && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
            {!isLoadingPapers && examPapers.length === 0 && !papersError && (
              <Typography sx={{ textAlign: 'center', color: 'text.secondary', my: 3 }}>
                Aún no has subido ninguna redacción. ¡Empieza <Link href="/upload-exam" style={{ color: 'primary.main' }}>subiendo una</Link>!
              </Typography>
            )}
            {!isLoadingPapers && examPapers.length > 0 && (
              <TableContainer component={Paper} elevation={2}>
                <Table sx={{ minWidth: 950 }} aria-label="tabla de redacciones"> {/* Aumentado minWidth para nueva columna */}
                  <TableHead sx={{ backgroundColor: 'primary.dark' }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ID</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nombre Archivo</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Estado</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Subido el</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Imagen</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Transcripción</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Corrección</TableCell> {/* Nueva Columna */}
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {examPapers.map((paper) => {
                      const canTranscribe = (paper.status === 'uploaded' || paper.status === 'error_transcription') && !isTranscribingId && !isCorrectingId;
                      const canViewTranscription = paper.status === 'transcribed' || paper.status === 'correcting' || paper.status === 'corrected' || paper.status === 'error_correction';
                      
                      const canCorrect = paper.status === 'transcribed' && !!paper.transcribed_text && !isTranscribingId && !isCorrectingId;
                      const canViewCorrection = (paper.status === 'corrected' || paper.status === 'error_correction_final') && !!paper.corrected_feedback; // Podrías añadir un estado final para errores de corrección si quieres diferenciar

                      return (
                        <TableRow key={paper.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: 'action.hover' } }}>
                          <TableCell>{paper.id}</TableCell>
                          <TableCell sx={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={paper.filename || undefined}>
                            {paper.filename || 'N/A'}
                          </TableCell>
                          <TableCell>{getStatusDisplay(paper)}</TableCell>
                          <TableCell>{new Date(paper.created_at).toLocaleDateString()}</TableCell>
                          <TableCell align="center">
                            {paper.image_url && (
                              <IconButton onClick={() => openLightbox(lightboxSlides.findIndex((slide) => slide.src === paper.image_url))} size="small" aria-label={`ver imagen ${paper.filename}`}>
                                <ImageIcon />
                              </IconButton>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {canViewTranscription && paper.transcribed_text ? (
                              <IconButton size="small" color="info" onClick={() => handleOpenTranscriptionDialog(paper.transcribed_text)}>
                                <VisibilityIcon fontSize="inherit" />
                              </IconButton>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={isTranscribingId === paper.id ? <CircularProgress size={16} /> : <TextFieldsIcon />}
                                onClick={() => handleTranscribe(paper.id)}
                                disabled={!canTranscribe || isTranscribingId === paper.id}
                                sx={{ minWidth: '120px' }}
                              >
                                {isTranscribingId === paper.id ? 'En Proceso' : 'Transcribir'}
                              </Button>
                            )}
                          </TableCell>
                          {/* Celda de Corrección */}
                          <TableCell align="center">
                            {canViewCorrection ? (
                              <IconButton size="small" color="success" onClick={() => handleOpenCorrectionDialog(paper.corrected_feedback)}>
                                <VisibilityIcon fontSize="inherit" />
                              </IconButton>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                startIcon={isCorrectingId === paper.id ? <CircularProgress size={16} /> : <SpellcheckIcon />}
                                onClick={() => handleCorrect(paper.id)}
                                disabled={!canCorrect || isCorrectingId === paper.id}
                                sx={{ minWidth: '120px' }}
                              >
                                {isCorrectingId === paper.id ? 'En Proceso' : 'Corregir'}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleClickOpenDeleteDialog(paper)} disabled={isDeleting && paperToDelete?.id === paper.id || isTranscribingId === paper.id || isCorrectingId === paper.id} aria-label={`eliminar redacción ${paper.filename || paper.id}`}>
                              <DeleteIcon fontSize="inherit" />
                            </IconButton>
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
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que quieres eliminar la redacción '{paperToDelete?.filename || `ID: ${paperToDelete?.id}`}'? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus disabled={isDeleting}>
            {isDeleting ? <CircularProgress size={20} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openTranscriptionDialog} onClose={handleCloseTranscriptionDialog} maxWidth="md" fullWidth>
        <DialogTitle>Texto Transcrito</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{currentTranscriptionText}</Typography>
        </DialogContent>
        <DialogActions><Button onClick={handleCloseTranscriptionDialog}>Cerrar</Button></DialogActions>
      </Dialog>

      {/* Diálogo para Feedback de Corrección */}
      <Dialog open={openCorrectionDialog} onClose={handleCloseCorrectionDialog} maxWidth="lg" fullWidth>
        <DialogTitle>Feedback de Corrección</DialogTitle>
        <DialogContent dividers>
          {/* Usar ReactMarkdown para renderizar el feedback */}
          <Box sx={{ 
            '& h1': { typography: 'h4', mt: 2, mb: 1 },
            '& h2': { typography: 'h5', mt: 2, mb: 1 },
            '& h3': { typography: 'h6', mt: 2, mb: 0.5 },
            '& p': { typography: 'body1', mb: 1 },
            '& ul': { pl: 2, mb: 1 },
            '& li': { mb: 0.5 },
            '& strong': { fontWeight: 'bold' },
            '& em': { fontStyle: 'italic' },
            '& blockquote': { borderLeft: '4px solid #ccc', pl: 2, ml: 0, fontStyle: 'italic', color: 'text.secondary' },
            '& pre': { backgroundColor: 'grey.100', p: 1, borderRadius: 1, overflowX: 'auto' },
            '& code': { fontFamily: 'monospace', backgroundColor: 'grey.200', px: 0.5, borderRadius: 0.5 },
          }}>
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
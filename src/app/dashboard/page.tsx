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
import TextFieldsIcon from '@mui/icons-material/TextFields';
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
      const response = await fetch('http://localhost:8000/users/me/', {
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
        const response = await fetch('http://localhost:8000/exam_papers/', {
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
        `http://localhost:8000/exam_papers/${paperToDelete.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.detail || res.statusText);
      setSnackbarMessage(d?.message || 'Redacción eliminada.');
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
        `http://localhost:8000/exam_papers/${paperId}/transcribe`,
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
      setExamPapers((p) =>
        p.map((i) => (i.id === paperId ? { ...i, ...updatedPaper } : i)),
      );
      setSnackbarMessage(
        `Transcripción para &apos;${
          updatedPaper.filename || 'ID: ' + paperId
        }&apos; completada.`,
      );
      setSnackbarSeverity('success');
      fetchUserProfile();
    } catch (e: unknown) {
      const error = e as Error;
      console.error('Error transcribing exam paper:', e);
      setSnackbarMessage(`Error en transcripción: ${error.message}`);
      setSnackbarSeverity('error');
      setExamPapers((p) =>
        p.map((i) =>
          i.id === paperId ? { ...i, status: 'error_transcription' } : i,
        ),
      );
    } finally {
      setIsTranscribingId(null);
      setSnackbarOpen(true);
    }
  };
  const handleOpenTranscriptionDialog = (
    text: string | null | undefined,
  ) => {
    setCurrentTranscriptionText(text || 'No hay texto.');
    setOpenTranscriptionDialog(true);
  };
  const handleCloseTranscriptionDialog = () =>
    setOpenTranscriptionDialog(false);

  const handleCloseSnackbar = (
    event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  if (authLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 64px)',
        }}
      >
        <CircularProgress size={60} />
        <Typography sx={{ ml: 2 }}>Cargando sesión...</Typography>
      </Box>
    );
  }
  if (!user || !session) {
    return null;
  }

  const quotaReached = profileData
    ? profileData.current_paper_count >= profileData.max_paper_quota
    : false;

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Dashboard del Profesor
          </Typography>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="body1">
              ¡Bienvenido, {user.email}!
            </Typography>
            {profileData && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 1,
                  mt: 1,
                  color: 'text.secondary',
                }}
              >
                <AccountBalanceWalletIcon fontSize="small" />
                <Typography variant="body2">
                  Créditos disponibles: {profileData.credits ?? 'N/A'}
                </Typography>
              </Box>
            )}
          </Box>
          {profileData && (
            <Typography
              variant="subtitle1"
              color={quotaReached ? 'error.main' : 'text.secondary'}
              sx={{
                mb: 3,
                textAlign: 'center',
                fontWeight: quotaReached ? 'bold' : 'normal',
              }}
            >
              Redacciones Subidas: {profileData.current_paper_count} /{' '}
              {profileData.max_paper_quota}{' '}
              {quotaReached && (
                <span style={{ marginLeft: '8px' }}>(Límite alcanzado)</span>
              )}
            </Typography>
          )}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              mb: 3,
              justifyContent: 'center',
            }}
          >
            <Button
              variant="contained"
              color="primary"
              component={Link}
              href="/upload-exam"
              sx={{ py: 1.5, minWidth: '200px' }}
              disabled={quotaReached || isLoadingProfile || authLoading}
            >
              Subir Nueva Redacción
            </Button>
            <Button
              variant="outlined"
              onClick={fetchUserProfile}
              disabled={isLoadingProfile || authLoading}
              sx={{ py: 1.5, minWidth: '200px' }}
            >
              {isLoadingProfile ? (
                <CircularProgress size={24} />
              ) : (
                `Refrescar Perfil (${profileData?.current_paper_count ?? '?'}/${
                  profileData?.max_paper_quota ?? '?'
                })`
              )}
            </Button>
          </Box>
          {profileError && !profileData && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              Error al cargar perfil: {profileError}
            </Alert>
          )}
          <Box sx={{ mt: 4 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="h5" component="h2">
                Mis Redacciones Subidas
              </Typography>
              <IconButton
                onClick={() => {
                  fetchExamPapers(true);
                  fetchUserProfile();
                }}
                disabled={isLoadingPapers || isLoadingProfile}
                color="primary"
                aria-label="refrescar todo"
              >
                <RefreshIcon />
              </IconButton>
            </Box>
            {papersError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Error al cargar redacciones: {papersError}
              </Alert>
            )}
            {isLoadingPapers && !papersError && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  my: 3,
                }}
              >
                <CircularProgress />
              </Box>
            )}
            {!isLoadingPapers &&
              examPapers.length === 0 &&
              !papersError && (
                <Typography
                  sx={{
                    textAlign: 'center',
                    color: 'text.secondary',
                    my: 3,
                  }}
                >
                  Aún no has subido ninguna redacción. ¡Empieza{' '}
                  <Link href="/upload-exam" style={{ color: 'primary.main' }}>
                    subiendo una
                  </Link>
                  !
                </Typography>
              )}
            {!isLoadingPapers && examPapers.length > 0 && (
              <TableContainer component={Paper} elevation={2}>
                <Table sx={{ minWidth: 850 }} aria-label="tabla de redacciones">
                  <TableHead sx={{ backgroundColor: 'primary.dark' }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                        ID
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                        Nombre Archivo
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                        Estado
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                        Subido el
                      </TableCell>
                      <TableCell
                        sx={{
                          color: 'white',
                          fontWeight: 'bold',
                          textAlign: 'center',
                        }}
                      >
                        Imagen
                      </TableCell>
                      <TableCell
                        sx={{
                          color: 'white',
                          fontWeight: 'bold',
                          textAlign: 'center',
                        }}
                      >
                        Transcripción
                      </TableCell>
                      <TableCell
                        sx={{
                          color: 'white',
                          fontWeight: 'bold',
                          textAlign: 'center',
                        }}
                      >
                        Acciones
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {examPapers.map((paper) => {
                      const isCurrentlyTranscribing =
                        isTranscribingId === paper.id;
                      const canTranscribe =
                        paper.status === 'uploaded' ||
                        paper.status === 'error_transcription';
                      const canViewTranscription =
                        paper.status === 'transcribed' &&
                        paper.transcribed_text;
                      return (
                        <TableRow
                          key={paper.id}
                          sx={{
                            '&:last-child td, &:last-child th': { border: 0 },
                            '&:hover': { backgroundColor: 'action.hover' },
                          }}
                        >
                          <TableCell>{paper.id}</TableCell>
                          <TableCell
                            sx={{
                              maxWidth: '150px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={paper.filename || undefined}
                          >
                            {paper.filename || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {isCurrentlyTranscribing
                              ? 'Transcribiendo...'
                              : paper.status}
                          </TableCell>
                          <TableCell>
                            {new Date(paper.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell align="center">
                            {paper.image_url && (
                              <IconButton
                                onClick={() =>
                                  openLightbox(
                                    lightboxSlides.findIndex(
                                      (slide) =>
                                        slide.src === paper.image_url,
                                    ),
                                  )
                                }
                                size="small"
                                aria-label={`ver imagen ${paper.filename}`}
                              >
                                <ImageIcon />
                              </IconButton>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {canViewTranscription ? (
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() =>
                                  handleOpenTranscriptionDialog(
                                    paper.transcribed_text,
                                  )
                                }
                              >
                                <VisibilityIcon fontSize="inherit" />
                              </IconButton>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={
                                  isCurrentlyTranscribing ? (
                                    <CircularProgress size={16} />
                                  ) : (
                                    <TextFieldsIcon />
                                  )
                                }
                                onClick={() => handleTranscribe(paper.id)}
                                disabled={
                                  isCurrentlyTranscribing || !canTranscribe
                                }
                                sx={{ minWidth: '120px' }}
                              >
                                {isCurrentlyTranscribing
                                  ? 'En Proceso'
                                  : 'Transcribir'}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleClickOpenDeleteDialog(paper)}
                              disabled={
                                isDeleting && paperToDelete?.id === paper.id
                              }
                              aria-label={`eliminar redacción ${
                                paper.filename || paper.id
                              }`}
                            >
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

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides}
        index={lightboxImageIndex}
      />

      {/* Diálogo eliminar */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que quieres eliminar la redacción&nbsp;
            &apos;{paperToDelete?.filename || `ID: ${paperToDelete?.id}`}&apos;?
            <br />
            Esta acción no se puede deshacer y también eliminará la imagen
            asociada.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            autoFocus
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={20} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo transcripción */}
      <Dialog
        open={openTranscriptionDialog}
        onClose={handleCloseTranscriptionDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Texto Transcrito</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {currentTranscriptionText}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTranscriptionDialog}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

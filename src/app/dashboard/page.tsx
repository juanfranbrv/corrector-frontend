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

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

// Interfaz para UserProfileData (debe coincidir con UserStatusResponse del backend)
interface UserProfileData {
  sub: string;
  email?: string;
  aud?: string;
  role?: string;
  exp?: number;
  current_paper_count: number;
  max_paper_quota: number;
}

// Interfaz para ExamPaper (debe coincidir con models.ExamPaperRead del backend)
interface ExamPaper {
  id: number;
  filename: string | null;
  image_url: string | null;
  status: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [examPapers, setExamPapers] = useState<ExamPaper[]>([]);
  const [isLoadingPapers, setIsLoadingPapers] = useState<boolean>(false);
  const [papersError, setPapersError] = useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<ExamPaper | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

  // Protección de Ruta
  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) {
      router.replace('/auth');
    }
  }, [user, session, authLoading, router]);

  // Cargar Perfil del Usuario (incluye info de cuota)
  const fetchUserProfile = useCallback(async () => {
    if (!session?.access_token) {
      setProfileError("No hay token de acceso disponible.");
      return;
    }
    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      const response = await fetch('http://localhost:8000/users/me/', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || `Error del servidor [${response.status}]`);
      }
      const data: UserProfileData = await response.json();
      setProfileData(data);
    } catch (e: any) {
      setProfileError(e.message);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [session]);

  // Cargar Lista de Redacciones
  const fetchExamPapers = useCallback(async () => {
    if (!session?.access_token) {
      setPapersError("No hay token de acceso para cargar las redacciones.");
      return;
    }
    setIsLoadingPapers(true);
    setPapersError(null);
    try {
      const response = await fetch('http://localhost:8000/exam_papers/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || `Error del servidor [${response.status}]`);
      }
      const data: ExamPaper[] = await response.json();
      setExamPapers(data);
    } catch (e: any) {
      console.error("Error fetching exam papers:", e);
      setPapersError(e.message);
    } finally {
      setIsLoadingPapers(false);
    }
  }, [session]);

  // Cargar datos iniciales cuando la sesión esté disponible
  useEffect(() => {
    if (session) {
      fetchUserProfile();
      fetchExamPapers();
    }
  }, [session, fetchUserProfile, fetchExamPapers]);

  // Funciones para Lightbox
  const openLightbox = (index: number) => {
    setLightboxImageIndex(index);
    setLightboxOpen(true);
  };
  const lightboxSlides = examPapers
    .filter(paper => paper.image_url)
    .map(paper => ({ src: paper.image_url! }));

  // Funciones para Diálogo de Eliminación
  const handleClickOpenDeleteDialog = (paper: ExamPaper) => {
    setPaperToDelete(paper);
    setOpenDeleteDialog(true);
  };
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setPaperToDelete(null);
  };
  const handleConfirmDelete = async () => {
    if (!paperToDelete || !session?.access_token) {
      setSnackbarMessage("Error: No se pudo identificar la redacción o falta el token.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`http://localhost:8000/exam_papers/${paperToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const responseData = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(responseData?.detail || `Error al eliminar: ${response.statusText}`);
      }
      setSnackbarMessage(responseData?.message || "Redacción eliminada exitosamente.");
      setSnackbarSeverity("success");
      setExamPapers(prevPapers => prevPapers.filter(p => p.id !== paperToDelete.id));
      fetchUserProfile(); // Actualizar la información de cuota
    } catch (e: any) {
      console.error("Error deleting exam paper:", e);
      setSnackbarMessage(`Error al eliminar: ${e.message}`);
      setSnackbarSeverity("error");
    } finally {
      setIsDeleting(false);
      handleCloseDeleteDialog();
      setSnackbarOpen(true);
    }
  };

  // Función para Snackbar
  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  // Renderizado condicional mientras carga la autenticación
  if (authLoading || (!user && !authLoading && !router.asPath.startsWith('/auth'))) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <CircularProgress />
      </Box>
    );
  }
  // Si después de la carga no hay usuario (ya debería haber redirigido)
  if (!user || !session) return null;

  // Calcular si la cuota ha sido alcanzada
  const quotaReached = profileData ? profileData.current_paper_count >= profileData.max_paper_quota : false;

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Dashboard del Profesor
          </Typography>
          <Typography variant="body1" gutterBottom sx={{ mb: 1, textAlign: 'center' }}>
            ¡Bienvenido, {user.email}!
          </Typography>
          
          {profileData && (
            <Typography variant="subtitle1" color={quotaReached ? "error.main" : "text.secondary"} sx={{ mb: 3, textAlign: 'center', fontWeight: quotaReached ? 'bold' : 'normal' }}>
              Redacciones Subidas: {profileData.current_paper_count} / {profileData.max_paper_quota}
              {quotaReached && <span style={{ marginLeft: '8px' }}>(Límite alcanzado)</span>}
            </Typography>
          )}

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3, justifyContent:'center' }}>
              <Button
                variant="contained"
                color="primary"
                component={Link}
                href="/upload-exam"
                sx={{ py: 1.5, minWidth: '200px' }}
                disabled={quotaReached || isLoadingProfile}
              >
                Subir Nueva Redacción
              </Button>
              <Button
                variant="outlined"
                onClick={fetchUserProfile}
                disabled={isLoadingProfile}
                sx={{ py: 1.5, minWidth: '200px' }}
              >
                {isLoadingProfile ? <CircularProgress size={24} /> : `Refrescar Perfil ${isLoadingProfile ? "" : `(${profileData?.current_paper_count ?? '?'}/${profileData?.max_paper_quota ?? '?'})`}`}
              </Button>
          </Box>

          {profileError && !profileData && <Alert severity="error" sx={{ mt: 2, mb: 2 }}>Error al cargar perfil: {profileError}</Alert>}
          {/* Ya no es necesario mostrar profileData aquí si solo se usa para la cuota y el email de bienvenida */}

          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" component="h2">
                Mis Redacciones Subidas
              </Typography>
              <IconButton onClick={() => { fetchExamPapers(); fetchUserProfile(); }} disabled={isLoadingPapers || isLoadingProfile} color="primary" aria-label="refrescar todo">
                {isLoadingPapers || isLoadingProfile ? <CircularProgress size={24} /> : <RefreshIcon />}
              </IconButton>
            </Box>

            {papersError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar redacciones: {papersError}</Alert>}
            
            {!isLoadingPapers && examPapers.length === 0 && !papersError && (
              <Typography sx={{textAlign: 'center', color: 'text.secondary', my:3}}>
                  Aún no has subido ninguna redacción. ¡Empieza <Link href="/upload-exam" style={{color: 'primary.main'}}>subiendo una</Link>!
              </Typography>
            )}

            {examPapers.length > 0 && (
              <TableContainer component={Paper} elevation={2}>
                <Table sx={{ minWidth: 750 }} aria-label="tabla de redacciones">
                  <TableHead sx={{ backgroundColor: 'primary.dark' }}> {/* Un poco más oscuro para el header */}
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ID</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nombre Archivo</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Estado</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Subido el</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign:'center' }}>Imagen</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign:'center' }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {examPapers.map((paper) => (
                      <TableRow
                        key={paper.id}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': {backgroundColor: 'action.hover'}}}
                      >
                        <TableCell component="th" scope="row">{paper.id}</TableCell>
                        <TableCell sx={{maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={paper.filename || undefined}>{paper.filename || "N/A"}</TableCell>
                        <TableCell>{paper.status}</TableCell>
                        <TableCell>{new Date(paper.created_at).toLocaleDateString()}</TableCell>
                        <TableCell align="center">
                          {paper.image_url && (
                            <IconButton onClick={() => openLightbox(lightboxSlides.findIndex(slide => slide.src === paper.image_url))} size="small" aria-label={`ver imagen ${paper.filename}`}>
                              <ImageIcon />
                            </IconButton>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleClickOpenDeleteDialog(paper)}
                            aria-label={`eliminar redacción ${paper.filename || paper.id}`}
                            disabled={isDeleting && paperToDelete?.id === paper.id} // Deshabilitar solo el botón del ítem que se está eliminando
                          >
                           {isDeleting && paperToDelete?.id === paper.id ? <CircularProgress size={20} color="inherit"/> : <DeleteIcon fontSize="inherit" />}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
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

      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirmar Eliminación
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            ¿Estás seguro de que quieres eliminar la redacción "{paperToDelete?.filename || `ID: ${paperToDelete?.id}`}"?
            Esta acción no se puede deshacer y también eliminará la imagen asociada.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary" disabled={isDeleting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus disabled={isDeleting}>
            {isDeleting ? <CircularProgress size={20} /> : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }} variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
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
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import IconButton from '@mui/material/IconButton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';

import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EditNoteIcon from '@mui/icons-material/EditNote';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';

const API_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://127.0.0.1:8000';

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
  const [openCorrectionDialog, setOpenCorrectionDialog] = useState(false);
  const [currentCorrectionFeedback, setCurrentCorrectionFeedback] = useState('');

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

  const handleOpenCorrectionDialog = (feedback: string | null | undefined) => {
    setCurrentCorrectionFeedback(feedback || 'No hay feedback de corrección.'); setOpenCorrectionDialog(true);
  };
  const handleCloseCorrectionDialog = () => setOpenCorrectionDialog(false);
  const handleCloseSnackbar = (_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  if (authLoading) return (<Box sx={{display:'flex',justifyContent:'center',alignItems:'center',height:'calc(100vh - 64px)'}}><CircularProgress size={60}/><Typography sx={{ml:2}}>Cargando...</Typography></Box>);
  if (!user || !session) return null;

  const quotaReached = profileData ? profileData.current_paper_count >= profileData.max_paper_quota : false;
  const getStatusDisplay = (paper: ExamPaper): string => {
    if (isTranscribingId === paper.id) return 'Transcribiendo IA...';
    if (isCorrectingId === paper.id) return 'Corrigiendo IA...';
    const statusMap: { [key: string]: string } = {
      uploaded: 'Subido', transcribed: 'Transcrito', correcting: 'Corrigiendo IA...', corrected: 'Corregido',
      error_transcription: 'Error Transcripción', error_correction: 'Error Corrección',
    };
    return statusMap[paper.status] || paper.status;
  };
  
  const sortedEditingPaperImages = editingPaper?.images ? 
    [...editingPaper.images].sort((a, b) => (a.page_number || 0) - (b.page_number || 0)) 
    : [];

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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'flex-start' }}>
                {examPapers.map((paper) => {
                  const isProcessingAny = isTranscribingId === paper.id || isCorrectingId === paper.id || isSavingTranscription;
                  const canTranscribeAI = (paper.status === 'uploaded' || paper.status === 'error_transcription') && (!paper.transcribed_text || paper.transcribed_text.trim() === "");
                  const canReviewEditTranscription = paper.status === 'transcribed' || paper.status === 'error_transcription' || (paper.status === 'uploaded' && paper.transcribed_text && paper.transcribed_text.trim() !== "");
                  const canCorrect = paper.status === 'transcribed' && !!paper.transcribed_text && paper.transcribed_text.trim() !== "";
                  const canViewCorrection = paper.status === 'corrected' && !!paper.corrected_feedback;
                  const extract = paper.transcribed_text ? paper.transcribed_text.slice(0, 120) + (paper.transcribed_text.length > 120 ? '...' : '') : 'Sin transcripción.';
                  return (
                    <Card key={paper.id} elevation={2} sx={{ width: 260, minHeight: 180, m: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <CardContent sx={{ flexGrow: 1, p: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom noWrap>{paper.filename || `Redacción ${paper.id}`}</Typography>
                        <Typography variant="caption" color="text.secondary">Estado: {getStatusDisplay(paper)}</Typography><br/>
                        <Typography variant="caption" color="text.secondary">Subido: {new Date(paper.created_at).toLocaleDateString()}</Typography>
                        <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace', whiteSpace: 'pre-line', fontSize: '0.95em', minHeight: 32, maxHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {extract}
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, px: 2, pb: 1 }}>
                        <Button size="small" variant="contained" color="primary" component={Link} href={`/essay/${paper.id}`} sx={{ minWidth: 0, flex: 1 }}>Ver / Editar</Button>
                        {canReviewEditTranscription ? (
                          <Button size="small" variant="outlined" color="info" startIcon={<EditNoteIcon/>} onClick={()=>handleOpenTranscriptionEditor(paper)} disabled={isProcessingAny} sx={{ minWidth: 0 }}>Revisar</Button>
                        ) : canTranscribeAI ? (
                          <Button size="small" variant="outlined" startIcon={isTranscribingId===paper.id?<CircularProgress size={16}/>:<TextFieldsIcon/>} onClick={()=>handleTranscribe(paper.id)} disabled={isProcessingAny || paper.images.length === 0} sx={{ minWidth: 0 }}>{isTranscribingId===paper.id?'Procesando':'Transcribir IA'}</Button>
                        ) : null}
                        {canViewCorrection ? (
                          <IconButton size="small" color="success" onClick={()=>handleOpenCorrectionDialog(paper.corrected_feedback)}><VisibilityIcon/></IconButton>
                        ) : (
                          <Button size="small" variant="outlined" color="secondary" startIcon={isCorrectingId===paper.id?<CircularProgress size={16}/>:<SpellcheckIcon/>} onClick={()=>handleCorrect(paper.id)} disabled={!canCorrect || isProcessingAny} sx={{ minWidth: 0 }}>{isCorrectingId===paper.id?'Procesando':'Corregir'}</Button>
                        )}
                        <IconButton size="small" color="error" onClick={()=>handleClickOpenDeleteDialog(paper)} disabled={(isDeleting&&paperToDelete?.id===paper.id)||isProcessingAny}><DeleteIcon/></IconButton>
                      </CardActions>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Box>
        </Paper>
      </Container>
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
          <Box sx={{ flex: { xs: '1 1 auto', md: '0 1 45%' }, display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', p: 0.5, overflow: 'hidden', minHeight: { xs: '200px', md: 'auto' } }}>
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
          <Button onClick={handleSaveEditedTranscription} variant="contained" disabled={isSavingTranscription} startIcon={isSavingTranscription?<CircularProgress size={16}/>:null}>{isSavingTranscription?'Guardando...':'Guardar Cambios'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openCorrectionDialog} onClose={handleCloseCorrectionDialog} maxWidth="lg" fullWidth PaperProps={{ sx: { maxHeight: '90vh'}}}>
        <DialogTitle>Feedback de Corrección</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ "& h1":{typography:'h4',mt:2,mb:1}, "& h2":{typography:'h5',mt:2,mb:1}, "& h3":{typography:'h6',mt:2,mb:0.5}, "& p":{typography:'body1',mb:1,lineHeight:1.6}, "& ul":{pl:3,mb:1,listStylePosition:'outside'}, "& li":{mb:0.75,lineHeight:1.5}, "& strong":{fontWeight:'bold'}, "& blockquote":{borderLeft:'4px solid',borderColor:'divider',pl:2,ml:0,my:1,fontStyle:'italic',color:'text.secondary'}, "& pre":{backgroundColor:'action.hover',p:1.5,borderRadius:1,overflowX:'auto',my:1,fontSize:'0.9em'}, "& code":{fontFamily:'monospace',backgroundColor:'action.selected',px:0.5,py:0.25,borderRadius:0.5,fontSize:'0.9em'} }}>
            {/* ...contenido de feedback... */}
          </Box>
        </DialogContent>
        <DialogActions><Button onClick={handleCloseCorrectionDialog}>Cerrar</Button></DialogActions>
      </Dialog>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{vertical:'bottom',horizontal:'center'}}><Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{width:'100%'}} variant="filled">{snackbarMessage}</Alert></Snackbar>
    </>
  );
}

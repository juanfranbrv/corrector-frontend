// src/app/essay/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://127.0.0.1:8000';

export default function EssayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [paper, setPaper] = useState<any>(null);
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

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!paper) return null;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" gutterBottom>Redacción: {paper.filename || `ID: ${paper.id}`}</Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>Estado: {paper.status}</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>Subido: {new Date(paper.created_at).toLocaleDateString()}</Typography>
        {paper.images && paper.images.length > 0 && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', my: 2 }}>
            {paper.images.map((img: { id: number; image_url: string; page_number?: number }) => (
              <Box key={img.id} sx={{ width: 120, height: 160, border: '1px solid #eee', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                <Image src={img.image_url} alt={`Página ${img.page_number || ''}`} width={120} height={160} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
    </Container>
  );
}

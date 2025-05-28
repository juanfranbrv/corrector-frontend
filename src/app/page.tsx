// src/app/page.tsx
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

export default function HomePage() {
  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          my: 4,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Hola Mundo Frontend! (Next.js + MUI + Tailwind)
        </Typography>
        <Button variant="contained" color="primary">
          Test MUI Button
        </Button>
        <div className="mt-4 p-2 bg-blue-100 text-blue-700">
          Tailwind CSS test div
        </div>
      </Box>
    </Container>
  );
}
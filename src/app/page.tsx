// src/app/page.tsx
'use client';

import React, { useState } from 'react'; // useEffect eliminado si no se usa
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

// Interfaz para TestItem (si aún la usas o como referencia)
interface TestItem {
  id: number;
  name: string;
  description?: string | null;
}

export default function HomePage() {
  const [items, setItems] = useState<TestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://localhost:8000';

  const fetchTestItems = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setItems([]);

    try {
      const response = await fetch(`${backendUrl}/test_items/`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Error desconocido del servidor.' }));
        throw new Error(errorData.detail || `Error del servidor: ${response.status}`);
      }
      const data: TestItem[] = await response.json();
      setItems(data);
      setSuccessMessage(data.length > 0 ? 'Items cargados.' : 'No hay items para mostrar.');
    } catch (e: unknown) { // Corregido: e: unknown
      const err = e as Error; // Type assertion
      console.error("Error fetching test items:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createTestItem = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const newItemName = `Test Item ${new Date().toLocaleTimeString()}`;
    const newItemDescription = 'Creado desde el frontend.';

    try {
      const response = await fetch(`${backendUrl}/test_items/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItemName, description: newItemDescription }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Error desconocido del servidor.' }));
        throw new Error(errorData.detail || `Error del servidor: ${response.status}`);
      }
      const createdItem: TestItem = await response.json();
      setSuccessMessage(`Item "${createdItem.name}" creado.`);
      fetchTestItems(); // Recargar lista
    } catch (e: unknown) { // Corregido: e: unknown
      const err = e as Error; // Type assertion
      console.error('Error al intentar crear un test item:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h3" component="h1" sx={{ mb: 2 }}>
          Página de Inicio / Pruebas
        </Typography>
        <Typography sx={{ mb: 4 }}>
          Esta página se usó para las pruebas iniciales de TestItems y CORS.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button variant="contained" onClick={fetchTestItems} disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : 'Cargar Test Items'}
          </Button>
          <Button variant="contained" color="secondary" onClick={createTestItem} disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : 'Crear Test Item'}
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 600 }}>{error}</Alert>}
        {successMessage && <Alert severity="success" sx={{ mb: 2, width: '100%', maxWidth: 600 }}>{successMessage}</Alert>}

        {items.length > 0 && (
          <Box sx={{ width: '100%', maxWidth: 600, bgcolor: 'background.paper', mt: 2 }}>
            <Typography variant="h6">Test Items desde el Backend:</Typography>
            <List>
              {items.map((item) => (
                <ListItem key={item.id}>
                  <ListItemText
                    primary={`${item.id}: ${item.name}`}
                    secondary={item.description || 'Sin descripción'}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Box>
    </Container>
  );
}
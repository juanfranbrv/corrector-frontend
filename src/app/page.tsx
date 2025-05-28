// src/app/page.tsx
'use client'; // Necesario para useState, useEffect y event handlers (onClick)

import React, { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

// Definimos una interfaz para el tipo de dato que esperamos del backend
interface TestItem {
  id: number;
  name: string;
  description?: string | null; // description puede ser string, null o undefined
}

export default function HomePage() {
  const [items, setItems] = useState<TestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [corsTestMessage, setCorsTestMessage] = useState<string>('');

  const backendUrl = 'http://localhost:8000'; // URL base de tu API backend

  const fetchTestItems = async () => {
    setIsLoading(true);
    setError(null);
    setCorsTestMessage('');
    setItems([]); // Limpiar items previos

    try {
      const response = await fetch(`${backendUrl}/test_items/`);

      if (!response.ok) {
        // Si la respuesta no es OK, podría ser un error de red, un 404, 500, o un error CORS
        // si el navegador bloqueó la respuesta antes de poder leer el status.
        // Un error CORS típico no permitiría siquiera leer el `response.status` aquí.
        // Lo detectaríamos más bien en la consola del navegador.
        const errorText = await response.text(); // Intentar obtener más info del error
        throw new Error(
          `Error del servidor: ${response.status} ${response.statusText}. Detalles: ${errorText}`
        );
      }

      const data: TestItem[] = await response.json();
      setItems(data);
      setCorsTestMessage(
        data.length > 0
          ? 'Datos recibidos del backend exitosamente (CORS OK)'
          : 'Conexión al backend exitosa, no hay items (CORS OK)'
      );
    } catch (e: any) {
      console.error('Error al intentar obtener test items:', e);
      setError(
        `Error al contactar el backend. Revisa la consola del navegador para detalles de CORS. Mensaje: ${e.message}`
      );
      // El mensaje de error 'e.message' podría ser genérico como "Failed to fetch"
      // si es un problema de CORS o de red a bajo nivel.
      setCorsTestMessage('Fallo al obtener datos del backend (Posible problema de CORS o red)');
    } finally {
      setIsLoading(false);
    }
  };

  const createTestItem = async () => {
    setIsLoading(true);
    setError(null);
    setCorsTestMessage('');

    const newItemName = `Item de Prueba ${new Date().toLocaleTimeString()}`;
    const newItemDescription = 'Creado desde el frontend para probar CORS';

    try {
      const response = await fetch(`${backendUrl}/test_items/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Aquí no se necesita 'Access-Control-Allow-Origin' desde el cliente
        },
        body: JSON.stringify({ name: newItemName, description: newItemDescription }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Error del servidor al crear: ${response.status} ${response.statusText}. Detalles: ${errorText}`
        );
      }

      const createdItem: TestItem = await response.json();
      setCorsTestMessage(`Item "${createdItem.name}" creado exitosamente! (CORS OK)`);
      // Volver a cargar la lista para ver el nuevo item
      fetchTestItems();
    } catch (e: any) {
      console.error('Error al intentar crear un test item:', e);
      setError(
        `Error al crear item en el backend. Revisa la consola del navegador. Mensaje: ${e.message}`
      );
      setCorsTestMessage('Fallo al crear item (Posible problema de CORS o red)');
    } finally {
      setIsLoading(false);
    }
  };


  // Cargar items al montar el componente (opcional)
  // useEffect(() => {
  //   fetchTestItems();
  // }, []);

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          my: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Prueba de Conexión Frontend-Backend (CORS)
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button variant="contained" onClick={fetchTestItems} disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : 'Cargar Items (GET)'}
          </Button>
          <Button variant="contained" color="secondary" onClick={createTestItem} disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : 'Crear Item de Prueba (POST)'}
          </Button>
        </Box>

        {corsTestMessage && (
          <Alert severity={error ? "error" : "success"} sx={{ mb: 2, width: '100%', maxWidth: 600 }}>
            {corsTestMessage}
          </Alert>
        )}

        {error && !corsTestMessage.includes("CORS OK") && ( // Mostrar solo si no es un error dentro de un "CORS OK"
          <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 600 }}>
            {error}
          </Alert>
        )}

        {items.length > 0 && (
          <Box sx={{ width: '100%', maxWidth: 600, bgcolor: 'background.paper', mt: 2 }}>
            <Typography variant="h6">Items desde el Backend:</Typography>
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
         <div className="mt-4 p-2 bg-blue-100 text-blue-700">
            Tailwind CSS test div (para verificar que sigue funcionando)
        </div>
      </Box>
    </Container>
  );
}
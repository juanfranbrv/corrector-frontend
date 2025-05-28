// src/components/theme.ts
import { Roboto } from 'next/font/google';
import { createTheme } from '@mui/material/styles';

export const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const theme = createTheme({
  palette: {
    mode: 'light', // o 'dark'
  },
  typography: {
    fontFamily: roboto.style.fontFamily,
  },
});

export default theme;
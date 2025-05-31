// src/components/ThemeRegistry.tsx
'use client';
import createCache, { Options as EmotionCacheOptions } from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme'; 
import React from 'react';

export default function ThemeRegistry(props: { options?: EmotionCacheOptions, children: React.ReactNode }) {
  const { options, children } = props;

  const [{ cache, flush }] = React.useState(() => {
    const cacheInstance = createCache(options || { key: 'mui' });
    cacheInstance.compat = true;
    const prevInsert = cacheInstance.insert;
    let inserted: string[] = [];
    cacheInstance.insert = (...args) => {
      const serialized = args[1];
      if (cacheInstance.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };
    return { cache: cacheInstance, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) {
      return null;
    }
    let styles = '';
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{
          __html: styles,
        }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
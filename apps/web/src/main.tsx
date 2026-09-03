import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { BrandingBootstrap } from './components/common/BrandingBootstrap';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppRouter } from './routes/AppRouter';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <BrandingBootstrap>
          <ErrorBoundary>
            <AppRouter />
          </ErrorBoundary>
          <Toaster richColors position="top-right" />
        </BrandingBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

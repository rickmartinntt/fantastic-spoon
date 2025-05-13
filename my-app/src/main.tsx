import React from 'react';
import ReactDOM from 'react-dom/client';

import { RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// optional, but handy while developing
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { router } from './lib/router';  // your route tree
import './index.css';

// create one QueryClient for the whole app
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {/* Dev-tools show cache, retries, etc.  Remove in prod if you like */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);
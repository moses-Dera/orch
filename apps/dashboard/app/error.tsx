'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertOctagon, RefreshCcw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if available
    console.error('Global Error Boundary Caught:', error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-6 text-center max-w-md p-8 border rounded-xl bg-card shadow-sm">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertOctagon className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            A critical error occurred while loading this page. Our team has been notified.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-muted rounded-md text-left text-xs font-mono overflow-auto max-h-32 text-muted-foreground">
              {error.message}
            </div>
          )}
        </div>
        <div className="pt-4 w-full">
          <Button onClick={() => reset()} className="w-full gap-2">
            <RefreshCcw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

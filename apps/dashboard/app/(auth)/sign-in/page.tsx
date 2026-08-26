'use client';
import { useSignIn, useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

export default function SignInPage() {
  const { signIn, setActive } = useSignIn() as any;
  const { isSignedIn } = useAuth();
  const isLoaded = !!signIn;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, router]);

  const handleOAuth = async (strategy: 'oauth_google' | 'oauth_github') => {
    if (!isLoaded || !signIn) return;
    setError(null);
    try {
      if (typeof window !== 'undefined' && (window as any).Clerk) {
        const clerk = (window as any).Clerk;
        
        // Try Clerk v6 top-level authenticateWithRedirect first (if it exists)
        if (typeof clerk.authenticateWithRedirect === 'function') {
          await clerk.authenticateWithRedirect({
            strategy,
            redirectUrl: '/sso-callback',
            redirectUrlComplete: '/',
          });
          return;
        }
        
        // Fallback to client.signIn.authenticateWithRedirect (Clerk v5 logic)
        if (clerk.client?.signIn && typeof clerk.client.signIn.authenticateWithRedirect === 'function') {
          await clerk.client.signIn.authenticateWithRedirect({
            strategy,
            redirectUrl: '/sso-callback',
            redirectUrlComplete: '/',
          });
          return;
        }
        
        // If we reach here, we log what methods actually exist on the global Clerk object for debugging
        const clerkMethods = Object.keys(clerk).filter(k => typeof clerk[k] === 'function');
        const signInMethods = clerk.client?.signIn ? Object.keys(clerk.client.signIn).filter(k => typeof clerk.client.signIn[k] === 'function') : [];
        console.error("Clerk Methods:", clerkMethods);
        console.error("SignIn Methods:", signInMethods);
        throw new Error("authenticateWithRedirect not found on window.Clerk");
      }
      
      throw new Error("window.Clerk not found");
    } catch (err: any) {
      console.error('OAuth failed', err);
      const isAlreadySignedIn = err?.message?.includes("already signed in") || err?.errors?.[0]?.message?.includes("already signed in");
      if (isAlreadySignedIn) {
         router.push('/');
         return;
      }
      setError(err?.errors?.[0]?.message || err?.message || 'OAuth sign-in failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setError(null);
    setSubmitting(true);

    try {
      let result: any = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        window.location.href = '/';
        return;
      }

      if (result.status === 'needs_first_factor') {
        const passwordFactor = result.supportedFirstFactors?.find((f: any) => f.strategy === 'password');
        if (passwordFactor) {
          result = await signIn.attemptFirstFactor({
            strategy: 'password',
            password,
          });
        }
      }

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        window.location.href = '/';
      } else if (result.status === 'needs_second_factor') {
        setError('2FA verification is required for this account.');
      } else {
        setError('Sign in incomplete. Please verify your credentials.');
      }
    } catch (err: any) {
      console.error('Error signing in', err);
      setError(err?.errors?.[0]?.message || err?.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex w-full items-center justify-center px-4 sm:px-0">
      <div className="w-full max-w-md p-5 sm:p-8 shadow-2xl rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center tracking-tight text-[var(--text-primary)]">Sign in to Orch</h1>
        <p className="text-center mb-6 text-sm text-[var(--text-secondary)]">Centralized Control Plane for Policy-as-Code</p>

        {error && (
          <div className="mb-6 p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1 bg-transparent text-[var(--text-primary)] hover:bg-[var(--border)] border-[var(--border)] cursor-pointer"
            onClick={() => handleOAuth('oauth_github')}
            disabled={!isLoaded}
          >
            <GithubIcon className="w-4 h-4 mr-2" />
            GitHub
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1 bg-transparent text-[var(--text-primary)] hover:bg-[var(--border)] border-[var(--border)] cursor-pointer"
            onClick={() => handleOAuth('oauth_google')}
            disabled={!isLoaded}
          >
            Google
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[var(--border)]" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="px-2 bg-[var(--surface)] text-[var(--text-secondary)]">Or continue with email</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide mb-1 text-[var(--text-secondary)]">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
              placeholder="cto@company.com"
              disabled={!isLoaded || submitting}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide mb-1 text-[var(--text-secondary)]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
              placeholder="••••••••"
              disabled={!isLoaded || submitting}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={!isLoaded || submitting}
            className="w-full mt-4 bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] font-semibold py-2.5 transition-colors cursor-pointer"
          >
            {submitting ? 'Signing in...' : isLoaded ? 'Sign In' : 'Loading...'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Don't have an account?{' '}
          <Link href="/sign-up" className="text-[var(--accent)] hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

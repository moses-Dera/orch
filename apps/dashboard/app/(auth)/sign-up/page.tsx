'use client';
import { useSignUp } from '@clerk/nextjs';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

export default function SignUpPage() {
  const { signUp, setActive } = useSignUp() as any;
  const isLoaded = !!signUp;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleOAuth = async (strategy: 'oauth_google' | 'oauth_github') => {
    if (!isLoaded || !signUp) return;
    setError(null);
    try {
      if (typeof signUp.authenticateWithRedirect === 'function') {
        await signUp.authenticateWithRedirect({
          strategy,
          redirectUrl: '/sso-callback',
          redirectUrlComplete: '/onboarding',
        });
      } else if (typeof signUp.sso === 'function') {
        const result = await signUp.sso({
          strategy,
          redirectUrl: `${window.location.origin}/sso-callback`,
          redirectUrlComplete: `${window.location.origin}/onboarding`,
        });
        if (result?.redirectUrl) {
          window.location.href = result.redirectUrl;
        }
      }
    } catch (err: any) {
      console.error('OAuth failed', err);
      setError(err?.errors?.[0]?.message || err?.message || 'OAuth sign-up failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setError(null);
    setSubmitting(true);

    try {
      const attempt = await signUp.create({
        emailAddress: email,
        password,
      });

      if (typeof attempt?.prepareVerification === 'function') {
        await attempt.prepareVerification({ strategy: 'email_code' });
      } else if (typeof attempt?.prepareEmailAddressVerification === 'function') {
        await attempt.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else if (typeof signUp?.prepareVerification === 'function') {
        await signUp.prepareVerification({ strategy: 'email_code' });
      } else {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      }
      setPendingVerification(true);
    } catch (err: any) {
      console.error('Error signing up', err);
      setError(err?.errors?.[0]?.message || err?.message || 'Error creating account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setError(null);
    setSubmitting(true);

    try {
      let completeSignUp: any;
      if (typeof signUp?.attemptVerification === 'function') {
        completeSignUp = await signUp.attemptVerification({ code });
      } else if (typeof signUp?.attemptEmailAddressVerification === 'function') {
        completeSignUp = await signUp.attemptEmailAddressVerification({ code });
      } else {
        completeSignUp = await signUp.create({ code });
      }

      if (completeSignUp?.status !== 'complete') {
        setError('Verification failed. Please check the code.');
      }
      if (completeSignUp?.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        router.push('/onboarding');
      }
    } catch (err: any) {
      console.error('Error verifying code', err);
      setError(err?.errors?.[0]?.message || err?.message || 'Invalid verification code');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex w-full items-center justify-center px-4 sm:px-0">
      <div className="w-full max-w-md p-5 sm:p-8 shadow-2xl rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center tracking-tight text-[var(--text-primary)]">Create your account</h1>
        <p className="text-center mb-6 text-sm text-[var(--text-secondary)]">Start governing your AI workflows with Policy-as-Code</p>

        {error && (
          <div className="mb-6 p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {!pendingVerification ? (
          <>
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
                {submitting ? 'Creating account...' : isLoaded ? 'Continue' : 'Loading...'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-[var(--accent)] hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-xs text-center text-[var(--text-secondary)]">
              We sent a verification code to <span className="font-semibold text-[var(--text-primary)]">{email}</span>. Please enter it below.
            </p>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide mb-1 text-[var(--text-secondary)]">Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
                placeholder="123456"
                disabled={submitting}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] font-semibold py-2.5 transition-colors cursor-pointer"
            >
              {submitting ? 'Verifying...' : 'Verify & Continue'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

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
  const router = useRouter();

  const handleOAuth = async (strategy: 'oauth_google' | 'oauth_github') => {
    if (!isLoaded) return;
    try {
      await signUp.sso({
        strategy,
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectCallbackUrl: `${window.location.origin}/onboarding`,
      });
    } catch (err: any) {
      console.error('OAuth failed', err);
      if (err.errors) {
        console.error('Clerk errors:', err.errors);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    try {
      const attempt = await signUp.create({
        emailAddress: email,
        password,
      });

      // Handle both modern and legacy Clerk SDK methods by calling it on the attempt object
      if (typeof (attempt as any).prepareVerification === 'function') {
        await (attempt as any).prepareVerification({ strategy: 'email_code' });
      } else if (typeof (attempt as any).prepareEmailAddressVerification === 'function') {
        await (attempt as any).prepareEmailAddressVerification({ strategy: 'email_code' });
      } else if (typeof (signUp as any).prepareVerification === 'function') {
        await (signUp as any).prepareVerification({ strategy: 'email_code' });
      } else {
        await (signUp as any).prepareEmailAddressVerification({ strategy: 'email_code' });
      }
      setPendingVerification(true);
    } catch (err: any) {
      console.error('Error signing up', err);
      if (err.errors) {
        console.error('Clerk errors:', err.errors);
      }
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    try {
      let completeSignUp;
      if (typeof (signUp as any).attemptVerification === 'function') {
        completeSignUp = await (signUp as any).attemptVerification({
          strategy: 'email_code',
          code,
        });
      } else {
        completeSignUp = await (signUp as any).attemptEmailAddressVerification({
          code,
        });
      }

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        router.push('/onboarding');
      } else {
        console.error('Sign up requires further steps', completeSignUp);
      }
    } catch (err) {
      console.error('Error verifying code', err);
    }
  };

  if (pendingVerification) {
    return (
      <div className="flex w-full items-center justify-center">
        <div className="w-full max-w-md p-8 shadow-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <h1 className="text-3xl font-bold mb-2 text-center tracking-tight" style={{ color: 'var(--text-primary)' }}>Check your email</h1>
          <p className="text-center mb-8 text-sm" style={{ color: 'var(--text-secondary)' }}>We sent a 6-digit code to {email}</p>
          
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2 focus:outline-none focus:ring-2"
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                placeholder="123456"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full mt-4 transition-all"
              style={{ backgroundColor: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius)' }}
              onMouseOver={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
              onMouseOut={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--accent)')}
            >
              Verify Email
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-center">
      <div className="w-full max-w-md p-8 shadow-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <h1 className="text-3xl font-bold mb-6 text-center tracking-tight" style={{ color: 'var(--text-primary)' }}>Create an account</h1>
        <p className="text-center mb-8 text-sm" style={{ color: 'var(--text-secondary)' }}>Start enforcing your organization's AI policies today.</p>

        <div className="flex gap-4 mb-6">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1 bg-transparent text-[var(--text-primary)] hover:bg-[var(--background)]"
            style={{ borderColor: 'var(--border)' }}
            onClick={() => handleOAuth('oauth_github')}
            disabled={!isLoaded}
          >
            <GithubIcon className="w-4 h-4 mr-2" />
            GitHub
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1 bg-transparent text-[var(--text-primary)] hover:bg-[var(--background)]"
            style={{ borderColor: 'var(--border)' }}
            onClick={() => handleOAuth('oauth_google')}
            disabled={!isLoaded}
          >
            Google
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[var(--border)]" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="px-2" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>Or continue with email</span></div>
        </div>


        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 focus:outline-none focus:ring-2 disabled:opacity-50"
              style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
              placeholder="cto@company.com"
              disabled={!isLoaded}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 focus:outline-none focus:ring-2 disabled:opacity-50"
              style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
              placeholder="••••••••"
              disabled={!isLoaded}
            />
          </div>
          <Button
            type="submit"
            disabled={!isLoaded}
            className="w-full mt-4 transition-all"
            style={{ backgroundColor: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius)' }}
            onMouseOver={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseOut={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--accent)')}
          >
            {isLoaded ? 'Sign Up' : 'Loading...'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/sign-in" className="hover:underline" style={{ color: 'var(--text-primary)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

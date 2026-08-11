'use client';
import { useSignIn } from '@clerk/nextjs';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const { signIn, setActive } = useSignIn() as any;
  const isLoaded = !!signIn;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        // Log the user in
        await setActive({ session: result.createdSessionId });
        // Redirect to protected dashboard
        router.push('/dashboard');
      } else {
        console.error('Sign in requires further steps:', result);
      }
    } catch (err) {
      console.error('Error signing in', err);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="w-full max-w-md p-8 shadow-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <h1 className="text-3xl font-bold mb-6 text-center tracking-tight" style={{ color: 'var(--text-primary)' }}>Sign in to Orch</h1>
        <p className="text-center mb-8 text-sm" style={{ color: 'var(--text-secondary)' }}>Centralized Control Plane for Policy-as-Code</p>
        
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
            {isLoaded ? 'Sign In' : 'Loading...'}
          </Button>
        </form>
      </div>
    </div>
  );
}

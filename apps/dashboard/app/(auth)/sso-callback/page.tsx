'use client';
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
        <p className="text-xs font-mono text-[var(--text-secondary)]">Completing secure sign-in...</p>
        <AuthenticateWithRedirectCallback
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          continueSignUpUrl="/onboarding"
          signUpForceRedirectUrl="/onboarding"
          signInForceRedirectUrl="/constraints"
          afterSignInUrl="/constraints"
          afterSignUpUrl="/onboarding"
        />
      </div>
    </div>
  );
}

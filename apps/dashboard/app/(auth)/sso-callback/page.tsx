import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SSOCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--text-secondary)] border-t-[var(--text-primary)]"></div>
        <p className="text-[var(--text-secondary)]">Completing sign in...</p>
        <AuthenticateWithRedirectCallback 
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
}

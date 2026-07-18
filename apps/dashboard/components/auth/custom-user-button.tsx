'use client';
import { useUser, useClerk } from '@clerk/nextjs';
import { useState } from 'react';
import { Button } from "@/components/ui/button";

export function CustomUserButton() {
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);

  if (!isLoaded || !user) return null;

  return (
    <div className="relative">
      <Button 
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 h-auto"
        style={{ borderRadius: 'var(--radius)' }}
      >
        <img 
          src={user.imageUrl} 
          alt="Profile" 
          className="w-8 h-8 rounded-full"
          style={{ border: '1px solid var(--border)' }}
        />
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.firstName}</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 shadow-xl overflow-hidden z-50" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.fullName}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{user.primaryEmailAddress?.emailAddress}</p>
          </div>
          <button 
            onClick={() => signOut()}
            className="w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80"
            style={{ color: 'var(--critical)' }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

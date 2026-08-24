'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/events');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex-grow flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors">
      <span className="text-gray-500 dark:text-gray-400 font-semibold text-sm">
        Redirecting...
      </span>
    </div>
  );
}

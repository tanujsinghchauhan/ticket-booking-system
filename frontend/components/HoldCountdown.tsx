'use client';

import { useEffect, useState } from 'react';

interface HoldCountdownProps {
  heldUntil: string | Date;
  onExpire?: () => void;
}

export function HoldCountdown({ heldUntil, onExpire }: HoldCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(heldUntil).getTime() - Date.now();
      return Math.max(0, Math.floor(difference / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        if (onExpire) {
          onExpire();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [heldUntil, onExpire]);

  if (timeLeft <= 0) {
    return <span className="text-red-500 font-semibold text-sm">Hold expired</span>;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="inline-flex items-center space-x-1.5 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-1 rounded border border-gray-300 dark:border-gray-700 text-sm">
      <span className="font-mono font-bold">{formattedTime}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">remaining</span>
    </div>
  );
}

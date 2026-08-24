'use client';

import React from 'react';

interface SeatProps {
  label: string;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  isHeldByMe: boolean;
  price?: number;
  onClick?: () => void;
  disabled?: boolean;
}

export function Seat({ label, status, isHeldByMe, price, onClick, disabled }: SeatProps) {
  let bgClass = 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50';
  let titleText = `Seat ${label} - Available`;

  if (price !== undefined) {
    titleText += ` ($${price})`;
  }

  if (status === 'BOOKED') {
    bgClass = 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed';
    titleText = `Seat ${label} - Booked`;
  } else if (status === 'HELD') {
    if (isHeldByMe) {
      bgClass = 'bg-blue-600 border-blue-700 text-white hover:bg-blue-700';
      titleText = `Seat ${label} - Held by you`;
    } else {
      bgClass = 'bg-yellow-100 border-yellow-200 text-yellow-700 cursor-not-allowed';
      titleText = `Seat ${label} - Held by another customer`;
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || status === 'BOOKED' || (status === 'HELD' && !isHeldByMe)}
      className={`w-10 h-10 flex flex-col items-center justify-center rounded border text-xs font-semibold select-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${bgClass}`}
      title={titleText}
    >
      <span>{label}</span>
      {price !== undefined && status === 'AVAILABLE' && (
        <span className="text-[9px] text-gray-500 font-normal">${price}</span>
      )}
    </button>
  );
}

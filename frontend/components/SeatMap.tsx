'use client';

import React from 'react';
import { Seat } from './Seat';

interface SeatData {
  id: string; // showSeatId
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  heldBy: string | null;
  seat: {
    id: string;
    row: string;
    number: number;
    label: string;
    categoryId: string;
    category: {
      name: string;
    };
  };
}

interface SeatMapProps {
  showSeats: SeatData[];
  currentUserId: string | null;
  onSeatClick: (showSeatId: string, currentStatus: 'AVAILABLE' | 'HELD' | 'BOOKED', isHeldByMe: boolean) => void;
  priceMap: Map<string, number>;
  disabled?: boolean;
}

export function SeatMap({ showSeats, currentUserId, onSeatClick, priceMap, disabled }: SeatMapProps) {
  // Group seats by row
  const seatsByRow = showSeats.reduce((acc, ss) => {
    const row = ss.seat.row;
    if (!acc[row]) acc[row] = [];
    acc[row].push(ss);
    return acc;
  }, {} as Record<string, SeatData[]>);

  // Sort seats in each row by number
  Object.keys(seatsByRow).forEach((row) => {
    seatsByRow[row]!.sort((a, b) => a.seat.number - b.seat.number);
  });

  // Sort rows alphabetically
  const sortedRows = Object.keys(seatsByRow).sort();

  return (
    <div className="flex flex-col items-center space-y-8 bg-white dark:bg-gray-900 p-6 rounded border border-gray-200 dark:border-gray-800">
      {/* Stage/Screen Indicator */}
      <div className="w-full max-w-md text-center py-2 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold tracking-widest rounded uppercase">
        Stage / Screen
      </div>

      {/* Seat Grid */}
      <div className="flex flex-col space-y-3 overflow-x-auto w-full max-w-full pb-4">
        {sortedRows.map((row) => (
          <div key={row} className="flex items-center justify-center space-x-3 min-w-max">
            {/* Row Label (Left) */}
            <span className="w-6 text-center text-sm font-bold text-gray-400 dark:text-gray-600 select-none">
              {row}
            </span>

            {/* Row Seats */}
            <div className="flex space-x-2">
              {seatsByRow[row]!.map((ss) => {
                const isHeldByMe = ss.status === 'HELD' && ss.heldBy === currentUserId;
                const price = priceMap.get(ss.seat.categoryId);

                return (
                  <Seat
                    key={ss.id}
                    label={ss.seat.label}
                    status={ss.status}
                    isHeldByMe={isHeldByMe}
                    price={price}
                    disabled={disabled}
                    onClick={() => onSeatClick(ss.id, ss.status, isHeldByMe)}
                  />
                );
              })}
            </div>

            {/* Row Label (Right) */}
            <span className="w-6 text-center text-sm font-bold text-gray-400 dark:text-gray-600 select-none">
              {row}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-600 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-800 w-full">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-white border border-gray-300 rounded" />
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-blue-600 border border-blue-700 rounded" />
          <span>Selected (Held by you)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-yellow-100 border border-yellow-200 rounded" />
          <span>Held by others</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-gray-100 border border-gray-200 rounded" />
          <span>Booked</span>
        </div>
      </div>
    </div>
  );
}

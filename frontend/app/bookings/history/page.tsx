'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getSession } from '@/lib/auth';

interface Seat {
  id: string;
  seat: {
    row: string;
    number: number;
    label: string;
  };
}

interface Show {
  startsAt: string;
  event: {
    title: string;
  };
  venue: {
    name: string;
  };
}

interface Booking {
  id: string;
  bookingRef: string;
  status: 'CONFIRMED' | 'CANCELLED';
  totalAmount: string;
  qrCodeUrl: string | null;
  createdAt: string;
  show: Show;
  seats: Seat[];
}

export default function BookingHistoryPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings/me');
      setBookings(response.data.bookings);
    } catch (err: any) {
      console.error('Failed to fetch bookings:', err);
      setError('Failed to load booking history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    fetchBookings();
  }, [router]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? This will release your seats.')) {
      return;
    }

    try {
      await api.post(`/bookings/${bookingId}/cancel`);
      alert('Booking cancelled successfully. Refund processed to original payment method.');
      fetchBookings(); // Reload list
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <span className="text-gray-500 dark:text-gray-400 font-semibold">Loading booking history...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          My Bookings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Review your purchase history, ticket QR codes, and cancellation options.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-4 rounded text-center mb-6">
          {error}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center rounded">
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-4">
            You haven't booked any tickets yet.
          </p>
          <button
            onClick={() => router.push('/events')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold focus:outline-none"
          >
            Find Events
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => {
            const startsAt = new Date(booking.show.startsAt);
            const formattedShowTime = startsAt.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const bookedDate = new Date(booking.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            const isCancelled = booking.status === 'CANCELLED';

            return (
              <div
                key={booking.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-6 flex flex-col md:flex-row justify-between gap-6 transition-colors shadow-sm"
              >
                <div className="flex-grow space-y-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded font-bold">
                      Ref: {booking.bookingRef}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                        isCancelled
                          ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                          : 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {booking.show.event.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {booking.show.venue.name} • {formattedShowTime}
                    </p>
                  </div>

                  <div className="text-sm">
                    <span className="font-bold text-gray-700 dark:text-gray-300">Seats: </span>
                    <span className="font-semibold text-gray-600 dark:text-gray-400">
                      {booking.seats.map((s) => s.seat.label).join(', ')}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-450 flex flex-wrap gap-4">
                    <div>
                      Booked on: <span className="font-semibold">{bookedDate}</span>
                    </div>
                    <div>
                      Total paid:{' '}
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        ${Number(booking.totalAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-between border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-6 md:pt-0 md:pl-6 min-w-[160px]">
                  {booking.qrCodeUrl && !isCancelled ? (
                    <div className="text-center">
                      <img
                        src={booking.qrCodeUrl}
                        alt="Ticket QR Code"
                        className="w-28 h-28 border border-gray-200 p-1.5 bg-white rounded"
                      />
                      <span className="text-[10px] text-gray-450 mt-1 block">
                        Present QR at entrance
                      </span>
                    </div>
                  ) : (
                    <div className="flex-grow flex items-center justify-center text-gray-400 dark:text-gray-650 text-xs">
                      {isCancelled ? 'Cancelled' : 'No QR available'}
                    </div>
                  )}

                  {!isCancelled && (
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      className="w-full mt-4 py-1.5 border border-red-200 hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded focus:outline-none transition-colors"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

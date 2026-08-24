'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { getSession } from '@/lib/auth';
import { SeatMap } from '@/components/SeatMap';
import { HoldCountdown } from '@/components/HoldCountdown';

interface SeatData {
  id: string; // showSeatId
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  heldBy: string | null;
  heldUntil: string | null;
  bookingId: string | null;
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

interface ShowDetails {
  id: string;
  startsAt: string;
  event: {
    title: string;
  };
  venue: {
    name: string;
  };
  prices: {
    categoryId: string;
    price: string;
    category: {
      name: string;
    };
  }[];
}

export default function SeatsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showId = searchParams.get('showId');

  const [show, setShow] = useState<ShowDetails | null>(null);
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);

  const [bookingResult, setBookingResult] = useState<any | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [waitlistCategory, setWaitlistCategory] = useState<string>('');
  const [waitlistJoining, setWaitlistJoining] = useState(false);
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);

  // Cache price map: categoryId -> price
  const priceMapRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setCurrentUserId(session.userId);

    if (!showId) {
      setError('Invalid show selection');
      setLoading(false);
      return;
    }

    const loadSeatMap = async () => {
      try {
        const response = await api.get(`/shows/${showId}/seatmap`);
        const { show: showData, seats: seatData } = response.data;
        setShow(showData);
        setSeats(seatData);

        // Populate priceMap
        const pMap = new Map<string, number>();
        showData.prices.forEach((p: any) => {
          pMap.set(p.categoryId, Number(p.price));
        });
        priceMapRef.current = pMap;

        // Restore active holds by current user
        const activeHolds = seatData.filter(
          (s: any) => s.status === 'HELD' && s.heldBy === session.userId
        );
        if (activeHolds.length > 0) {
          setSelectedSeatIds(activeHolds.map((h: any) => h.id));
          // Set hold expiry based on closest expiration time
          const times = activeHolds
            .map((h: any) => new Date(h.heldUntil).getTime())
            .filter((t: any) => t > Date.now());
          if (times.length > 0) {
            setHoldExpiresAt(new Date(Math.min(...times)).toISOString());
          }
        }
      } catch (err: any) {
        console.error('Failed to load seat map:', err);
        setError('Failed to load seating inventory. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadSeatMap();

    // Socket synchronization
    const socket = getSocket();
    socket.connect();
    socket.emit('join:show', showId);

    socket.on('seat:held', (data: { seatId: string; heldBy: string; heldUntil: string }) => {
      setSeats((prevSeats) =>
        prevSeats.map((s) =>
          s.id === data.seatId
            ? { ...s, status: 'HELD', heldBy: data.heldBy, heldUntil: data.heldUntil }
            : s
        )
      );
    });

    socket.on('seat:released', (data: { seatId: string }) => {
      setSeats((prevSeats) =>
        prevSeats.map((s) =>
          s.id === data.seatId
            ? { ...s, status: 'AVAILABLE', heldBy: null, heldUntil: null }
            : s
        )
      );
      // Remove from selected list if held by me and released by cron/expiration
      setSelectedSeatIds((prev) => prev.filter((id) => id !== data.seatId));
    });

    socket.on('seat:booked', (data: { seatId: string; bookingId: string }) => {
      setSeats((prevSeats) =>
        prevSeats.map((s) =>
          s.id === data.seatId
            ? { ...s, status: 'BOOKED', bookingId: data.bookingId, heldBy: null, heldUntil: null }
            : s
        )
      );
      setSelectedSeatIds((prev) => prev.filter((id) => id !== data.seatId));
    });

    return () => {
      socket.emit('leave:show', showId);
      socket.off('seat:held');
      socket.off('seat:released');
      socket.off('seat:booked');
      socket.disconnect();
    };
  }, [showId, router]);

  const handleSeatClick = async (
    showSeatId: string,
    currentStatus: 'AVAILABLE' | 'HELD' | 'BOOKED',
    isHeldByMe: boolean
  ) => {
    if (!showId) return;

    if (currentStatus === 'AVAILABLE') {
      try {
        const response = await api.post(`/shows/${showId}/seats/${showSeatId}/hold`);
        const { heldUntil } = response.data;
        setSelectedSeatIds((prev) => [...prev, showSeatId]);
        setHoldExpiresAt(heldUntil);
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to hold seat. It might have been taken.');
      }
    } else if (currentStatus === 'HELD' && isHeldByMe) {
      try {
        await api.post(`/shows/${showId}/seats/${showSeatId}/release`);
        setSelectedSeatIds((prev) => prev.filter((id) => id !== showSeatId));
        if (selectedSeatIds.length <= 1) {
          setHoldExpiresAt(null);
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to release seat.');
      }
    }
  };

  const handleCheckout = async () => {
    if (selectedSeatIds.length === 0) return;
    setBookingLoading(true);
    try {
      const response = await api.post('/bookings/confirm', {
        showSeatIds: selectedSeatIds,
      });
      setBookingResult(response.data.booking);
      setSelectedSeatIds([]);
      setHoldExpiresAt(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Checkout failed. Please review seat status.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistCategory || !showId) return;
    setWaitlistJoining(true);
    setWaitlistMessage(null);
    try {
      const response = await api.post('/waitlist/join', {
        showId,
        categoryId: waitlistCategory,
      });
      setWaitlistMessage(
        `Success! Joined waitlist. You are currently in position #${response.data.entry.position}.`
      );
    } catch (err: any) {
      setWaitlistMessage(
        err.response?.data?.message || 'Failed to join waitlist. Please try again.'
      );
    } finally {
      setWaitlistJoining(false);
    }
  };

  const handleHoldExpire = () => {
    setSelectedSeatIds([]);
    setHoldExpiresAt(null);
    alert('Your seat holds have expired. Please select seats again.');
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <span className="text-gray-500 dark:text-gray-400 font-semibold">Loading seating layout...</span>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900 rounded text-center">
        <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Error</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'Show details not found.'}</p>
        <button
          onClick={() => router.push('/events')}
          className="px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700"
        >
          Back to Events
        </button>
      </div>
    );
  }

  // Calculate total checkout cost
  const totalCost = selectedSeatIds.reduce((total, id) => {
    const seat = seats.find((s) => s.id === id);
    if (!seat) return total;
    return total + (priceMapRef.current.get(seat.seat.categoryId) || 0);
  }, 0);

  // Group seats by category to check availability for waitlist dropdown
  const categorySummary = show.prices.map((p) => {
    const total = seats.filter((s) => s.seat.categoryId === p.categoryId).length;
    const bookedOrHeld = seats.filter(
      (s) => s.seat.categoryId === p.categoryId && s.status !== 'AVAILABLE'
    ).length;
    const available = total - bookedOrHeld;
    return {
      id: p.categoryId,
      name: p.category.name,
      price: Number(p.price),
      available,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      {bookingResult ? (
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 p-8 rounded border border-gray-200 dark:border-gray-800 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded-full mb-4">
            ✓
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Booking Confirmed!
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Your booking reference is <strong className="font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{bookingResult.bookingRef}</strong>.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            An email with your ticket and QR code has been sent.
          </p>

          {bookingResult.qrCodeUrl && (
            <div className="my-6 flex justify-center">
              <img
                src={bookingResult.qrCodeUrl}
                alt="Ticket QR Code"
                className="w-48 h-48 border border-gray-200 p-2 rounded bg-white"
              />
            </div>
          )}

          <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
            <button
              onClick={() => router.push('/bookings/history')}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-sm mr-4"
            >
              View My Bookings
            </button>
            <button
              onClick={() => router.push('/events')}
              className="px-5 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded font-semibold text-sm text-gray-700 dark:text-gray-300"
            >
              Back to Events
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Seat Layout Map */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {show.event.title}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {show.venue.name} • {new Date(show.startsAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <SeatMap
              showSeats={seats}
              currentUserId={currentUserId}
              onSeatClick={handleSeatClick}
              priceMap={priceMapRef.current}
            />
          </div>

          {/* Sidebar Panels: Hold & Checkout / Join Waitlist */}
          <div className="space-y-6">
            {/* Hold & Checkout Panel */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded border border-gray-200 dark:border-gray-800 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
                Reservation Details
              </h2>

              {selectedSeatIds.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Select seats from the map to begin.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {holdExpiresAt && (
                    <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-950/10 border border-yellow-200 dark:border-yellow-900/40 p-3 rounded">
                      <span className="text-xs font-semibold text-yellow-800 dark:text-yellow-400">
                        Hold Timer
                      </span>
                      <HoldCountdown heldUntil={holdExpiresAt} onExpire={handleHoldExpire} />
                    </div>
                  )}

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedSeatIds.map((id) => {
                      const ss = seats.find((s) => s.id === id);
                      if (!ss) return null;
                      const price = priceMapRef.current.get(ss.seat.categoryId);

                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 p-2.5 rounded border border-gray-200 dark:border-gray-800"
                        >
                          <span className="font-bold text-gray-800 dark:text-gray-200">
                            Seat {ss.seat.label} ({ss.seat.category.name})
                          </span>
                          <span className="font-mono text-gray-600 dark:text-gray-400">
                            ${price?.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-800 pt-3 flex items-center justify-between text-base font-bold text-gray-900 dark:text-white">
                    <span>Total Amount:</span>
                    <span>${totalCost.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={bookingLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-semibold rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:opacity-50"
                  >
                    {bookingLoading ? 'Processing Checkout...' : 'Confirm & Purchase Tickets'}
                  </button>
                </div>
              )}
            </div>

            {/* Waitlist Panel */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded border border-gray-200 dark:border-gray-800 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
                Sold Out? Join Waitlist
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                If your preferred category is sold out, join our FIFO waitlist queue. If another
                customer cancels their booking, the seat will automatically be reserved and offered to
                you.
              </p>

              {waitlistMessage && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 p-3 rounded text-xs font-semibold mt-4">
                  {waitlistMessage}
                </div>
              )}

              <form onSubmit={handleJoinWaitlist} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                    Select Seat Category
                  </label>
                  <select
                    value={waitlistCategory}
                    onChange={(e) => setWaitlistCategory(e.target.value)}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-white focus:outline-none text-sm"
                  >
                    <option value="">Choose a category...</option>
                    {categorySummary.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} (${cat.price.toFixed(2)}) —{' '}
                        {cat.available > 0 ? `${cat.available} available` : 'SOLD OUT'}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={waitlistJoining}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-700 text-sm font-semibold rounded hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none dark:text-white disabled:opacity-50"
                >
                  {waitlistJoining ? 'Joining Waitlist...' : 'Join Queue'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

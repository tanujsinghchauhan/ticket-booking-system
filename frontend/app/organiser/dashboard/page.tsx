'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getSession } from '@/lib/auth';

interface SeatCategory {
  id: string;
  name: string;
}

interface Venue {
  id: string;
  name: string;
  seatCategories: SeatCategory[];
}

interface Show {
  id: string;
  startsAt: string;
  venue: {
    name: string;
  };
  prices: {
    price: string;
    category: {
      name: string;
    };
  }[];
}

interface EventData {
  id: string;
  title: string;
  type: 'MOVIE' | 'CONCERT';
  description: string | null;
  shows: Show[];
}

export default function OrganiserDashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventData[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Event Form
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<'MOVIE' | 'CONCERT'>('CONCERT');
  const [eventDesc, setEventDesc] = useState('');
  const [eventCreating, setEventCreating] = useState(false);

  // New Show Form
  const [showEventId, setShowEventId] = useState('');
  const [showVenueId, setShowVenueId] = useState('');
  const [showStartsAt, setShowStartsAt] = useState('');
  const [categoryPrices, setCategoryPrices] = useState<Record<string, string>>({});
  const [showScheduling, setShowScheduling] = useState(false);

  const fetchData = async () => {
    try {
      const eventsRes = await api.get('/events');
      const venuesRes = await api.get('/venues');
      setEvents(eventsRes.data.events);
      setVenues(venuesRes.data.venues);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load organiser data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getSession();
    if (!session || (session.role !== 'ORGANISER' && session.role !== 'ADMIN')) {
      alert('Access Denied. Organisers and Admins only.');
      router.push('/events');
      return;
    }
    fetchData();
  }, [router]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventCreating(true);
    setError(null);
    try {
      await api.post('/events', {
        title: eventTitle,
        type: eventType,
        description: eventDesc,
      });
      setEventTitle('');
      setEventDesc('');
      alert('Event created successfully.');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create event.');
    } finally {
      setEventCreating(false);
    }
  };

  const handleVenueChange = (venueId: string) => {
    setShowVenueId(venueId);
    // Reset and build empty price inputs for categories of selected venue
    const selectedVenue = venues.find((v) => v.id === venueId);
    if (selectedVenue) {
      const initialPrices: Record<string, string> = {};
      selectedVenue.seatCategories.forEach((cat) => {
        initialPrices[cat.id] = '';
      });
      setCategoryPrices(initialPrices);
    } else {
      setCategoryPrices({});
    }
  };

  const handlePriceChange = (categoryId: string, value: string) => {
    setCategoryPrices((prev) => ({
      ...prev,
      [categoryId]: value,
    }));
  };

  const handleScheduleShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEventId || !showVenueId || !showStartsAt) return;
    setShowScheduling(true);

    try {
      // Format prices as array of objects
      const pricesArray = Object.entries(categoryPrices).map(([categoryId, price]) => {
        if (!price || isNaN(Number(price))) {
          throw new Error('All seat categories must have a valid price configured.');
        }
        return {
          categoryId,
          price: Number(price),
        };
      });

      await api.post(`/events/${showEventId}/shows`, {
        venueId: showVenueId,
        startsAt: new Date(showStartsAt).toISOString(),
        prices: pricesArray,
      });

      setShowVenueId('');
      setShowEventId('');
      setShowStartsAt('');
      setCategoryPrices({});
      alert('Show scheduled successfully. Seating records generated.');
      fetchData();
    } catch (err: any) {
      alert(err.message || err.response?.data?.message || 'Failed to schedule show.');
    } finally {
      setShowScheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <span className="text-gray-500 dark:text-gray-400 font-semibold">Loading dashboard...</span>
      </div>
    );
  }

  // Get selected venue to list its categories dynamically
  const selectedVenueObj = venues.find((v) => v.id === showVenueId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Organiser Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create shows, schedule timings, set seating category rates, and oversee listings.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-4 rounded mb-6 text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: list events and shows */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3 mb-4">
              My Events & Schedules
            </h2>

            {events.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-6">
                No events registered yet.
              </p>
            ) : (
              <div className="space-y-6">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="p-5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                      <div>
                        <span className="text-[10px] font-mono bg-gray-200 dark:bg-gray-750 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded font-bold uppercase">
                          {event.type}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                          {event.title}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">ID: {event.id}</span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                        Schedules
                      </h4>
                      {event.shows.length === 0 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          No shows scheduled.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {event.shows.map((show) => (
                            <div
                              key={show.id}
                              className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded text-xs"
                            >
                              <p className="font-bold text-gray-800 dark:text-gray-200">
                                {new Date(show.startsAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                                {show.venue.name}
                              </p>
                              <div className="mt-2 border-t border-gray-100 dark:border-gray-800 pt-2 space-y-0.5">
                                {show.prices.map((p, idx) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between text-[10px] text-gray-400"
                                  >
                                    <span>{p.category.name}:</span>
                                    <span className="font-semibold text-gray-600 dark:text-gray-300">
                                      ${Number(p.price).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Forms */}
        <div className="space-y-6">
          {/* Create Event Form */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3 mb-4">
              Create Event
            </h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-450 dark:text-gray-450 uppercase tracking-wider mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Taylor Swift Acoustic"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-450 dark:text-gray-450 uppercase tracking-wider mb-1">
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as 'MOVIE' | 'CONCERT')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-white text-sm focus:outline-none"
                >
                  <option value="CONCERT">Concert</option>
                  <option value="MOVIE">Movie</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-455 dark:text-gray-450 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Describe the event..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-white text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={eventCreating}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold disabled:opacity-50"
              >
                {eventCreating ? 'Creating Event...' : 'Create Event'}
              </button>
            </form>
          </div>

          {/* Schedule Show Form */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3 mb-4">
              Schedule Show
            </h2>
            <form onSubmit={handleScheduleShow} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-450 dark:text-gray-450 uppercase tracking-wider mb-1">
                  Select Event
                </label>
                <select
                  value={showEventId}
                  onChange={(e) => setShowEventId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-white text-sm focus:outline-none"
                >
                  <option value="">Choose Event...</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-455 dark:text-gray-450 uppercase tracking-wider mb-1">
                  Select Venue
                </label>
                <select
                  value={showVenueId}
                  onChange={(e) => handleVenueChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-white text-sm focus:outline-none"
                >
                  <option value="">Choose Venue...</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-450 dark:text-gray-455 uppercase tracking-wider mb-1">
                  Show Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={showStartsAt}
                  onChange={(e) => setShowStartsAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-white text-sm focus:outline-none"
                />
              </div>

              {selectedVenueObj && selectedVenueObj.seatCategories.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-800 pt-3 space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Category Pricing ($)
                  </h4>
                  {selectedVenueObj.seatCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600 dark:text-gray-300 flex-grow font-medium">
                        {cat.name}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Price"
                        value={categoryPrices[cat.id] || ''}
                        onChange={(e) => handlePriceChange(cat.id, e.target.value)}
                        className="w-24 px-2.5 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-white text-xs text-right font-mono"
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={showScheduling || !showEventId || !showVenueId || !showStartsAt}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold disabled:opacity-50"
              >
                {showScheduling ? 'Scheduling Show...' : 'Schedule Show'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

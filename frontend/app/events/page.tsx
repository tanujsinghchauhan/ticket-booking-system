'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

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

export default function EventsPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (search) params.title = search;
      if (typeFilter) params.type = typeFilter;

      const response = await api.get('/events', { params });
      setEvents(response.data.events);
    } catch (err: any) {
      console.error('Failed to fetch events:', err);
      setError('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Upcoming Events
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Browse and book tickets for movies and concerts in your city.
          </p>
        </div>

        {/* Filter Controls */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto"
        >
          <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded shadow-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All Types</option>
            <option value="MOVIE">Movies</option>
            <option value="CONCERT">Concerts</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <span className="text-gray-500 dark:text-gray-400 font-medium">Loading events...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/55 text-red-700 dark:text-red-400 p-4 rounded text-center">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center rounded">
          <p className="text-gray-500 dark:text-gray-400 font-medium">No events found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 flex flex-col justify-between p-6 transition-colors shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-mono uppercase">
                    {event.type}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-snug">
                  {event.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">
                  {event.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
                <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Available Shows
                </h4>
                {event.shows.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    No scheduled shows.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {event.shows.map((show) => {
                      const date = new Date(show.startsAt);
                      const formattedDate = date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={show.id}
                          className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2.5 rounded border border-gray-200 dark:border-gray-800 text-xs"
                        >
                          <div>
                            <p className="font-bold text-gray-800 dark:text-gray-200">
                              {formattedDate}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                              {show.venue.name}
                            </p>
                          </div>
                          <Link
                            href={`/events/${event.id}/seats?showId=${show.id}`}
                            className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                          >
                            Book Seats
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

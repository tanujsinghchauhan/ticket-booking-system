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
  address: string;
  seatCategories: SeatCategory[];
}

export default function AdminVenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Venue Form
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');
  const [venueCreating, setVenueCreating] = useState(false);

  // New Category Form
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryCreating, setCategoryCreating] = useState(false);

  // Bulk Seats Upload Form
  const [uploadVenueId, setUploadVenueId] = useState<string>('');
  const [seatsJson, setSeatsJson] = useState('');
  const [seatsUploading, setSeatsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const fetchVenues = async () => {
    try {
      const response = await api.get('/venues');
      setVenues(response.data.venues);
    } catch (err: any) {
      console.error('Failed to fetch venues:', err);
      setError('Failed to load venues list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== 'ADMIN') {
      alert('Access Denied. Admins only.');
      router.push('/events');
      return;
    }
    fetchVenues();
  }, [router]);

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setVenueCreating(true);
    setError(null);
    try {
      await api.post('/venues', {
        name: newVenueName,
        address: newVenueAddress,
      });
      setNewVenueName('');
      setNewVenueAddress('');
      alert('Venue created successfully.');
      fetchVenues();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create venue.');
    } finally {
      setVenueCreating(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenueId) return;
    setCategoryCreating(true);
    try {
      await api.post(`/venues/${selectedVenueId}/categories`, {
        name: newCategoryName,
      });
      setNewCategoryName('');
      alert('Seat category added.');
      fetchVenues();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add seat category.');
    } finally {
      setCategoryCreating(false);
    }
  };

  const handleUploadSeats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadVenueId || !seatsJson) return;
    setSeatsUploading(true);
    setUploadMessage(null);

    try {
      const parsedSeats = JSON.parse(seatsJson);
      if (!Array.isArray(parsedSeats)) {
        throw new Error('JSON must be an array of seat configurations.');
      }

      const response = await api.post(`/venues/${uploadVenueId}/seats/bulk`, {
        seats: parsedSeats,
      });

      setUploadMessage(`Success! Bulk created ${response.data.count} seats.`);
      setSeatsJson('');
    } catch (err: any) {
      console.error('Seat upload failed:', err);
      setUploadMessage(`Upload failed: ${err.message || err.response?.data?.message || 'Invalid format'}`);
    } finally {
      setSeatsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <span className="text-gray-500 dark:text-gray-400 font-semibold">Loading venue profiles...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Admin Venue Manager
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage physical auditorium venues, seat pricing tiers, and layout definitions.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-4 rounded mb-6 text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: List venues */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3 mb-4">
              Registered Venues
            </h2>

            {venues.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-6">
                No venues configured yet.
              </p>
            ) : (
              <div className="space-y-4">
                {venues.map((venue) => (
                  <div
                    key={venue.id}
                    className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{venue.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {venue.address}
                      </p>
                      <p className="text-[10px] font-mono text-gray-450 mt-1">ID: {venue.id}</p>
                    </div>

                    <div className="sm:text-right">
                      <span className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                        Categories
                      </span>
                      <div className="flex flex-wrap sm:justify-end gap-1.5">
                        {venue.seatCategories.length === 0 ? (
                          <span className="text-xs text-gray-400">None</span>
                        ) : (
                          venue.seatCategories.map((cat) => (
                            <span
                              key={cat.id}
                              className="inline-flex flex-col bg-white dark:bg-gray-800 border border-gray-250 dark:border-gray-800 text-[10px] px-2 py-0.5 rounded text-gray-700 dark:text-gray-300 font-medium"
                              title={`Category ID: ${cat.id}`}
                            >
                              <span>{cat.name}</span>
                              <span className="text-[8px] font-mono text-gray-400">{cat.id.substring(0, 8)}</span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Forms */}
        <div className="space-y-6">
          {/* Create Venue Form */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3 mb-4">
              Add New Venue
            </h2>
            <form onSubmit={handleCreateVenue} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-450 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Venue Name
                </label>
                <input
                  type="text"
                  required
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                  placeholder="Grand Concert Hall"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-455 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Address
                </label>
                <input
                  type="text"
                  required
                  value={newVenueAddress}
                  onChange={(e) => setNewVenueAddress(e.target.value)}
                  placeholder="123 Performance Parkway"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-white text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={venueCreating}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold disabled:opacity-50"
              >
                {venueCreating ? 'Creating...' : 'Create Venue'}
              </button>
            </form>
          </div>

          {/* Add Category Form */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3 mb-4">
              Add Seat Category
            </h2>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-450 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Select Venue
                </label>
                <select
                  value={selectedVenueId}
                  onChange={(e) => setSelectedVenueId(e.target.value)}
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
                <label className="block text-xs font-bold text-gray-450 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Premium VIP / Standard"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-white text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={categoryCreating || !selectedVenueId}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold disabled:opacity-50"
              >
                {categoryCreating ? 'Adding...' : 'Add Category'}
              </button>
            </form>
          </div>

          {/* Bulk Seats Layout Uploader */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3 mb-4">
              Bulk Seat Uploader
            </h2>

            {uploadMessage && (
              <div className="bg-gray-100 dark:bg-gray-800 border border-gray-250 dark:border-gray-700 text-gray-800 dark:text-gray-200 p-3 rounded text-xs font-semibold mb-4 leading-relaxed break-words">
                {uploadMessage}
              </div>
            )}

            <form onSubmit={handleUploadSeats} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-450 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Target Venue
                </label>
                <select
                  value={uploadVenueId}
                  onChange={(e) => setUploadVenueId(e.target.value)}
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
                <label className="block text-xs font-bold text-gray-450 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Layout JSON Array
                </label>
                <textarea
                  rows={6}
                  required
                  value={seatsJson}
                  onChange={(e) => setSeatsJson(e.target.value)}
                  placeholder={`[\n  { "row": "A", "number": 1, "categoryId": "PASTE_ID_HERE", "label": "A1" },\n  { "row": "A", "number": 2, "categoryId": "PASTE_ID_HERE", "label": "A2" }\n]`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-white text-xs font-mono"
                />
                <span className="text-[10px] text-gray-500 mt-1 block leading-normal">
                  Tip: Copy category IDs from the venue list above to match seat tiers correctly.
                </span>
              </div>

              <button
                type="submit"
                disabled={seatsUploading || !uploadVenueId || !seatsJson}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold disabled:opacity-50"
              >
                {seatsUploading ? 'Uploading Layout...' : 'Upload Seats'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

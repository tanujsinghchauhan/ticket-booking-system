# Database Schema Documentation

This document describes the schema, relations, and index choices for the Ticket Booking System database.

---

## 1. Enums

### `Role`
Defines the user access roles:
- `CUSTOMER`: Standard ticket buyers.
- `ORGANISER`: Event managers.
- `ADMIN`: Platform operators.

### `SeatStatus`
States for seat-map inventory:
- `AVAILABLE`: Open for selection.
- `HELD`: Locked temporarily during checkout.
- `BOOKED`: Purchased and locked permanently.

### `BookingStatus`
Status of booking transactions:
- `CONFIRMED`: Active booking.
- `CANCELLED`: Released booking.

### `WaitlistStatus`
States for the waitlist FIFO queue:
- `WAITING`: In line.
- `OFFERED`: An offer is issued (seat is held for this customer).
- `EXPIRED`: Offer was not claimed in time.
- `CONVERTED`: Claimed and converted into a booking.

---

## 2. Models & Fields

### `User`
- `id` (UUID, Primary Key)
- `email` (String, Unique Index)
- `password` (String, Hashed)
- `role` (Role enum)
- `name` (String)
- `createdAt` (Timestamp)

### `Venue`
- `id` (UUID, Primary Key)
- `name` (String)
- `address` (String)
- `ownerId` (UUID, Foreign Key -> `User.id`)

### `SeatCategory`
- `id` (UUID, Primary Key)
- `venueId` (UUID, Foreign Key -> `Venue.id`)
- `name` (String, e.g., "Premium", "Standard")

### `Seat`
- `id` (UUID, Primary Key)
- `venueId` (UUID, Foreign Key -> `Venue.id`)
- `categoryId` (UUID, Foreign Key -> `SeatCategory.id`)
- `row` (String, e.g., "A")
- `number` (Int)
- `label` (String, e.g., "A1")
- **Compound Unique**: `@@unique([venueId, row, number])`

### `Event`
- `id` (UUID, Primary Key)
- `organiserId` (UUID, Foreign Key -> `User.id`)
- `title` (String)
- `type` (String, e.g., "MOVIE" | "CONCERT")
- `description` (String, Nullable)

### `Show`
- `id` (UUID, Primary Key)
- `eventId` (UUID, Foreign Key -> `Event.id`)
- `venueId` (UUID, Foreign Key -> `Venue.id`)
- `startsAt` (Timestamp)

### `ShowCategoryPrice`
- `id` (UUID, Primary Key)
- `showId` (UUID, Foreign Key -> `Show.id`)
- `categoryId` (UUID, Foreign Key -> `SeatCategory.id`)
- `price` (Decimal, e.g., 10,2 precision)

### `ShowSeat`
This table represents the individual seat instance for a specific show and is the focal point of the platform's concurrency safety.
- `id` (UUID, Primary Key)
- `showId` (UUID, Foreign Key -> `Show.id`)
- `seatId` (UUID, Foreign Key -> `Seat.id`)
- `status` (SeatStatus, Default: `AVAILABLE`)
- `heldBy` (UUID, Nullable, Foreign Key -> `User.id`)
- `heldUntil` (Timestamp, Nullable)
- `bookingId` (UUID, Nullable, Foreign Key -> `Booking.id`)
- `version` (Int, Default: 0) — Used for optimistic locking.
- **Compound Unique**: `@@unique([showId, seatId])`
- **Performance Indexes**: `@@index([showId, status])`

### `Booking`
- `id` (UUID, Primary Key)
- `bookingRef` (String, Unique Index, e.g., `TKT-A8F9K2L1`)
- `customerId` (UUID, Foreign Key -> `User.id`)
- `showId` (UUID)
- `status` (BookingStatus, Default: `CONFIRMED`)
- `totalAmount` (Decimal, 10,2 precision)
- `qrCodeUrl` (String, Nullable) — Holds Base64 Data URL of the generated QR code.
- `createdAt` (Timestamp)

### `WaitlistEntry`
Tracks queue position for waitlist auto-assignment.
- `id` (UUID, Primary Key)
- `showId` (UUID, Foreign Key -> `Show.id`)
- `categoryId` (UUID, Foreign Key -> `SeatCategory.id`)
- `customerId` (UUID, Foreign Key -> `User.id`)
- `status` (WaitlistStatus, Default: `WAITING`)
- `position` (Int)
- `offerExpiresAt` (Timestamp, Nullable)
- `offerToken` (String, Nullable)
- `createdAt` (Timestamp)
- **Performance Index**: `@@index([showId, categoryId, status, position])` (Optimized for FIFO queue lookups and status updates).

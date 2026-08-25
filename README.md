# Ticket Booking System

A full-stack ticket booking platform for movies and concerts featuring interactive real-time seat layouts, TTL-based optimistic seat locks, automated waitlists, and secure QR-code ticket delivery by email.

---

## 1. Project Stack

* **Backend**: Node.js + Express + TypeScript, Prisma ORM, PostgreSQL (Neon / Docker Postgres)
* **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
* **Real-time Synchronization**: Socket.io (real-time seat map freshness)
* **Authentication**: JWT + bcrypt, with role-based access control (`CUSTOMER` / `ORGANISER` / `ADMIN`)
* **Background Scheduler**: node-cron (in-process)
* **QR Codes**: `qrcode` NPM package (encodes booking references, zero PII)
* **Email Dispatch**: Nodemailer + Resend SMTP

---

## 2. Architecture & Hard Rules

1. **Concurrency Safety**: All seat-state transitions (e.g., locking a seat, checking out, releasing) MUST be performed using atomic conditional updates (`updateMany` with a `WHERE status = 'AVAILABLE'` filter). Reading status in one query and writing in another is forbidden to prevent race conditions.
2. **Server-Side Trust**: Client countdown timers are for UX display only. The server-side cron sweep is the single source of truth for hold expiration.
3. **WebSockets Push**: Every seat status change immediately emits a socket event to the corresponding show room (`seat:held`, `seat:released`, `seat:booked`). The frontend loads the seat map once via REST and listens to real-time events.
4. **Unified Seat Reservation**: Offered waitlist seats reuse the standard `HELD` status with the customer's ID (`heldBy`) rather than implementing a separate queue state.

---

## 3. Directory Layout

```
ticket-booking-system/
├── backend/
│   ├── src/
│   │   ├── config/              # db.ts, env.ts, mailer.ts, socket.ts
│   │   ├── middleware/          # auth.middleware.ts, role.middleware.ts, error.middleware.ts
│   │   ├── modules/
│   │   │   ├── auth/            # register, login, jwt tokens
│   │   │   ├── venues/          # admin: create venue + seat layout
│   │   │   ├── events/          # organiser: schedule shows + price rates
│   │   │   ├── seats/           # seat map read, hold, release
│   │   │   ├── bookings/        # checkout holds, cancel, history
│   │   │   └── waitlist/        # join waitlist, offer claim
│   │   ├── jobs/
│   │   │   ├── holdExpiry.job.ts        # cron: release expired holds every 30s
│   │   │   └── waitlistOffer.job.ts     # cron: expire unclaimed offers, advance queue
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   │   └── concurrency-run.ts   # fires concurrent HTTP requests
│   └── .env
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/ , register/
│   │   ├── events/ , events/[id]/seats/     # real-time seat map
│   │   ├── admin/venues/                    # venue builder
│   │   ├── organiser/dashboard/             # show schedule dashboard
│   │   └── bookings/history/                # ticket history and QR codes
│   ├── components/
│   │   └── SeatMap.tsx , Seat.tsx , HoldCountdown.tsx , Navbar.tsx
│   ├── lib/
│   │   ├── api.ts , socket.ts , auth.ts
│   └── .env
└── docs/
    ├── system-design.md         # detailed architectural write-up
    ├── db-schema.md             # database diagram and indices
    └── api-docs.md              # REST & socket API specifications
```

---

## 4. API Endpoints

| Method | Route | Auth / Role Required | Description |
|---|---|---|---|
| **POST** | `/api/auth/register` | Public | Create new user account |
| **POST** | `/api/auth/login` | Public | Authenticate user & issue cookie token |
| **POST** | `/api/venues` | `ADMIN` | Create a new venue |
| **POST** | `/api/venues/:id/seats/bulk` | `ADMIN` | Upload seat layout rows & coordinates |
| **POST** | `/api/events` | `ORGANISER` | Register movie or concert event |
| **POST** | `/api/events/:id/shows` | `ORGANISER` | Schedule showtimes and pricing categories |
| **GET** | `/api/events` | Public | Browse events catalog (search & type filters) |
| **GET** | `/api/shows/:id/seatmap` | Public | Fetch current layout and seat statuses |
| **POST** | `/api/shows/:id/seats/:seatId/hold` | `CUSTOMER` | Atomic optimistic seat lock |
| **POST** | `/api/shows/:id/seats/:seatId/release`| `CUSTOMER` | Manually release a held seat |
| **POST** | `/api/bookings/confirm` | `CUSTOMER` | Checkout held seats (generates ticket + QR) |
| **POST** | `/api/bookings/:id/cancel` | `CUSTOMER`/`ADMIN`| Cancel booking, release seats, notify waitlist |
| **GET** | `/api/bookings/me` | `CUSTOMER` | View personal booking history |
| **POST** | `/api/waitlist/join` | `CUSTOMER` | Join waitlist queue when show category is full |
| **GET** | `/api/waitlist/claim` | `CUSTOMER` | Claim waitlist offer using time-sensitive link |

---

## 5. Database Schema Key Models

```prisma
enum Role { CUSTOMER ORGANISER ADMIN }
enum SeatStatus { AVAILABLE HELD BOOKED }
enum BookingStatus { CONFIRMED CANCELLED }
enum WaitlistStatus { WAITING OFFERED EXPIRED CONVERTED }

model ShowSeat {
  id          String     @id @default(uuid())
  showId      String
  seatId      String
  status      SeatStatus @default(AVAILABLE)
  heldBy      String?    // userId
  heldUntil   DateTime?
  bookingId   String?
  @@unique([showId, seatId])
  @@index([showId, status])
}

model Booking {
  id            String        @id @default(uuid())
  bookingRef    String        @unique
  customerId    String
  showId        String
  status        BookingStatus @default(CONFIRMED)
  totalAmount   Decimal
  qrCodeUrl     String?
  createdAt     DateTime      @default(now())
}

model WaitlistEntry {
  id              String         @id @default(uuid())
  showId          String
  categoryId      String
  customerId      String
  status          WaitlistStatus @default(WAITING)
  position        Int
  offerExpiresAt  DateTime?
  offerToken      String?        // time-limited signed JWT link
  createdAt       DateTime       @default(now())
  @@index([showId, categoryId, status, position])
}
```

---

## 6. How to Run the Application Locally

### Prerequisites
* Node.js v20+ / Node.js v24
* Docker (for local database container)

### Step 1: Start Database Container (Or use Neon Cloud database URL)
```bash
docker compose up -d
```

### Step 2: Configure Environment Variables
Create `.env` inside `backend/`:
```env
DATABASE_URL="postgresql://neondb_owner:npg_DM7lde5qPnIO@ep-proud-wind-azq1hg0e-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
JWT_SECRET="jYnjreusGTHGy3BJthhezYZKrdKKcIvxlyEt1cVw3bQ="
JWT_EXPIRES_IN="7d"
SEAT_HOLD_TTL_MINUTES=10
WAITLIST_OFFER_TTL_MINUTES=15
SMTP_HOST="smtp.resend.com"
SMTP_PORT=587
SMTP_USER="resend"
SMTP_PASS="your-resend-api-key"
EMAIL_FROM="onboarding@resend.dev"
FRONTEND_URL="http://localhost:3000"
PORT=4000
```

### Step 3: Run Migrations and Seed Database
```bash
cd backend
npx prisma migrate dev
npx tsx prisma/seed.ts
```

### Step 4: Boot Backend Server
```bash
npm run dev
```

### Step 5: Boot Frontend Client
```bash
cd ../frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 7. Concurrency Safety Load-Test Results

The backend uses row-level locking conditions for seat hold reservations. To verify this, a concurrency script makes 20 parallel HTTP requests to hold the same seat:
```bash
npx tsx tests/concurrency-run.ts
```

**Results:**
```
--- Starting Seat Hold Concurrency Test ---
Cleaning up tables...
Creating users...
Creating venue and seats...
Firing 20 parallel hold requests...

--- Test Results Summary ---
Total Requests: 20
Successes (200 OK): 1
Conflicts (409 Conflict): 19
✓ CONCURRENCY TEST PASSED SUCCESSFULLY!
```
Exactly one request registers as successful, while the other 19 receive standard conflict validation codes, guaranteeing that double-booking is impossible.

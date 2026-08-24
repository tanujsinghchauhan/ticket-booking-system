# Ticket Booking System API Documentation

Base URL: `/api`

---

## 1. Authentication Module (`/auth`)

### Register User
* **URL**: `/auth/register`
* **Method**: `POST`
* **Auth Required**: No
* **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword",
    "role": "CUSTOMER"
  }
  ```
  *(Roles allowed: `CUSTOMER`, `ORGANISER`, `ADMIN`)*
* **Response (201 Created)**:
  ```json
  {
    "message": "User registered successfully",
    "user": {
      "id": "u1-uuid-etc",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "CUSTOMER",
      "createdAt": "2026-08-23T10:20:30.000Z"
    }
  }
  ```

### Login User
* **URL**: `/auth/login`
* **Method**: `POST`
* **Auth Required**: No
* **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "securepassword"
  }
  ```
* **Response (200 OK)**:
  *(Sets a cookie named `token`)*
  ```json
  {
    "message": "Login successful",
    "token": "jwt-token-string",
    "user": {
      "id": "u1-uuid-etc",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "CUSTOMER",
      "createdAt": "2026-08-23T10:20:30.000Z"
    }
  }
  ```

### Logout User
* **URL**: `/auth/logout`
* **Method**: `POST`
* **Auth Required**: No
* **Response (200 OK)**:
  *(Clears the `token` cookie)*
  ```json
  {
    "message": "Logout successful"
  }
  ```

### Get Current User Profile
* **URL**: `/auth/me`
* **Method**: `GET`
* **Auth Required**: Yes (Bearer Token in `Authorization` header or cookie `token`)
* **Response (200 OK)**:
  ```json
  {
    "user": {
      "userId": "u1-uuid-etc",
      "email": "jane@example.com",
      "role": "CUSTOMER"
    }
  }
  ```

---

## 2. Venues Module (`/venues`)

### Create Venue
* **URL**: `/venues`
* **Method**: `POST`
* **Auth Required**: Yes (Role: `ADMIN` only)
* **Request Body**:
  ```json
  {
    "name": "Grand Symphony Hall",
    "address": "456 Concert Ave"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "message": "Venue created successfully",
    "venue": {
      "id": "v1-uuid-etc",
      "name": "Grand Symphony Hall",
      "address": "456 Concert Ave",
      "ownerId": "admin-uuid"
    }
  }
  ```

### Create Seat Category
* **URL**: `/venues/:id/categories`
* **Method**: `POST`
* **Auth Required**: Yes (Role: `ADMIN` only)
* **Request Body**:
  ```json
  {
    "name": "Premium"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "message": "Seat category created successfully",
    "category": {
      "id": "c1-uuid-etc",
      "venueId": "v1-uuid-etc",
      "name": "Premium"
    }
  }
  ```

### Bulk Create Seats (Layout Upload)
* **URL**: `/venues/:id/seats/bulk`
* **Method**: `POST`
* **Auth Required**: Yes (Role: `ADMIN` only)
* **Request Body**:
  ```json
  {
    "seats": [
      { "row": "A", "number": 1, "categoryId": "c1-uuid-etc", "label": "A1" },
      { "row": "A", "number": 2, "categoryId": "c1-uuid-etc", "label": "A2" }
    ]
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "message": "Seats created successfully",
    "count": 2
  }
  ```

### List Venues
* **URL**: `/venues`
* **Method**: `GET`
* **Auth Required**: Yes (Any role)
* **Response (200 OK)**:
  ```json
  {
    "venues": [
      {
        "id": "v1-uuid-etc",
        "name": "Grand Symphony Hall",
        "address": "456 Concert Ave",
        "ownerId": "admin-uuid",
        "seatCategories": [
          { "id": "c1-uuid-etc", "name": "Premium" }
        ]
      }
    ]
  }
  ```

### Get Venue Details (with Seats)
* **URL**: `/venues/:id`
* **Method**: `GET`
* **Auth Required**: Yes (Any role)
* **Response (200 OK)**:
  ```json
  {
    "venue": {
      "id": "v1-uuid-etc",
      "name": "Grand Symphony Hall",
      "address": "456 Concert Ave",
      "ownerId": "admin-uuid",
      "seatCategories": [
        { "id": "c1-uuid-etc", "name": "Premium" }
      ],
      "seats": [
        {
          "id": "s1-uuid-etc",
          "row": "A",
          "number": 1,
          "label": "A1",
          "categoryId": "c1-uuid-etc",
          "category": { "id": "c1-uuid-etc", "name": "Premium" }
        }
      ]
    }
  }
  ```

---

## 3. Events & Shows Module (`/events`)

### Create Event
* **URL**: `/events`
* **Method**: `POST`
* **Auth Required**: Yes (Role: `ORGANISER` or `ADMIN`)
* **Request Body**:
  ```json
  {
    "title": "Summer Symphony Gala",
    "type": "CONCERT",
    "description": "An evening of beautiful classical music under the stars."
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "message": "Event created successfully",
    "event": {
      "id": "e1-uuid-etc",
      "title": "Summer Symphony Gala",
      "type": "CONCERT",
      "description": "An evening of beautiful classical music under the stars.",
      "organiserId": "org-uuid-etc"
    }
  }
  ```

### Create Show (Schedule & Prices)
Creates a show and atomically instantiates corresponding `ShowSeat` entries as `AVAILABLE` for all venue seats.
* **URL**: `/events/:id/shows`
* **Method**: `POST`
* **Auth Required**: Yes (Role: `ORGANISER` or `ADMIN`)
* **Request Body**:
  ```json
  {
    "venueId": "v1-uuid-etc",
    "startsAt": "2026-08-24T19:00:00.000Z",
    "prices": [
      { "categoryId": "premium-cat-uuid", "price": 150.00 },
      { "categoryId": "standard-cat-uuid", "price": 75.00 }
    ]
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "message": "Show scheduled successfully",
    "show": {
      "id": "sh1-uuid-etc",
      "eventId": "e1-uuid-etc",
      "venueId": "v1-uuid-etc",
      "startsAt": "2026-08-24T19:00:00.000Z",
      "prices": [
        { "id": "p1-uuid", "categoryId": "premium-cat-uuid", "price": "150.00" }
      ]
    }
  }
  ```

### List Events (Browse & Filter)
* **URL**: `/events`
* **Method**: `GET`
* **Auth Required**: Yes (Any role)
* **Query Parameters**:
  - `type` (Optional, e.g. `CONCERT` | `MOVIE`)
  - `title` (Optional, search query)
* **Response (200 OK)**:
  ```json
  {
    "events": [
      {
        "id": "e1-uuid-etc",
        "title": "Summer Symphony Gala",
        "type": "CONCERT",
        "description": "An evening...",
        "organiserId": "org-uuid-etc",
        "shows": [
          {
            "id": "sh1-uuid-etc",
            "startsAt": "2026-08-24T19:00:00.000Z",
            "venue": { "name": "Grand Symphony Hall" },
            "prices": [
              { "price": "150.00", "category": { "name": "Premium" } }
            ]
          }
        ]
      }
    ]
  }
  ```

### Get Event Details
* **URL**: `/events/:id`
* **Method**: `GET`
* **Auth Required**: Yes (Any role)
* **Response (200 OK)**:
  *(Includes same event details structure as listEvents)*

---

## 4. Seats Module (`/shows`)

### Get Seat Map (Real-Time Status)
* **URL**: `/shows/:id/seatmap`
* **Method**: `GET`
* **Auth Required**: Yes (Any role)
* **Response (200 OK)**:
  ```json
  {
    "show": {
      "id": "sh1-uuid-etc",
      "startsAt": "2026-08-24T19:00:00.000Z"
    },
    "seats": [
      {
        "id": "ss1-uuid-etc",
        "status": "AVAILABLE",
        "heldBy": null,
        "heldUntil": null,
        "bookingId": null,
        "seat": {
          "id": "s1-uuid",
          "row": "A",
          "number": 1,
          "label": "A1",
          "category": { "id": "premium-cat-uuid", "name": "Premium" }
        }
      }
    ]
  }
  ```

### Hold Seat
Locks a seat atomically for `SEAT_HOLD_TTL_MINUTES`. Emits a socket event `seat:held`.
* **URL**: `/shows/:id/seats/:seatId/hold`
* **Method**: `POST`
* **Auth Required**: Yes (Any role)
* **Response (200 OK)**:
  ```json
  {
    "message": "Seat hold successful",
    "heldUntil": "2026-08-23T10:30:00.000Z"
  }
  ```
* **Response (409 Conflict)**:
  ```json
  {
    "message": "Seat is no longer available"
  }
  ```

### Release Seat (Manual Release)
Releases a held seat back to `AVAILABLE`. Emits a socket event `seat:released`.
* **URL**: `/shows/:id/seats/:seatId/release`
* **Method**: `POST`
* **Auth Required**: Yes (Any role)
* **Response (200 OK)**:
  ```json
  {
    "message": "Seat released successfully"
  }
  ```

---

## 5. Bookings Module (`/bookings`)

### Confirm Booking
Converts held seats to `BOOKED` inside a database transaction, generates QR ticket containing booking reference, and emails confirmation details with QR code attached. Emits `seat:booked`.
* **URL**: `/bookings/confirm`
* **Method**: `POST`
* **Auth Required**: Yes (Any role)
* **Request Body**:
  ```json
  {
    "showSeatIds": ["ss1-uuid-etc"]
  }
  ```
* **Response (210 Created)**:
  ```json
  {
    "message": "Booking confirmed successfully",
    "booking": {
      "id": "b1-uuid-etc",
      "bookingRef": "TKT-A8F9K2L1",
      "customerId": "user-uuid",
      "showId": "sh1-uuid-etc",
      "status": "CONFIRMED",
      "totalAmount": "150.00",
      "qrCodeUrl": "data:image/png;base64,...",
      "createdAt": "2026-08-23T10:20:00.000Z"
    }
  }
  ```

### Cancel Booking
Cancels a booking and releases seats back to `AVAILABLE` (or auto-assigns/holds them for waitlisted customers if a waitlist exists). Emits `seat:released` or `seat:held`.
* **URL**: `/bookings/:id/cancel`
* **Method**: `POST`
* **Auth Required**: Yes (Owner of booking or `ADMIN`)
* **Response (200 OK)**:
  ```json
  {
    "message": "Booking cancelled successfully",
    "booking": {
      "id": "b1-uuid-etc",
      "status": "CANCELLED"
    }
  }
  ```

### Get My Booking History
* **URL**: `/bookings/me`
* **Method**: `GET`
* **Auth Required**: Yes (Role: `CUSTOMER`)
* **Response (200 OK)**:
  ```json
  {
    "bookings": [
      {
        "id": "b1-uuid-etc",
        "bookingRef": "TKT-A8F9K2L1",
        "status": "CONFIRMED",
        "totalAmount": "150.00",
        "createdAt": "2026-08-23T10:20:00.000Z",
        "seats": [
          {
            "id": "ss1-uuid-etc",
            "seat": { "row": "A", "number": 1, "label": "A1" }
          }
        ]
      }
    ]
  }
  ```

---

## 6. Waitlist Module (`/waitlist`)

### Join Waitlist
Joins waitlist FIFO queue for a show category if no seats are currently available.
* **URL**: `/waitlist/join`
* **Method**: `POST`
* **Auth Required**: Yes (Role: `CUSTOMER` only)
* **Request Body**:
  ```json
  {
    "showId": "sh1-uuid-etc",
    "categoryId": "premium-cat-uuid"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "message": "Joined waitlist successfully",
    "entry": {
      "id": "w1-uuid-etc",
      "showId": "sh1-uuid-etc",
      "categoryId": "premium-cat-uuid",
      "customerId": "user-uuid",
      "status": "WAITING",
      "position": 1,
      "createdAt": "2026-08-23T10:21:00.000Z"
    }
  }
  ```

### Claim Waitlist Offer
Claims a waitlist offer using a signed token, converting the waitlist entry to `CONVERTED` and creating a booking transaction for the reserved seat.
* **URL**: `/waitlist/claim`
* **Method**: `GET`
* **Auth Required**: No (JWT token provides authentication context)
* **Query Parameters**:
  - `token` (Required, signed JWT string sent in offer email)
* **Response (200 OK)**:
  ```json
  {
    "message": "Seat claimed successfully",
    "booking": {
      "id": "b2-uuid-etc",
      "bookingRef": "TKT-C7D9W2K8",
      "status": "CONFIRMED",
      "totalAmount": "150.00",
      "createdAt": "2026-08-23T10:25:00.000Z"
    }
  }
  ```

---

## 7. Socket.io Events (Namespace: Root `/`)

Rooms: Clients join the show room using `showId` as room name.

### Client emits:
- `join:show` (payload: `showId` string): Joins real-time updates for a show.
- `leave:show` (payload: `showId` string): Leaves updates for a show.

### Server broadcasts to show room:
- `seat:held` (payload: `{ seatId, heldBy, heldUntil }`): Fired when a customer holds a seat.
- `seat:released` (payload: `{ seatId }`): Fired when a seat is released (manually or by cron).
- `seat:booked` (payload: `{ seatId, bookingId }`): Fired when a booking is confirmed.

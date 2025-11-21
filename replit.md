# Hospitality Booking Management System

## Overview

This is a full-stack web application designed for small hospitality businesses (B&Bs, agriturismos, vacation rentals) to manage properties, rooms, bookings, and local events. The system features a professional dashboard for property owners and a public-facing booking calendar for guests.

The application is built with a modern TypeScript stack featuring React on the frontend, Express on the backend, and PostgreSQL (via Neon) for data persistence. The entire interface is in Italian and operates without authentication for direct access.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Core Framework**: React 18 with TypeScript, using Vite as the build tool and development server

**Routing**: Wouter for client-side routing
- Public routes: Home, Booking Widget
- Dashboard routes: Properties, Rooms, Bookings, Events, Calendar, Settings (all wrapped in sidebar layout)
- Calendar route (`/dashboard/calendario`): Public booking interface with date selection, event discovery, and room booking flow

**UI Component System**: shadcn/ui (Radix UI primitives) with Tailwind CSS
- Design system follows "new-york" style from shadcn
- Custom theme with HSL color variables for light/dark mode support
- Hybrid design approach: Clean dashboard for owners, conversion-optimized booking widget for guests

**State Management**: 
- React Query (TanStack Query) for server state with custom query client configuration
- React Hook Form with Zod validation for form handling
- No global client state library - relies on server state and local component state

**Design Tokens**:
- Primary font: Inter (Google Fonts) in weights 400, 500, 600, 700
- Color palette uses HSL values with CSS custom properties
- Separate color schemes for dashboard (professional blue/slate) and booking widget (warm coral accents)

### Backend Architecture

**Server Framework**: Express.js with TypeScript running on Node.js

**API Design**: RESTful endpoints without authentication
- Resource routes follow pattern: `/api/{resource}` with standard CRUD operations
- Custom middleware for request logging and error handling
- All endpoints publicly accessible for simplified hospitality management

**Authentication Strategy**: No authentication required
- Default user (UUID `00000000-0000-0000-0000-000000000000`) seeded automatically at server startup
- Password column nullable in users schema for optional future auth implementation
- Direct access to all dashboard and booking features

**Data Access Layer**: 
- Storage abstraction interface (IStorage) in `server/storage.ts`
- Drizzle ORM for type-safe database queries
- Repository pattern with methods for each entity (users, properties, rooms, bookings, events)

**Validation**: Zod schemas (via drizzle-zod) for runtime type validation
- Insert schemas generated from database schema
- Validation happens at API boundary before database operations

### Database Schema

**ORM**: Drizzle ORM with Neon serverless PostgreSQL driver

**Core Entities**:

1. **Users** - Property owners
   - Fields: id (UUID), email, password (nullable, for future auth), fullName, timestamps
   - Default user auto-seeded with UUID `00000000-0000-0000-0000-000000000000`

2. **Properties** - Physical locations/establishments
   - Fields: id, ownerId (FK to users), name, description, address, city, country, roomsCount, active status, timestamps
   - One-to-many with rooms, bookings, and events

3. **Rooms** - Bookable units within properties
   - Fields: id, propertyId (FK), name, description, maxGuests, pricePerNight (decimal), isAvailable, timestamps

4. **Bookings** - Guest reservations
   - Fields: id, roomId (FK), propertyId (FK), guest details (name, email, phone), check-in/out dates, number of guests, total price, status (pending/confirmed/cancelled), timestamps

5. **Events** - Local events to showcase to guests
   - Fields: id, propertyId (FK), title, description, eventDate, endDate, location, category, timestamps

**Database Relationships**:
- Users → Properties (one-to-many, cascade delete)
- Properties → Rooms (one-to-many, cascade delete)
- Properties → Bookings (one-to-many, cascade delete)
- Properties → Events (one-to-many, cascade delete)
- Rooms → Bookings (one-to-many, cascade delete)

**Migration System**: Drizzle Kit with migrations stored in `/migrations` directory

### Development Workflow

**Build System**:
- Development: tsx for server, Vite dev server for client with HMR
- Production: esbuild for server bundle, Vite build for client static assets
- TypeScript type checking via `tsc --noEmit`

**Module Resolution**:
- Path aliases: `@/` for client, `@shared/` for shared code
- ESM modules throughout (type: "module" in package.json)

**Development Tools**:
- Replit-specific plugins for cartographer and dev banner (dev only)
- Runtime error modal overlay for better DX
- Request logging middleware with duration tracking

## External Dependencies

### Database & Infrastructure
- **Neon PostgreSQL**: Serverless PostgreSQL database (via @neondatabase/serverless)
- **Drizzle ORM**: Type-safe ORM with schema management and migrations
- **connect-pg-simple**: PostgreSQL-backed session store for express-session

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Radix UI**: Headless UI components (@radix-ui/* packages) for accessibility
- **shadcn/ui**: Pre-built component library built on Radix primitives
- **Lucide React**: Icon library
- **class-variance-authority**: Utility for managing component variants
- **cmdk**: Command palette component

### Forms & Validation
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation and schema definition
- **@hookform/resolvers**: Zod resolver for React Hook Form

### Data Fetching
- **TanStack Query (React Query)**: Server state management with caching and invalidation
- **wouter**: Lightweight client-side routing

### Date Handling & Animations
- **date-fns**: Modern date utility library for formatting and calculations (with Italian locale for calendar)
- **canvas-confetti**: Celebration animations for booking confirmations

### Development
- **Vite**: Frontend build tool and dev server
- **tsx**: TypeScript execution for Node.js
- **esbuild**: JavaScript bundler for production server build
- **TypeScript**: Static type checking across the stack

## Recent Changes

### November 21, 2025 - Public Booking Calendar Implementation

**Authentication Removal**:
- Removed all authentication middleware and session management
- Made password column nullable in users schema
- Implemented automatic default user seeding at server startup
- All routes now publicly accessible without login required

**Booking Calendar Feature** (`/dashboard/calendario`):
- **Calendar Component**: Dual-month calendar with date range selection, Italian locale, event indicators (colored dots), and event tooltips
- **Events Sidebar**: Filterable event list by category (concerto, sagra, sport, cultura) with date-based filtering
- **Rooms Grid**: Dynamic room display with automatic price calculation for selected date ranges
- **Booking Modal**: 3-step booking flow (guest data form → review → confirmation with confetti animation)
- **Integration**: React Query for data fetching, form validation with Zod, responsive design

**Components Created**:
- `client/src/components/calendar/Calendar.tsx`: Main calendar with range selection and event indicators
- `client/src/components/calendar/EventsSidebar.tsx`: Events list with category filters
- `client/src/components/calendar/RoomsGrid.tsx`: Available rooms display
- `client/src/components/calendar/BookingModal.tsx`: Multi-step booking confirmation
- `client/src/pages/calendar.tsx`: Calendar page integration

**Testing**: End-to-end playwright test passed covering navigation, date selection, event filtering, room selection, and complete booking flow with API confirmation.

### November 21, 2025 - Chronological Event Sorting Implementation

**Event Ordering System**:
- **Backend** (`server/routes.ts`): GET /api/events now returns events sorted chronologically using `[...events].sort()` to avoid mutating storage state
- **Frontend** (`EventsSidebar.tsx`): Events filtered and sorted chronologically using `[...events].filter().sort()` to maintain props immutability
- **Testability** (`EventCard.tsx`): Added `data-event-date` attribute (ISO format YYYY-MM-DD) for reliable test verification
- Sort logic: `new Date(eventDate).getTime()` comparison for ascending chronological order

**Testing Coverage**:
- API stability: Multiple consecutive fetches return identical order
- Year boundary: Dec 2025 → Jan 2026 date ranges maintain correct chronological order
- Rapid filter toggling: UI remains stable with correct ordering
- State stability: Multiple filter changes (category + date range) preserve chronological order
- Timezone validation: ISO date strings sort identically to Date object comparison

**Additional December Events Created**:
- Dec 13-14: Sagra della Polenta e Cinghiale (sagra)
- Dec 14: Concerto di Natale del Coro Polifonico (concerto)
- Dec 20-21: Presepe Vivente (cultura)
- Dec 20: Ciaspolata Notturna sotto le Stelle (sport)
- Dec 27-28: Gran Veglione di San Silvestro (cultura)

### November 21, 2025 - Calendar Enhancements & Bug Fixes

**EventCard Expandable Implementation**:
- EventCard component with click-to-expand functionality using CSS transitions
- Smooth animations (duration-500) for description visibility toggle
- ChevronDown icon rotation (rotate-180) as visual indicator
- bg-card background for dark mode compatibility
- 6 holiday/new year events (31 DEC - 28 JAN) created with complete Italian descriptions

**Critical Bug Fixes**:
1. **Duplicate Keys Fix** (Calendar.tsx line 93):
   - Problem: `{['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(d => <div key={d}>)` caused React warning for duplicate "M" keys
   - Solution: `{['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => <div key={`day-${i}`}>)` using index for unique keys

2. **Calendar Auto-Update** (Calendar.tsx handleDateClick):
   - Problem: Calendar remained on December when selecting January dates
   - Solution: Added `setCurrentMonth(startOfMonth(date))` when selecting new date range start
   - Behavior: Calendar now automatically jumps to the month of the selected date

3. **Tooltip Filter Alignment** (Calendar.tsx + EventsSidebar.tsx):
   - Problem: Event tooltips showed all events regardless of selected date range/category filters
   - Solution: Lifted `selectedCategory` state to calendar.tsx parent component
   - Implementation:
     - calendar.tsx manages `selectedCategory` state
     - Passes `selectedCategory` + `onCategoryChange` to EventsSidebar (controlled props)
     - Passes `selectedCategory` to Calendar component
     - Calendar filters `dayEvents` using same logic as sidebar: `isSameDay AND dateRange AND category`
   - Result: Only events matching ALL filters (date + range + category) appear in DOM (sidebar + tooltips + aria-labels)

4. **Empty State Button Fix** (EventsSidebar.tsx line 108):
   - Problem: "Mostra tutti gli eventi" button called `setSelectedCategory(null)` which no longer existed after state hoisting
   - Solution: Changed to `onCategoryChange(null)` using controlled prop
   - Added: `data-testid="button-reset-category"` for test automation

**State Management Architecture**:
- calendar.tsx: Parent component managing `selectedDates` and `selectedCategory` states
- EventsSidebar: Receives controlled props `selectedCategory` + `onCategoryChange` (was using internal useState before)
- Calendar: Receives `selectedCategory` read-only prop for tooltip filtering
- Ensures perfect synchronization between sidebar filters and calendar tooltip rendering

**Test Coverage**: All E2E tests passing
- Date range selection (December, January ranges)
- Category filters (sagra, concerto, cultura, sport, religioso)
- Empty state button reset without runtime errors
- Events outside range/category completely removed from DOM
- Calendar auto-navigation to selected month verified
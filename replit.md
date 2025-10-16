# Hospitality Booking Management System

## Overview

This is a full-stack web application designed for small hospitality businesses (B&Bs, agriturismos, vacation rentals) to manage properties, rooms, bookings, and local events. The system features a professional dashboard for property owners and a public-facing booking widget for guests.

The application is built with a modern TypeScript stack featuring React on the frontend, Express on the backend, and PostgreSQL (via Neon) for data persistence. It uses session-based authentication and provides real-time data management capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Core Framework**: React 18 with TypeScript, using Vite as the build tool and development server

**Routing**: Wouter for client-side routing with distinct public and authenticated routes
- Public routes: Home, Login, Signup, Booking Widget
- Protected routes: Dashboard pages wrapped in a layout with sidebar navigation

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

**API Design**: RESTful endpoints with session-based authentication
- Auth routes: `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Resource routes follow pattern: `/api/{resource}` with standard CRUD operations
- Custom middleware for request logging and error handling

**Authentication Strategy**: Session-based using express-session
- Password hashing with Node.js crypto (scrypt algorithm)
- Session storage using connect-pg-simple (PostgreSQL session store)
- Protected routes use requireAuth middleware that checks session.userId

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

1. **Users** - Property owners with authentication credentials
   - Fields: id (UUID), email, password (hashed), fullName, timestamps

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

### Date Handling
- **date-fns**: Modern date utility library for formatting and calculations

### Development
- **Vite**: Frontend build tool and dev server
- **tsx**: TypeScript execution for Node.js
- **esbuild**: JavaScript bundler for production server build
- **TypeScript**: Static type checking across the stack

### Session Management
- **express-session**: Session middleware for Express
- **nanoid**: Unique ID generation for sessions
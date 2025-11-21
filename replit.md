# Hospitality Booking Management System

## Overview

This is a full-stack web application for small hospitality businesses (B&Bs, agriturismos, vacation rentals) to manage properties, rooms, bookings, and local events. It features a professional dashboard for owners and a public-facing booking calendar for guests. The system also includes an embeddable booking widget for integration into external websites. The application uses a modern TypeScript stack with React, Express, and PostgreSQL (via Neon), with the entire interface in Italian and operating without authentication for direct access.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Core Framework**: React 18 with TypeScript, Vite.
**Routing**: Wouter for client-side routing, including public routes (Home, Booking Widget) and dashboard routes (Properties, Rooms, Bookings, Events, Calendar, Settings).
**UI Component System**: shadcn/ui (Radix UI primitives) with Tailwind CSS, custom HSL color variables for theming, and distinct design schemes for the dashboard and booking widget.
**State Management**: React Query for server state, React Hook Form with Zod for form handling. No global client state library.
**Design Tokens**: Inter font, HSL-based color palette with separate schemes for dashboard and booking widget.

### Backend Architecture

**Server Framework**: Express.js with TypeScript on Node.js.
**API Design**: RESTful endpoints with standard CRUD operations, publicly accessible without authentication.
**Authentication Strategy**: No authentication required; a default user is seeded at startup for direct access.
**Data Access Layer**: Drizzle ORM for type-safe PostgreSQL queries, using a repository pattern for entities.
**Validation**: Zod schemas for runtime type validation at the API boundary.

### Database Schema

**ORM**: Drizzle ORM with Neon serverless PostgreSQL driver.
**Core Entities**:
1.  **Users**: Property owners (id, email, password (nullable), fullName).
2.  **Properties**: Physical locations (id, ownerId, name, description, address, roomsCount, active status).
3.  **Rooms**: Bookable units (id, propertyId, name, maxGuests, pricePerNight).
4.  **Bookings**: Guest reservations (id, roomId, propertyId, guest details, check-in/out dates, total price, status).
5.  **Events**: Local events (id, propertyId, title, description, eventDate, location, category).
**Database Relationships**: One-to-many relationships between Users and Properties, Properties and Rooms/Bookings/Events, and Rooms and Bookings.
**Migration System**: Drizzle Kit.

### Development Workflow

**Build System**: Vite for client, tsx/esbuild for server.
**Module Resolution**: Path aliases (`@/`, `@shared/`), ESM modules.

### Feature Specifications

**Public Booking Calendar (`/dashboard/calendario`)**: Dual-month calendar with date range selection, Italian locale, event indicators, filterable event list by category, dynamic room display with price calculation, and a multi-step booking modal.
**Embeddable Widget System**: Public API endpoint for property data, a standalone widget page (`/widget/:propertyId`) for embedding, an embed script for auto-resizing iframes, and a dashboard generator for embed codes. Events are sorted chronologically.

## External Dependencies

### Database & Infrastructure
-   **Neon PostgreSQL**: Serverless PostgreSQL database.
-   **Drizzle ORM**: Type-safe ORM for schema management and migrations.
-   **connect-pg-simple**: PostgreSQL-backed session store.

### UI & Styling
-   **Tailwind CSS**: Utility-first CSS framework.
-   **Radix UI**: Headless UI components.
-   **shadcn/ui**: Component library built on Radix primitives.
-   **Lucide React**: Icon library.
-   **class-variance-authority**: For component variants.
-   **cmdk**: Command palette component.

### Forms & Validation
-   **React Hook Form**: Form state management.
-   **Zod**: Runtime type validation and schema definition.
-   **@hookform/resolvers**: Zod resolver for React Hook Form.

### Data Fetching
-   **TanStack Query (React Query)**: Server state management.
-   **wouter**: Lightweight client-side routing.

### Date Handling & Animations
-   **date-fns**: Date utility library (with Italian locale).
-   **canvas-confetti**: Celebration animations.

### Development
-   **Vite**: Frontend build tool and dev server.
-   **tsx**: TypeScript execution for Node.js.
-   **esbuild**: JavaScript bundler for production server.
-   **TypeScript**: Static type checking.
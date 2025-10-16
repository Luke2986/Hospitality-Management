# Design Guidelines: Hospitality Booking Management System

## Design Approach

**Hybrid Strategy**: This application serves two distinct user experiences requiring different design approaches:

1. **Dashboard (Property Owner)**: Clean, efficient, data-focused interface inspired by modern SaaS tools like Linear and Notion - prioritizing information density and workflow efficiency
2. **Booking Widget (Public)**: Trust-building, conversion-optimized design drawing from hospitality leaders like Airbnb and Booking.com - emphasizing visual appeal and user confidence

## Core Design Elements

### A. Color Palette

**Dashboard (Professional)**
- Primary: 217 91% 60% (Blue - actions, links, focus states)
- Background: 0 0% 100% (White)
- Card backgrounds: 210 20% 98% (Subtle off-white)
- Text primary: 222 47% 11% (Dark slate)
- Text secondary: 215 16% 47% (Medium gray)
- Borders: 214 32% 91% (Light gray)

**Booking Widget (Warm & Inviting)**
- Primary: 217 91% 60% (Consistent blue for trust)
- Accent: 24 95% 53% (Warm coral for CTAs - 240 95% 53%)
- Success: 142 71% 45% (Confirmation green)
- Background: 0 0% 100%
- Surface: 40 23% 97% (Warm off-white for cards)

**Status Colors (Both)**
- Confirmed: 142 71% 45% (Green)
- Pending: 38 92% 50% (Amber/Orange) 
- Cancelled: 0 72% 51% (Red)

**Dark Mode** (Dashboard only)
- Background: 222 47% 11%
- Cards: 217 33% 17%
- Text: 210 40% 98%
- Borders: 217 20% 30%

### B. Typography

**Font Family**: Inter (Google Fonts)
- Primary font for all text
- Load weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

**Dashboard Hierarchy**
- Page titles: text-3xl font-bold (30px)
- Section headings: text-xl font-semibold (20px)
- Card titles: text-lg font-medium (18px)
- Body text: text-base font-normal (16px)
- Helper text: text-sm text-gray-600 (14px)
- Table headers: text-sm font-medium uppercase tracking-wide

**Booking Widget Hierarchy**
- Main heading: text-4xl font-bold (36px)
- Step titles: text-2xl font-semibold (24px)
- Room titles: text-xl font-semibold (20px)
- Body: text-base (16px)
- Captions: text-sm text-gray-600 (14px)

### C. Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** consistently
- Micro spacing (elements): p-2, gap-2
- Component padding: p-4, p-6
- Section spacing: py-8, py-12, py-16
- Page margins: px-4, px-6, px-8

**Dashboard Container Widths**
- Sidebar: w-64 (fixed 256px)
- Main content: max-w-7xl mx-auto px-6
- Modals: max-w-2xl (672px)
- Forms: max-w-xl (576px)

**Booking Widget Containers**
- Full width: max-w-6xl mx-auto
- Two-column split: 2/3 booking flow + 1/3 events sidebar on desktop
- Mobile: Stack vertically with full width

### D. Component Library

**Dashboard Components**

*Navigation Sidebar*
- Full-height fixed sidebar with property switcher at top
- Navigation items with icons (Lucide React), active state with background tint and border-l-4 accent
- Hover states: subtle background change
- Logout button at bottom with divider

*Data Tables*
- Striped rows (even rows with gray-50 background)
- Hover: entire row background change to gray-100
- Column headers: sticky, background white, border-b-2
- Action buttons: icon-only, ghost variant, grouped in final column
- Pagination: centered below table, showing "X-Y of Z results"

*Stats Cards*
- White background, shadow-sm, rounded-lg, border
- Icon in colored circle (bg-primary-100, text-primary-600)
- Large number: text-3xl font-bold
- Label below: text-sm text-gray-600
- Trend indicator: small percentage with arrow

*Form Inputs*
- Labels: text-sm font-medium mb-1.5
- Inputs: border rounded-lg, focus:ring-2 ring-primary-500, px-4 py-2.5
- Error states: border-red-500, text-red-600 helper text
- Required fields: asterisk in label

*Status Badges*
- Rounded-full px-3 py-1 text-xs font-medium
- Color variants for confirmed/pending/cancelled
- Uppercase text with letter-spacing

**Booking Widget Components**

*Date Picker*
- Prominent calendar interface, large touch targets (min 44px)
- Disabled dates: reduced opacity with diagonal line pattern
- Selected range: primary color background with gradient
- Current day: border-2 border-primary

*Room Cards*
- Image at top (if available): aspect-video, rounded-t-lg, object-cover
- Content padding: p-6
- Title, description (2 lines max with ellipsis)
- Amenities/guests: icon + text inline
- Price: large, bold, right-aligned
- CTA button: full-width, primary color, "Book This Room"

*Event Cards (Sidebar)*
- Compact design: flex row, gap-4
- Date badge: colored square with day/month
- Title: font-medium, 1 line max
- Category: small badge, lowercase
- "Learn More" link: text-sm text-primary

*Booking Summary*
- Sticky on scroll (desktop)
- White card with shadow-lg
- Line items with dotted borders between
- Total: text-2xl font-bold, border-t-2 pt-4
- "Confirm Booking" button: large, accent color, pulse animation on hover

*Guest Form*
- Clean, spacious layout with p-6
- Input groups with clear labels
- Privacy checkbox with linked policy (underlined)
- Progressive disclosure: show guest count selector only after room selected

### E. Responsive Breakpoints

- Mobile: < 640px (stack all, full-width components)
- Tablet: 640px - 1024px (collapsible sidebar, 2-column where possible)
- Desktop: > 1024px (full sidebar, multi-column layouts)

**Dashboard Mobile Adaptations**
- Hamburger menu replaces sidebar
- Stats cards: 1 column stack
- Tables: horizontal scroll with sticky first column
- Modals: full-screen on mobile

**Widget Mobile Adaptations**
- Events sidebar moves below booking form
- Room cards: full width
- Date picker: full-screen overlay
- Larger touch targets (min 48px)

### F. Interactions & Animations

**Minimal, Purposeful Motion**
- Page transitions: fade-in with 150ms duration
- Hover states: 100ms ease-in-out
- Modals: scale from 0.95 to 1 with fade
- Success states: check icon with scale bounce
- Loading states: spinner (not skeleton screens)
- Form validation: shake animation on error

**NO distracting animations**: No parallax, no scroll-triggered animations, no auto-playing anything

## Images Strategy

**Dashboard**: Minimal imagery
- Property/room photos: user-uploaded, aspect-video ratio, rounded corners
- Empty states: simple illustrations (use heroicons-outline as placeholders)
- Avatar: circular, user initials if no photo

**Booking Widget**: Strategic imagery
- Room photos: High-quality, aspect-video, showcase the space authentically
- Placeholder when unavailable: gradient background with room icon
- Event images: Optional, small thumbnails (80x80px) in sidebar cards
- No hero image needed - widget starts directly with functionality

## Accessibility & Quality

- WCAG 2.1 AA compliance minimum
- Keyboard navigation: visible focus rings (ring-2 ring-offset-2)
- Color contrast: 4.5:1 for body text, 3:1 for large text
- Form labels: always visible, never placeholder-only
- Error messages: descriptive, associated with inputs via aria-describedby
- Loading states: aria-live announcements
- Dark mode: Dashboard only, toggle in settings

## Unique Design Elements

**Property Switcher** (Dashboard header): Dropdown with property logo/icon, name, and quick stats preview

**Availability Calendar View**: Month grid with color-coded cells (green=available, blue=booked, yellow=pending) - clicking cell shows booking details popover

**Smart Booking Conflicts**: When dates conflict, show alternative date suggestions with availability probability

**Event Integration Badge**: Small "3 events during stay" badge on room cards with popover preview

This design system balances professional efficiency for property owners with an inviting, trustworthy experience for booking guests, while maintaining visual consistency through shared color primitives and typography.
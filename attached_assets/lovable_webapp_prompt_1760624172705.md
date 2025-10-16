# PROMPT PER LOVABLE/REPLIT - Sistema Prenotazioni + Eventi per PMI Hospitality

Crea un'applicazione web completa per la gestione di prenotazioni ed eventi per piccole strutture turistiche (B&B, agriturismi, affittacamere).

---

## STACK TECNOLOGICO

**Frontend:**
- React 18 con TypeScript
- Next.js 14 (App Router)
- TailwindCSS per styling
- shadcn/ui per componenti UI
- Lucide React per icone
- React Hook Form per gestione form
- date-fns per manipolazione date

**Backend & Database:**
- Supabase per:
  - PostgreSQL database
  - Authentication (email/password)
  - Row Level Security (RLS)
  - Realtime subscriptions
  
**Deployment:**
- Vercel (o configurazione equivalente per Replit)

---

## DATABASE SCHEMA

Crea le seguenti tabelle in Supabase con relazioni e RLS policies:

### 1. Tabella `users`
```sql
-- Estende auth.users di Supabase
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Tabella `properties`
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  address TEXT,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) DEFAULT 'Italia',
  rooms_count INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own properties"
  ON properties FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own properties"
  ON properties FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own properties"
  ON properties FOR UPDATE
  USING (auth.uid() = owner_id);
```

### 3. Tabella `rooms`
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  max_guests INTEGER NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rooms of own properties"
  ON rooms FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage rooms of own properties"
  ON rooms FOR ALL
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );
```

### 4. Tabella `bookings`
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  guest_name VARCHAR(200) NOT NULL,
  guest_email VARCHAR(200) NOT NULL,
  guest_phone VARCHAR(50),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests_count INTEGER NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bookings for own properties"
  ON bookings FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update bookings of own properties"
  ON bookings FOR UPDATE
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );
```

### 5. Tabella `events`
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  end_date DATE,
  location VARCHAR(200),
  category VARCHAR(50), -- sagra, concerto, fiera, sport, religioso, cultura, mercato
  is_automatic BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  source_url VARCHAR(500),
  confidence VARCHAR(20), -- confirmed, likely, tentative
  status VARCHAR(20) DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(property_id, title, event_date)
);

-- RLS Policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view future events"
  ON events FOR SELECT
  USING (event_date >= CURRENT_DATE AND status = 'confirmed');

CREATE POLICY "Users can manage events of own properties"
  ON events FOR ALL
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );
```

---

## ARCHITETTURA APPLICAZIONE

### Struttura Cartelle
```
/app
  /auth
    /login - Pagina login
    /signup - Pagina registrazione
  /dashboard - Area proprietario (protetta)
    /page.tsx - Dashboard overview
    /properties - Gestione proprietà
    /bookings - Lista prenotazioni
    /rooms - Gestione camere
    /events - Gestione eventi
    /settings - Impostazioni account
  /widget/[propertyId] - Widget prenotazione pubblico
  /api
    /bookings - API endpoints per prenotazioni
    
/components
  /ui - Componenti shadcn/ui
  /dashboard - Componenti dashboard
  /booking - Componenti widget prenotazione
  /events - Componenti calendario eventi
  
/lib
  /supabase - Client Supabase
  /utils - Utility functions
```

---

## FEATURES DA IMPLEMENTARE

### FASE 1: AUTENTICAZIONE & SETUP (Priority HIGH)

**1. Sistema Autenticazione**
- Pagina login con email/password
- Pagina registrazione nuovi utenti
- Reset password via email
- Protected routes con middleware
- Logout functionality
- Session management

**Components needed:**
- `LoginForm` - Form login con validazione
- `SignupForm` - Form registrazione
- `AuthProvider` - Context per stato auth

---

### FASE 2: DASHBOARD PROPRIETARIO (Priority HIGH)

**1. Layout Dashboard**
- Sidebar navigazione con:
  - Home / Dashboard
  - Prenotazioni
  - Camere
  - Eventi
  - Impostazioni
  - Logout
- Header con nome utente e proprietà attiva
- Responsive mobile (hamburger menu)

**2. Dashboard Home (Statistiche Base)**
Display cards con metriche:
- Prenotazioni questo mese
- Prenotazioni pending (da confermare)
- Tasso occupazione corrente
- Revenue totale mese corrente
- Prossimi check-in (lista)
- Eventi prossimi 7 giorni

**3. Gestione Proprietà**
- Form creazione nuova proprietà (nome, città, indirizzo, descrizione)
- Lista proprietà esistenti
- Edit/Delete proprietà
- Switch tra proprietà se multiple
- Validazione form con React Hook Form

**4. Gestione Camere**
- Lista camere per proprietà selezionata
- Form creazione nuova camera:
  - Nome camera
  - Descrizione
  - Max ospiti (number input)
  - Prezzo per notte (currency input)
  - Toggle disponibilità
- Edit/Delete camera
- Visual card design per ogni camera

**5. Gestione Prenotazioni**
- Tabella prenotazioni con colonne:
  - Data check-in / check-out
  - Nome ospite
  - Email ospite
  - Camera
  - Ospiti
  - Totale €
  - Status (badge colorato)
  - Azioni (approva/rifiuta/contatta)
- Filtri per:
  - Status (pending/confirmed/cancelled)
  - Date range
  - Camera
- Vista calendario mensile con prenotazioni
- Modal dettaglio prenotazione
- Azioni:
  - Approva prenotazione (pending → confirmed)
  - Rifiuta prenotazione (pending → cancelled)
  - Invia email ospite (mailto link o integrazione)

**6. Gestione Eventi**
- Lista eventi futuri
- Form creazione manuale evento:
  - Titolo
  - Descrizione
  - Data inizio / fine
  - Categoria (select)
  - Location
  - URL fonte (optional)
- Edit/Delete evento
- Badge per distinguere eventi automatici vs manuali
- Calendario view con eventi evidenziati

---

### FASE 3: WIDGET PRENOTAZIONE PUBBLICO (Priority HIGH)

**URL:** `/widget/[propertyId]`

Deve essere embeddabile come iframe nel sito del proprietario.

**Features:**
1. **Date Picker:**
   - Selezione check-in / check-out
   - Disabilita date già prenotate
   - Calcolo automatico notti

2. **Selezione Camera:**
   - Mostra camere disponibili per date selezionate
   - Card per ogni camera con:
     - Nome e descrizione
     - Max ospiti
     - Prezzo per notte
     - Totale calcolato (notti × prezzo)
     - Button "Prenota questa camera"

3. **Form Dati Ospite:**
   - Nome completo (required)
   - Email (required, validation)
   - Telefono (optional)
   - Numero ospiti (select, max = camera.max_guests)
   - Note aggiuntive (textarea)
   - Checkbox privacy policy

4. **Sidebar Eventi:**
   - Box "Eventi nelle vicinanze"
   - Lista eventi durante periodo soggiorno
   - Card compatta per evento con:
     - Titolo
     - Data
     - Categoria badge
     - "Scopri di più" link

5. **Conferma & Submit:**
   - Riepilogo prenotazione
   - Totale finale
   - Button "Conferma Prenotazione"
   - Loading state durante submit
   - Success message con riepilogo
   - Error handling

6. **Styling:**
   - Design pulito, moderno, mobile-first
   - Colors brand-neutral (customizzabili via props)
   - Responsive per tutti i device
   - Animazioni smooth (framer-motion optional)

**API Endpoint per Widget:**
```typescript
// GET /api/bookings/availability
// Ritorna camere disponibili per date specifiche

// POST /api/bookings
// Crea nuova prenotazione (status: pending)
```

---

### FASE 4: EMAIL NOTIFICATIONS (Priority MEDIUM)

Integrazione con Resend o simile per inviare email automatiche:

1. **Nuova prenotazione → Proprietario:**
   - "Hai una nuova richiesta di prenotazione da [nome]"
   - Dettagli prenotazione
   - Link diretto alla dashboard

2. **Conferma prenotazione → Ospite:**
   - "Prenotazione confermata per [nome proprietà]"
   - Dettagli soggiorno
   - Contatti proprietà

3. **Rifiuto prenotazione → Ospite:**
   - "Ci dispiace, la prenotazione non può essere confermata"
   - Motivazione (optional)

---

## DESIGN SYSTEM

### Colors (TailwindCSS)
```javascript
theme: {
  extend: {
    colors: {
      primary: {
        50: '#eff6ff',
        500: '#3b82f6', // Blu principale
        600: '#2563eb',
        700: '#1d4ed8',
      },
      success: '#10b981', // Verde per confirmed
      warning: '#f59e0b', // Arancione per pending
      danger: '#ef4444',  // Rosso per cancelled
    }
  }
}
```

### Typography
- Font: Inter (Google Fonts)
- Headers: font-bold
- Body: font-normal
- Small text: text-sm text-gray-600

### Components Standards
- Buttons: rounded-lg, hover states, disabled states
- Cards: shadow-sm, border, rounded-lg, p-6
- Inputs: border-gray-300, focus:ring-2 focus:ring-primary-500
- Tables: striped rows, hover highlights
- Modals: backdrop blur, centered, max-width
- Badges: rounded-full, px-3 py-1, text-xs font-medium

---

## ROUTING & NAVIGATION

### Public Routes
- `/` - Landing page (semplice hero + CTA)
- `/auth/login` - Login
- `/auth/signup` - Signup
- `/widget/[propertyId]` - Widget prenotazione

### Protected Routes (require auth)
- `/dashboard` - Overview
- `/dashboard/properties` - CRUD proprietà
- `/dashboard/bookings` - Gestione prenotazioni
- `/dashboard/rooms` - Gestione camere
- `/dashboard/events` - Gestione eventi
- `/dashboard/settings` - Impostazioni utente

**Middleware per protezione route:**
```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }
}
```

---

## UTILITIES & HELPERS

### Date Utils
```typescript
// Calcola numero notti tra date
export function calculateNights(checkIn: Date, checkOut: Date): number

// Formatta data per display
export function formatDate(date: Date): string

// Check se data è disponibile
export function isDateAvailable(date: Date, bookings: Booking[]): boolean
```

### Price Utils
```typescript
// Formatta prezzo in EUR
export function formatPrice(amount: number): string

// Calcola totale prenotazione
export function calculateBookingTotal(
  pricePerNight: number, 
  nights: number
): number
```

### Validation Utils
```typescript
// Valida email
export function isValidEmail(email: string): boolean

// Valida phone
export function isValidPhone(phone: string): boolean

// Valida date range
export function isValidDateRange(checkIn: Date, checkOut: Date): boolean
```

---

## STATE MANAGEMENT

Usa React Context + hooks per:

1. **AuthContext** - Stato autenticazione globale
2. **PropertyContext** - Proprietà selezionata corrente
3. **BookingsContext** - Lista prenotazioni in cache

**No Redux necessario** - Supabase realtime + React Query è sufficiente.

---

## PERFORMANCE & UX

### Loading States
- Skeleton screens per liste
- Spinner per submit button
- Progress bar per multi-step form

### Error Handling
- Toast notifications per successo/errore
- Form validation errors inline
- 404 page custom
- Error boundary per crash prevention

### Accessibility
- ARIA labels su tutti gli interactive elements
- Keyboard navigation support
- Focus visible states
- Screen reader friendly

---

## INITIAL DATA SETUP

Dopo primo signup, guida utente a:
1. Creare prima proprietà
2. Aggiungere almeno 1 camera
3. Generare codice embed per widget
4. (Optional) Aggiungere primi eventi manualmente

**Onboarding flow con steps:**
- Welcome screen
- "Aggiungi la tua proprietà"
- "Crea le tue camere"
- "Copia il codice per il tuo sito"
- "✓ Setup completo!"

---

## SECURITY CONSIDERATIONS

1. **RLS su tutte le tabelle** - Mai bypass RLS policies
2. **Input sanitization** - Valida tutti gli input
3. **Rate limiting** - Su API pubbliche (widget)
4. **CORS configuration** - Per iframe embedding
5. **Environment variables** - Mai hard-code secrets
6. **SQL injection prevention** - Usa Supabase client correttamente

---

## RESPONSIVE BREAKPOINTS

- **Mobile:** < 640px (single column, hamburger menu)
- **Tablet:** 640px - 1024px (2 columns sidebar)
- **Desktop:** > 1024px (full sidebar sempre visibile)

**Widget prenotazione:** sempre responsive, test su mobile priority.

---

## OUTPUT RICHIESTO

Genera l'applicazione completa con:

1. ✅ Setup progetto Next.js + Supabase
2. ✅ Database schema con RLS policies
3. ✅ Sistema autenticazione funzionante
4. ✅ Dashboard completa con tutte le sezioni
5. ✅ Widget prenotazione pubblico funzionante
6. ✅ Componenti UI con shadcn/ui
7. ✅ Validazione form con React Hook Form
8. ✅ Routing protetto con middleware
9. ✅ Responsive design mobile-first
10. ✅ Error handling e loading states

**Priorità implementazione:**
1. Auth + Database setup
2. Dashboard layout + navigation
3. Gestione proprietà + camere
4. Widget prenotazione
5. Gestione prenotazioni
6. Gestione eventi

**Escludi per ora:**
- Pagamenti (Stripe integration)
- Upload immagini camere
- Multi-language
- App mobile
- Analytics avanzate

Questi saranno aggiunti in iterazioni successive.

---

## ESEMPIO CODICE EMBED WIDGET

Genera automaticamente per ogni proprietà:

```html
<!-- Codice da copiare nel sito del proprietario -->
<iframe 
  src="https://tuodominio.com/widget/[property-id]"
  width="100%"
  height="800px"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>
```

---

## NOTE FINALI

- Usa TypeScript strict mode
- Commenta il codice complesso
- Crea README.md con istruzioni setup
- Usa naming conventions consistenti
- Test base funzionalità critiche (auth, booking creation)

**Il sistema deve essere pronto per beta test con 3-5 proprietari reali.**

Focus su: funzionalità core, stabilità, UX pulita.  
Evita: over-engineering, feature non richieste, design eccessivamente complesso.

---

**Inizia la generazione dell'applicazione.**
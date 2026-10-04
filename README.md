# Hospitality Management

**[Italiano](#italiano) · [English](#english)**

---

## Italiano

Gestionale web per piccole strutture ricettive (B&B, agriturismi, case vacanza). Include una dashboard per il proprietario, un calendario di prenotazione pubblico e un widget incorporabile in siti esterni (es. WordPress). L'interfaccia è interamente in italiano.

> **Stato: prototipo, non pronto per la produzione.** Vedi [Problemi noti](#problemi-noti).

### Funzionalità

- **Dashboard** (`/dashboard`): gestione di strutture, camere, prenotazioni ed eventi locali, calendario e impostazioni.
- **Calendario di prenotazione** (`/dashboard/calendario`): doppio mese con selezione del periodo, eventi locali filtrabili per categoria, camere disponibili con prezzo calcolato (notti × tariffa) e modal di prenotazione.
- **Widget incorporabile** (`/widget/:propertyId`): la stessa esperienza del calendario, caricata in un iframe che si ridimensiona da solo tramite `client/public/widget.js`. Le impostazioni generano il codice di incorporamento.
- **Eventi locali**: categorie `sagra`, `concerto`, `fiera`, `sport`, `religioso`, `cultura`, `mercato`, `altro`.

### Stack

| Livello | Tecnologie |
|---|---|
| Frontend | React 18, TypeScript, Vite, Wouter, TanStack Query, React Hook Form + Zod, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (pensato per Neon), Drizzle ORM / Drizzle Kit |

### Requisiti

- Node.js 20+
- Un database PostgreSQL raggiungibile

### Avvio in locale

```bash
git clone https://github.com/Luke2986/Hospitality-Management.git
cd Hospitality-Management
npm install
export DATABASE_URL="postgres://utente:password@host:5432/nomedb"
npm run db:push
npm run dev
```

L'app (API e client) risponde su `http://localhost:5000`.

### Variabili d'ambiente

| Variabile | Obbligatoria | Descrizione |
|---|---|---|
| `DATABASE_URL` | sì | Stringa di connessione PostgreSQL |
| `PORT` | no | Porta del server (default `5000`) |

### Script

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo (Express + Vite) |
| `npm run build` | Build del client e bundle del server in `dist/` |
| `npm run start` | Avvia la build di produzione |
| `npm run check` | Controllo dei tipi TypeScript |
| `npm run db:push` | Applica lo schema al database con Drizzle Kit |

### Incorporare il widget

```html
<div data-booking-widget data-property-id="ID_STRUTTURA"></div>
<script src="https://TUO-DOMINIO/widget.js"></script>
```

Per usare un dominio diverso da quello della pagina, definire prima `window.BOOKING_WIDGET_URL`.

### API

Tutte le rotte sono sotto `/api` e restituiscono JSON.

| Risorsa | Rotte |
|---|---|
| Strutture | `GET/POST /api/properties`, `PATCH/DELETE /api/properties/:id` |
| Camere | `GET/POST /api/rooms`, `PATCH/DELETE /api/rooms/:id` |
| Prenotazioni | `GET/POST /api/bookings`, `PATCH/DELETE /api/bookings/:id` |
| Eventi | `GET/POST /api/events`, `PATCH/DELETE /api/events/:id` |
| Widget | `GET /api/widget/properties/:propertyId` |

### Struttura del progetto

```
client/      Frontend React (pagine, componenti, widget.js)
server/      Express: routes.ts, storage.ts (Drizzle), db.ts, index.ts
shared/      Schema Drizzle e schemi Zod condivisi
migrations/  Migrazioni generate da Drizzle Kit
attached_assets/  File di riferimento e screenshot (non usati dall'app)
```

### Problemi noti

Elenco da risolvere. Ordinato per gravità.

**Sicurezza (critici)**

1. **Nessuna autenticazione sulle API.** Chiunque conosca l'URL può leggere, modificare ed eliminare strutture, camere, prenotazioni (con dati personali degli ospiti) ed eventi.
2. **Nessuna autorizzazione né multi-tenant.** Tutte le strutture appartengono a un utente di sistema fisso (`00000000-0000-0000-0000-000000000000`); `GET /api/properties` e `GET /api/bookings` restituiscono i dati di tutti.
3. **Mass assignment sui `PATCH`.** `req.body` viene passato direttamente a `storage.update*` senza validazione Zod: si possono sovrascrivere campi come `ownerId`, `propertyId`, `status`, `totalPrice`.
4. **`totalPrice` deciso dal client.** Il prezzo totale della prenotazione arriva dal body e non viene ricalcolato dal server.
5. **CORS aperto (`*`) e `frame-ancestors *`** su `/widget`, `/api/widget` e su qualunque percorso che termini in `.js` o `.html`; `widget.js` ha il controllo dell'origine dei messaggi commentato.
6. **TLS al database senza verifica** (`rejectUnauthorized: false` in `server/db.ts`).
7. **Nessun rate limiting, nessun CAPTCHA** sulla creazione di prenotazioni pubbliche: possibile spam.
8. **Messaggi d'errore interni esposti** (`error.message` restituito al client) e log che includono il corpo delle risposte JSON, con dati personali.

**Correttezza (alti)**

9. **Login e registrazione non funzionanti.** `login.tsx`, `signup.tsx` e `settings.tsx` chiamano `/api/auth/login`, `/api/auth/signup` e `/api/auth/me`, che non esistono. Passport, express-session e connect-pg-simple sono installati ma mai usati.
10. **Nessun controllo di disponibilità.** Si possono creare prenotazioni sovrapposte sulla stessa camera; non si verifica `checkOut > checkIn`, né `guestsCount <= maxGuests`, né `isAvailable` lato server.
11. **Race condition** sulla creazione di prenotazioni (nessuna transazione né vincolo di esclusione sulle date).
12. **Gestione errori incoerente.** I `DELETE` rispondono sempre `success` anche se la risorsa non esiste; il gestore errori globale rilancia l'errore dopo aver risposto (`throw err`), con rischio di crash del processo.
13. **Filtri senza validazione.** I parametri di query sono castati a stringa senza controllo; un `id` non-UUID genera un errore 500 invece di 400.
14. **Soft-delete assente e cancellazioni a cascata.** Eliminare una struttura cancella camere, prenotazioni ed eventi senza conferma né backup.

**Qualità e manutenzione (medi)**

15. **Documentazione contraddittoria.** `replit.md` dichiara "nessuna autenticazione", ma esistono pagine e dipendenze di auth.
16. **Nessun test automatico** (unit, integrazione, e2e) e nessuna CI.
17. **Nessun `.env.example`** e nessuna validazione delle variabili d'ambiente all'avvio oltre a `DATABASE_URL`.
18. **Funzionalità solo accennate nello schema:** `isAutomatic`, `isRecurring`, `sourceUrl`, `confidence` negli eventi non sono usate (nessuna importazione automatica).
19. **Nessuna paginazione** su liste di camere, prenotazioni ed eventi.
20. **Nessuna notifica email** all'ospite o al proprietario alla creazione di una prenotazione.
21. **Rumore nel repository:** `attached_assets/` (screenshot, file di un altro progetto come `CarCard.tsx`, un archivio `.tar.gz`) e configurazione Replit (`.replit`) mescolati al codice.
22. **Nessuna licenza esplicita** nel repository (`package.json` dichiara MIT, manca il file `LICENSE`).
23. **Account e dati non conformi al GDPR:** dati personali degli ospiti raccolti senza informativa, consenso o politica di conservazione.

---

## English

Web-based management system for small hospitality businesses (B&Bs, farm stays, vacation rentals). It provides an owner dashboard, a public booking calendar, and a widget that can be embedded in external sites (e.g. WordPress). The UI is entirely in Italian.

> **Status: prototype, not production-ready.** See [Known issues](#known-issues).

### Features

- **Dashboard** (`/dashboard`): manage properties, rooms, bookings and local events, plus calendar and settings.
- **Booking calendar** (`/dashboard/calendario`): dual-month date-range picker, local events filterable by category, available rooms with computed price (nights × rate), and a booking modal.
- **Embeddable widget** (`/widget/:propertyId`): the same calendar experience loaded in an iframe that auto-resizes through `client/public/widget.js`. The settings page generates the embed code.
- **Local events**: categories `sagra`, `concerto`, `fiera`, `sport`, `religioso`, `cultura`, `mercato`, `altro`.

### Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite, Wouter, TanStack Query, React Hook Form + Zod, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (designed for Neon), Drizzle ORM / Drizzle Kit |

### Requirements

- Node.js 20+
- A reachable PostgreSQL database

### Getting started

```bash
git clone https://github.com/Luke2986/Hospitality-Management.git
cd Hospitality-Management
npm install
export DATABASE_URL="postgres://user:password@host:5432/dbname"
npm run db:push
npm run dev
```

The app (API and client) is served at `http://localhost:5000`.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `PORT` | no | Server port (default `5000`) |

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server (Express + Vite) |
| `npm run build` | Build the client and bundle the server into `dist/` |
| `npm run start` | Run the production build |
| `npm run check` | TypeScript type check |
| `npm run db:push` | Push the schema to the database with Drizzle Kit |

### Embedding the widget

```html
<div data-booking-widget data-property-id="PROPERTY_ID"></div>
<script src="https://YOUR-DOMAIN/widget.js"></script>
```

To load the widget from a different domain than the host page, define `window.BOOKING_WIDGET_URL` first.

### API

All routes live under `/api` and return JSON.

| Resource | Routes |
|---|---|
| Properties | `GET/POST /api/properties`, `PATCH/DELETE /api/properties/:id` |
| Rooms | `GET/POST /api/rooms`, `PATCH/DELETE /api/rooms/:id` |
| Bookings | `GET/POST /api/bookings`, `PATCH/DELETE /api/bookings/:id` |
| Events | `GET/POST /api/events`, `PATCH/DELETE /api/events/:id` |
| Widget | `GET /api/widget/properties/:propertyId` |

### Project structure

```
client/      React frontend (pages, components, widget.js)
server/      Express: routes.ts, storage.ts (Drizzle), db.ts, index.ts
shared/      Drizzle schema and shared Zod schemas
migrations/  Migrations generated by Drizzle Kit
attached_assets/  Reference files and screenshots (not used by the app)
```

### Known issues

To be fixed. Ordered by severity.

**Security (critical)**

1. **No authentication on the API.** Anyone who knows the URL can read, modify and delete properties, rooms, bookings (including guests' personal data) and events.
2. **No authorization or multi-tenancy.** All properties belong to a hardcoded system user (`00000000-0000-0000-0000-000000000000`); `GET /api/properties` and `GET /api/bookings` return everyone's data.
3. **Mass assignment on `PATCH`.** `req.body` is passed straight to `storage.update*` with no Zod validation, so fields such as `ownerId`, `propertyId`, `status` and `totalPrice` can be overwritten.
4. **Client-controlled `totalPrice`.** The booking total comes from the request body and is never recomputed server-side.
5. **Wide-open CORS (`*`) and `frame-ancestors *`** on `/widget`, `/api/widget`, and any path ending in `.js` or `.html`; the message-origin check in `widget.js` is commented out.
6. **Unverified TLS to the database** (`rejectUnauthorized: false` in `server/db.ts`).
7. **No rate limiting or CAPTCHA** on public booking creation: spam is possible.
8. **Internal error messages leaked** (`error.message` returned to clients) and request logs that include JSON response bodies containing personal data.

**Correctness (high)**

9. **Login and signup do not work.** `login.tsx`, `signup.tsx` and `settings.tsx` call `/api/auth/login`, `/api/auth/signup` and `/api/auth/me`, which do not exist. Passport, express-session and connect-pg-simple are installed but never used.
10. **No availability check.** Overlapping bookings can be created for the same room; the server does not verify `checkOut > checkIn`, `guestsCount <= maxGuests`, or `isAvailable`.
11. **Race condition** on booking creation (no transaction or date-range exclusion constraint).
12. **Inconsistent error handling.** `DELETE` always answers `success` even when the resource does not exist; the global error handler rethrows after responding (`throw err`), which can crash the process.
13. **Unvalidated query filters.** Query params are cast to string without checks; a non-UUID `id` yields a 500 instead of a 400.
14. **No soft delete, cascading hard deletes.** Deleting a property wipes its rooms, bookings and events with no confirmation or backup.

**Quality and maintenance (medium)**

15. **Contradictory docs.** `replit.md` says "no authentication", yet auth pages and dependencies exist.
16. **No automated tests** (unit, integration, e2e) and no CI.
17. **No `.env.example`**, and no environment validation at startup beyond `DATABASE_URL`.
18. **Half-built features in the schema:** `isAutomatic`, `isRecurring`, `sourceUrl`, `confidence` on events are unused (no automatic import exists).
19. **No pagination** on room, booking and event lists.
20. **No email notifications** to the guest or owner when a booking is created.
21. **Repository noise:** `attached_assets/` (screenshots, files from another project such as `CarCard.tsx`, a `.tar.gz` archive) and Replit config (`.replit`) mixed in with the code.
22. **No explicit license file** (`package.json` declares MIT, but there is no `LICENSE`).
23. **GDPR gaps:** guests' personal data is collected with no privacy notice, consent or retention policy.

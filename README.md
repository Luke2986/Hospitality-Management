# Hospitality Management

**[Italiano](#italiano) · [English](#english)**

---

## Italiano

Gestionale web per piccole strutture ricettive (B&B, agriturismi, case vacanza). Include una dashboard per il proprietario, un calendario di prenotazione pubblico e un widget incorporabile in siti esterni (es. WordPress). L'interfaccia è interamente in italiano.

> **Stato: prototipo, non pronto per la produzione.** Vedi [Problemi noti](#problemi-noti).

### Funzionalità

- **Account** (`/signup`, `/login`): registrazione con conferma via email, recupero password (`/forgot-password`). Ogni proprietario vede e modifica solo le proprie strutture e i dati collegati.
- **Dashboard** (`/dashboard`, richiede login): gestione di strutture, camere, prenotazioni ed eventi locali, calendario e impostazioni.
- **Calendario di prenotazione** (`/dashboard/calendario`): doppio mese con selezione del periodo, eventi locali filtrabili per categoria, camere disponibili con prezzo calcolato (notti × tariffa) e modal di prenotazione.
- **Widget incorporabile** (`/widget/:propertyId`): la stessa esperienza del calendario, caricata in un iframe che si ridimensiona da solo tramite `client/public/widget.js`. Le impostazioni generano il codice di incorporamento.
- **Eventi locali**: categorie `sagra`, `concerto`, `fiera`, `sport`, `religioso`, `cultura`, `mercato`, `altro`.

### Stack

| Livello | Tecnologie |
|---|---|
| Frontend | React 18, TypeScript, Vite, Wouter, TanStack Query, React Hook Form + Zod, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, TypeScript, Passport (sessioni su PostgreSQL) |
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
export SESSION_SECRET="$(openssl rand -hex 32)"
npm run db:push
npm run dev
```

L'app (API e client) risponde su `http://localhost:5000`. Crea un account da `/signup`: senza `RESEND_API_KEY` il link di conferma compare nel log del server.

### Variabili d'ambiente

| Variabile | Obbligatoria | Descrizione |
|---|---|---|
| `DATABASE_URL` | sì | Stringa di connessione PostgreSQL |
| `SESSION_SECRET` | sì in produzione | Chiave per firmare il cookie di sessione. In sviluppo, se manca, ne viene generata una casuale a ogni avvio |
| `RESEND_API_KEY` | sì in produzione | Chiave API di [Resend](https://resend.com) per inviare le email di conferma e recupero password. In sviluppo, se manca, il contenuto delle email viene stampato nel log del server |
| `EMAIL_FROM` | sì in produzione | Mittente delle email, es. `Hospitality Manager <noreply@tuodominio.it>` (dominio verificato su Resend) |
| `APP_URL` | sì in produzione | URL pubblico dell'app, usato per i link nelle email (es. `https://tuaapp.replit.app`) |
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

Tutte le rotte sono sotto `/api` e restituiscono JSON. Le rotte del widget e di autenticazione sono pubbliche; tutte le altre richiedono una sessione e operano solo sui dati del proprietario.

| Risorsa | Rotte |
|---|---|
| Autenticazione | `POST /api/auth/signup`, `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Strutture | `GET/POST /api/properties`, `PATCH/DELETE /api/properties/:id` |
| Camere | `GET/POST /api/rooms`, `PATCH/DELETE /api/rooms/:id` |
| Prenotazioni | `GET/POST /api/bookings`, `PATCH/DELETE /api/bookings/:id` |
| Eventi | `GET/POST /api/events`, `PATCH/DELETE /api/events/:id` |
| Widget (pubblico) | `GET /api/widget/properties/:propertyId`, `POST /api/widget/bookings`, `POST /api/widget/bookings/:id/cancel` |

Le prenotazioni dal widget nascono sempre `pending` e il prezzo totale è calcolato dal server.

### Struttura del progetto

```
client/      Frontend React (pagine, componenti, widget.js)
server/      Express: auth.ts, email.ts, routes.ts, storage.ts (Drizzle), db.ts, index.ts
shared/      Schema Drizzle e schemi Zod condivisi
migrations/  Migrazioni generate da Drizzle Kit
attached_assets/  File di riferimento e screenshot (non usati dall'app)
```

### Problemi noti

Elenco da risolvere. Ordinato per gravità.

**Sicurezza**

1. **CORS aperto (`*`) e `frame-ancestors *`** su `/widget`, `/api/widget` e su qualunque percorso che termini in `.js` o `.html`; `widget.js` ha il controllo dell'origine dei messaggi commentato.
2. **TLS al database senza verifica** (`rejectUnauthorized: false` in `server/db.ts`).
3. **Rate limiting solo in memoria**: vale per singolo processo e si azzera al riavvio; nessun CAPTCHA sulle prenotazioni pubbliche.
4. **Messaggi d'errore interni esposti** (`error.message` restituito al client) e log che includono il corpo delle risposte JSON, con dati personali.
5. **Nessuna protezione CSRF esplicita**: ci si affida a `SameSite=Lax` sul cookie di sessione.

**Correttezza**

6. **Prenotazioni sovrapposte.** Nessun controllo di disponibilità sulla stessa camera nelle stesse date, né vincolo a livello di database (race condition).
7. **Date spostate di un giorno.** `BookingModal` converte le date con `toISOString()`, che usa UTC: in Italia check-in e check-out risultano anticipati di un giorno.
8. **Auto-resize del widget non funzionante.** La pagina del widget invia messaggi `type: 'resize'`, ma `widget.js` ascolta `booking-widget-resize`.
9. **Avvio impossibile su macOS.** `server.listen` usa `reusePort: true`, non supportato (`ENOTSUP`).
10. **Gestione errori incoerente.** Il gestore errori globale rilancia l'errore dopo aver risposto (`throw err`).
11. **Soft-delete assente e cancellazioni a cascata.** Eliminare una struttura cancella camere, prenotazioni ed eventi senza backup.
12. **Dati legacy orfani.** Le strutture create prima dell'autenticazione appartengono all'utente di sistema `00000000-0000-0000-0000-000000000000`, che non può accedere: vanno riassegnate a mano (vedi sotto). Gli account creati prima della conferma email devono confermare l'indirizzo: al login compare il pulsante per ricevere il link.

**Qualità e manutenzione**

13. **Documentazione obsoleta.** `replit.md` descrive ancora l'app come "senza autenticazione".
14. **Nessun test automatico** (unit, integrazione, e2e) e nessuna CI.
15. **Nessun `.env.example`.**
16. **Funzionalità solo accennate nello schema:** `isAutomatic`, `isRecurring`, `sourceUrl`, `confidence` negli eventi non sono usate.
17. **Nessuna paginazione** su liste di camere, prenotazioni ed eventi.
18. **Nessuna notifica email per le prenotazioni**, né all'ospite né al proprietario.
19. **Rumore nel repository:** `attached_assets/` (screenshot, file di un altro progetto come `CarCard.tsx`, un archivio `.tar.gz`) e configurazione Replit (`.replit`) mescolati al codice.
20. **Nessuna licenza esplicita** (`package.json` dichiara MIT, manca il file `LICENSE`).
21. **GDPR:** dati personali degli ospiti raccolti senza informativa, consenso o politica di conservazione.

#### Riassegnare i dati legacy

```sql
UPDATE properties
SET owner_id = (SELECT id FROM users WHERE email = 'tua@email.it')
WHERE owner_id = '00000000-0000-0000-0000-000000000000';
```

---

## English

Web-based management system for small hospitality businesses (B&Bs, farm stays, vacation rentals). It provides an owner dashboard, a public booking calendar, and a widget that can be embedded in external sites (e.g. WordPress). The UI is entirely in Italian.

> **Status: prototype, not production-ready.** See [Known issues](#known-issues).

### Features

- **Accounts** (`/signup`, `/login`): sign-up with email confirmation, password reset (`/forgot-password`). Each owner can only see and edit their own properties and related data.
- **Dashboard** (`/dashboard`, login required): manage properties, rooms, bookings and local events, plus calendar and settings.
- **Booking calendar** (`/dashboard/calendario`): dual-month date-range picker, local events filterable by category, available rooms with computed price (nights × rate), and a booking modal.
- **Embeddable widget** (`/widget/:propertyId`): the same calendar experience loaded in an iframe that auto-resizes through `client/public/widget.js`. The settings page generates the embed code.
- **Local events**: categories `sagra`, `concerto`, `fiera`, `sport`, `religioso`, `cultura`, `mercato`, `altro`.

### Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite, Wouter, TanStack Query, React Hook Form + Zod, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, TypeScript, Passport (PostgreSQL-backed sessions) |
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
export SESSION_SECRET="$(openssl rand -hex 32)"
npm run db:push
npm run dev
```

The app (API and client) is served at `http://localhost:5000`. Create an account at `/signup`: without `RESEND_API_KEY` the confirmation link is printed to the server log.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `SESSION_SECRET` | yes in production | Key used to sign the session cookie. In development a random one is generated on each start if missing |
| `RESEND_API_KEY` | yes in production | [Resend](https://resend.com) API key used to send confirmation and password reset emails. In development, if missing, email contents are printed to the server log |
| `EMAIL_FROM` | yes in production | Email sender, e.g. `Hospitality Manager <noreply@yourdomain.com>` (domain verified on Resend) |
| `APP_URL` | yes in production | Public URL of the app, used for links in emails (e.g. `https://yourapp.replit.app`) |
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

All routes live under `/api` and return JSON. Widget and auth routes are public; every other route requires a session and only touches the owner's data.

| Resource | Routes |
|---|---|
| Auth | `POST /api/auth/signup`, `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Properties | `GET/POST /api/properties`, `PATCH/DELETE /api/properties/:id` |
| Rooms | `GET/POST /api/rooms`, `PATCH/DELETE /api/rooms/:id` |
| Bookings | `GET/POST /api/bookings`, `PATCH/DELETE /api/bookings/:id` |
| Events | `GET/POST /api/events`, `PATCH/DELETE /api/events/:id` |
| Widget (public) | `GET /api/widget/properties/:propertyId`, `POST /api/widget/bookings`, `POST /api/widget/bookings/:id/cancel` |

Widget bookings are always created as `pending`, and the total price is computed server-side.

### Project structure

```
client/      React frontend (pages, components, widget.js)
server/      Express: auth.ts, email.ts, routes.ts, storage.ts (Drizzle), db.ts, index.ts
shared/      Drizzle schema and shared Zod schemas
migrations/  Migrations generated by Drizzle Kit
attached_assets/  Reference files and screenshots (not used by the app)
```

### Known issues

To be fixed. Ordered by severity.

**Security**

1. **Wide-open CORS (`*`) and `frame-ancestors *`** on `/widget`, `/api/widget`, and any path ending in `.js` or `.html`; the message-origin check in `widget.js` is commented out.
2. **Unverified TLS to the database** (`rejectUnauthorized: false` in `server/db.ts`).
3. **In-memory rate limiting only**: per process and reset on restart; no CAPTCHA on public bookings.
4. **Internal error messages leaked** (`error.message` returned to clients) and request logs that include JSON response bodies containing personal data.
5. **No explicit CSRF protection**: relies on `SameSite=Lax` on the session cookie.

**Correctness**

6. **Overlapping bookings.** No availability check for the same room on the same dates, and no database constraint (race condition).
7. **Dates shifted by one day.** `BookingModal` converts dates with `toISOString()`, which uses UTC: in Italy check-in and check-out end up one day early.
8. **Widget auto-resize is broken.** The widget page posts `type: 'resize'` messages, but `widget.js` listens for `booking-widget-resize`.
9. **Cannot start on macOS.** `server.listen` uses `reusePort: true`, which is unsupported there (`ENOTSUP`).
10. **Inconsistent error handling.** The global error handler rethrows after responding (`throw err`).
11. **No soft delete, cascading hard deletes.** Deleting a property wipes its rooms, bookings and events with no backup.
12. **Orphaned legacy data.** Properties created before authentication belong to the system user `00000000-0000-0000-0000-000000000000`, which cannot log in: reassign them manually (see below). Accounts created before email confirmation must confirm their address: the login page offers a button to get the link.

**Quality and maintenance**

13. **Outdated docs.** `replit.md` still describes the app as having "no authentication".
14. **No automated tests** (unit, integration, e2e) and no CI.
15. **No `.env.example`.**
16. **Half-built features in the schema:** `isAutomatic`, `isRecurring`, `sourceUrl`, `confidence` on events are unused.
17. **No pagination** on room, booking and event lists.
18. **No booking email notifications** to the guest or owner.
19. **Repository noise:** `attached_assets/` (screenshots, files from another project such as `CarCard.tsx`, a `.tar.gz` archive) and Replit config (`.replit`) mixed in with the code.
20. **No explicit license file** (`package.json` declares MIT, but there is no `LICENSE`).
21. **GDPR gaps:** guests' personal data is collected with no privacy notice, consent or retention policy.

#### Reassigning legacy data

```sql
UPDATE properties
SET owner_id = (SELECT id FROM users WHERE email = 'you@example.com')
WHERE owner_id = '00000000-0000-0000-0000-000000000000';
```

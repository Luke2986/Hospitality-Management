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
- **Archivio**: strutture e camere non si cancellano ma si archiviano. Spariscono da dashboard e widget, le loro prenotazioni restano, e si ripristinano dalla sezione Archivio. Se ci sono prenotazioni future attive viene chiesta conferma.
- **Eventi locali**: categorie `sagra`, `concerto`, `fiera`, `sport`, `religioso`, `cultura`, `mercato`, `altro`.

### Stack

| Livello | Tecnologie |
|---|---|
| Frontend | React 18, TypeScript, Vite, Wouter, TanStack Query, React Hook Form + Zod, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, TypeScript, Passport (sessioni su PostgreSQL) |
| Database | PostgreSQL (pensato per Neon), Drizzle ORM / Drizzle Kit |

### Requisiti

- Node.js 20.12+
- Un database PostgreSQL raggiungibile

### Avvio in locale

```bash
git clone https://github.com/Luke2986/Hospitality-Management.git
cd Hospitality-Management
npm install
cp .env.example .env   # poi imposta DATABASE_URL e SESSION_SECRET (openssl rand -hex 32)
npm run db:push
npm run dev
```

L'app (API e client) risponde su `http://localhost:5000`. Crea un account da `/signup`: senza `RESEND_API_KEY` il link di conferma compare nel log del server.

### Variabili d'ambiente

Il server e `npm run db:push` leggono il file `.env` nella cartella del progetto (vedi `.env.example`). Le variabili già impostate nell'ambiente hanno la precedenza. Il file `.env` è escluso da git.

| Variabile | Obbligatoria | Descrizione |
|---|---|---|
| `DATABASE_URL` | sì | Stringa di connessione PostgreSQL. Il TLS segue `sslmode`: con `?sslmode=require` (es. Neon) il certificato viene verificato; con un'autorità propria usa `?sslmode=verify-full&sslrootcert=/percorso/ca.crt` (es. Supabase); senza `sslmode` niente TLS, adatto solo a un database locale |
| `SESSION_SECRET` | sì in produzione | Chiave per firmare il cookie di sessione. In sviluppo, se manca, ne viene generata una casuale a ogni avvio |
| `RESEND_API_KEY` | sì in produzione | Chiave API di [Resend](https://resend.com) per inviare le email di conferma e recupero password. In sviluppo, se manca, il contenuto delle email viene stampato nel log del server |
| `EMAIL_FROM` | sì in produzione | Mittente delle email, es. `Hospitality Manager <noreply@tuodominio.it>` (dominio verificato su Resend) |
| `APP_URL` | sì in produzione | URL pubblico dell'app, usato per i link nelle email (es. `https://gestionale.tuodominio.it`) |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | no | Chiavi di [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) (gratuito) per la verifica anti-bot sulle prenotazioni del widget. Vanno impostate entrambe o nessuna; senza chiavi resta attivo solo il campo trappola nascosto |
| `PORT` | no | Porta del server (default `5000`) |
| `TEST_DATABASE_URL` | solo per `npm test` | Database PostgreSQL usa e getta per i test. I test ne cancellano tutti i dati: non usare mai un database con dati veri |

### Script

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo (Express + Vite) |
| `npm run build` | Build del client e bundle del server in `dist/` |
| `npm run start` | Avvia la build di produzione |
| `npm run check` | Controllo dei tipi TypeScript |
| `npm test` | Test di integrazione su un database reale (richiede `TEST_DATABASE_URL`) |
| `npm run db:push` | Applica lo schema al database con Drizzle Kit |
| `npm run db:claim-legacy -- <email>` | Assegna all'account indicato le strutture create prima dell'autenticazione |

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
| Strutture | `GET/POST /api/properties` (`?archived=true` per l'archivio), `PATCH/DELETE /api/properties/:id`, `POST /api/properties/:id/restore` |
| Camere | `GET/POST /api/rooms` (`?archived=true` per l'archivio), `PATCH/DELETE /api/rooms/:id`, `POST /api/rooms/:id/restore` |
| Prenotazioni | `GET/POST /api/bookings`, `PATCH/DELETE /api/bookings/:id` |
| Eventi | `GET/POST /api/events`, `PATCH/DELETE /api/events/:id` |
| Widget (pubblico) | `GET /api/widget/properties/:propertyId`, `POST /api/widget/bookings`, `POST /api/widget/bookings/:id/cancel` |

Le prenotazioni dal widget nascono sempre `pending` e il prezzo totale è calcolato dal server.

`DELETE` su strutture e camere archivia invece di cancellare. Se ci sono prenotazioni future non cancellate risponde `409` con `code: "HAS_UPCOMING_BOOKINGS"` e `upcomingBookings`; per archiviare comunque si ripete la richiesta con `?confirm=true`.

### Struttura del progetto

```
client/      Frontend React (pagine, componenti, widget.js)
server/      Express: auth.ts, email.ts, routes.ts, storage.ts (Drizzle), db.ts, env.ts, turnstile.ts, log-error.ts, claim-legacy.ts, app.ts, index.ts
shared/      Schema Drizzle e schemi Zod condivisi
tests/       Test di integrazione (node:test) sulle API
migrations/  Migrazioni generate da Drizzle Kit
```

### Problemi noti

Elenco da risolvere. Ordinato per gravità.

**Qualità e manutenzione**

1. **Nessuna paginazione** su liste di camere, prenotazioni ed eventi.
2. **Nessuna notifica email per le prenotazioni**, né all'ospite né al proprietario.
3. **Nessun test sul frontend:** i test coprono le API, non l'interfaccia.
4. **GDPR:** dati personali degli ospiti raccolti senza informativa, consenso o politica di conservazione.

### Aggiornare da una versione senza account

Le strutture create prima dell'introduzione degli account appartengono all'utente di sistema `00000000-0000-0000-0000-000000000000`, che non può accedere. Registrati, conferma l'email e poi esegui:

```bash
npm run db:claim-legacy -- tua@email.it
```

Il comando assegna tutte quelle strutture (con camere, prenotazioni ed eventi) al tuo account. Gli account creati prima della conferma email devono confermare l'indirizzo: al login compare il pulsante per ricevere il link.

### Produzione

Il progetto non dipende da nessuna piattaforma: serve un server con Node.js 20.12+ e un database PostgreSQL.

```bash
npm ci
npm run db:push
npm run build
NODE_ENV=production npm start
```

Avvia i comandi dalla cartella del progetto, così viene letto il file `.env`; in alternativa imposta le variabili nell'ambiente. In produzione sono obbligatorie `DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` e `APP_URL`. Metti l'app dietro un reverse proxy con HTTPS (es. Caddy o Nginx): il cookie di sessione è `Secure` e il server si fida di un solo proxy davanti a sé.

### Contribuire

Il progetto è aperto: chiunque può fare fork, migliorarlo e proporre modifiche.

1. Fai fork del repository e crea un branch per la tua modifica.
2. Verifica che `npm run check` e `npm test` passino: la CI di GitHub li esegue su ogni pull request.
3. Apri una pull request spiegando cosa cambia e perché.

La lista dei [problemi noti](#problemi-noti) è un buon punto di partenza.

### Licenza

Copyright (C) 2025-2026 Luca Versilia

Rilasciato sotto **GNU Affero General Public License v3.0 o successiva** (AGPL-3.0-or-later). Testo completo in [`LICENSE`](LICENSE).

In parole semplici:

- puoi usare, studiare, modificare e ridistribuire il codice, anche per scopi commerciali;
- se distribuisci una versione modificata, **oppure la rendi disponibile come servizio online**, devi pubblicare il codice sorgente delle tue modifiche con la stessa licenza AGPL e mantenere questo avviso di copyright;
- il software è fornito senza alcuna garanzia.

Le modifiche che restano solo sul tuo computer, senza essere distribuite né messe online, non devono essere pubblicate.

---

## English

Web-based management system for small hospitality businesses (B&Bs, farm stays, vacation rentals). It provides an owner dashboard, a public booking calendar, and a widget that can be embedded in external sites (e.g. WordPress). The UI is entirely in Italian.

> **Status: prototype, not production-ready.** See [Known issues](#known-issues).

### Features

- **Accounts** (`/signup`, `/login`): sign-up with email confirmation, password reset (`/forgot-password`). Each owner can only see and edit their own properties and related data.
- **Dashboard** (`/dashboard`, login required): manage properties, rooms, bookings and local events, plus calendar and settings.
- **Booking calendar** (`/dashboard/calendario`): dual-month date-range picker, local events filterable by category, available rooms with computed price (nights × rate), and a booking modal.
- **Embeddable widget** (`/widget/:propertyId`): the same calendar experience loaded in an iframe that auto-resizes through `client/public/widget.js`. The settings page generates the embed code.
- **Archive**: properties and rooms are archived instead of deleted. They disappear from the dashboard and widget, their bookings are kept, and they can be restored from the Archive section. Archiving asks for confirmation when there are upcoming active bookings.
- **Local events**: categories `sagra`, `concerto`, `fiera`, `sport`, `religioso`, `cultura`, `mercato`, `altro`.

### Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite, Wouter, TanStack Query, React Hook Form + Zod, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, TypeScript, Passport (PostgreSQL-backed sessions) |
| Database | PostgreSQL (designed for Neon), Drizzle ORM / Drizzle Kit |

### Requirements

- Node.js 20.12+
- A reachable PostgreSQL database

### Getting started

```bash
git clone https://github.com/Luke2986/Hospitality-Management.git
cd Hospitality-Management
npm install
cp .env.example .env   # then set DATABASE_URL and SESSION_SECRET (openssl rand -hex 32)
npm run db:push
npm run dev
```

The app (API and client) is served at `http://localhost:5000`. Create an account at `/signup`: without `RESEND_API_KEY` the confirmation link is printed to the server log.

### Environment variables

The server and `npm run db:push` read the `.env` file in the project folder (see `.env.example`). Variables already set in the environment take precedence. `.env` is ignored by git.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string. TLS follows `sslmode`: with `?sslmode=require` (e.g. Neon) the certificate is verified; for a private CA use `?sslmode=verify-full&sslrootcert=/path/ca.crt` (e.g. Supabase); without `sslmode` there is no TLS, which is only fine for a local database |
| `SESSION_SECRET` | yes in production | Key used to sign the session cookie. In development a random one is generated on each start if missing |
| `RESEND_API_KEY` | yes in production | [Resend](https://resend.com) API key used to send confirmation and password reset emails. In development, if missing, email contents are printed to the server log |
| `EMAIL_FROM` | yes in production | Email sender, e.g. `Hospitality Manager <noreply@yourdomain.com>` (domain verified on Resend) |
| `APP_URL` | yes in production | Public URL of the app, used for links in emails (e.g. `https://app.yourdomain.com`) |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | no | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) keys (free) for bot protection on widget bookings. Set both or neither; without them only the hidden honeypot field is active |
| `PORT` | no | Server port (default `5000`) |
| `TEST_DATABASE_URL` | only for `npm test` | Disposable PostgreSQL database for the tests. The tests wipe all its data: never point it at real data |

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server (Express + Vite) |
| `npm run build` | Build the client and bundle the server into `dist/` |
| `npm run start` | Run the production build |
| `npm run check` | TypeScript type check |
| `npm test` | Integration tests against a real database (needs `TEST_DATABASE_URL`) |
| `npm run db:push` | Push the schema to the database with Drizzle Kit |
| `npm run db:claim-legacy -- <email>` | Assign properties created before authentication to the given account |

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
| Properties | `GET/POST /api/properties` (`?archived=true` for the archive), `PATCH/DELETE /api/properties/:id`, `POST /api/properties/:id/restore` |
| Rooms | `GET/POST /api/rooms` (`?archived=true` for the archive), `PATCH/DELETE /api/rooms/:id`, `POST /api/rooms/:id/restore` |
| Bookings | `GET/POST /api/bookings`, `PATCH/DELETE /api/bookings/:id` |
| Events | `GET/POST /api/events`, `PATCH/DELETE /api/events/:id` |
| Widget (public) | `GET /api/widget/properties/:propertyId`, `POST /api/widget/bookings`, `POST /api/widget/bookings/:id/cancel` |

Widget bookings are always created as `pending`, and the total price is computed server-side.

`DELETE` on properties and rooms archives instead of deleting. With upcoming non-cancelled bookings it returns `409` with `code: "HAS_UPCOMING_BOOKINGS"` and `upcomingBookings`; repeat the request with `?confirm=true` to archive anyway.

### Project structure

```
client/      React frontend (pages, components, widget.js)
server/      Express: auth.ts, email.ts, routes.ts, storage.ts (Drizzle), db.ts, env.ts, turnstile.ts, log-error.ts, claim-legacy.ts, app.ts, index.ts
shared/      Drizzle schema and shared Zod schemas
tests/       API integration tests (node:test)
migrations/  Migrations generated by Drizzle Kit
```

### Known issues

To be fixed. Ordered by severity.

**Quality and maintenance**

1. **No pagination** on room, booking and event lists.
2. **No booking email notifications** to the guest or owner.
3. **No frontend tests:** the tests cover the API, not the UI.
4. **GDPR gaps:** guests' personal data is collected with no privacy notice, consent or retention policy.

### Upgrading from a version without accounts

Properties created before accounts existed belong to the system user `00000000-0000-0000-0000-000000000000`, which cannot log in. Sign up, confirm your email, then run:

```bash
npm run db:claim-legacy -- you@example.com
```

This assigns all of those properties (with their rooms, bookings and events) to your account. Accounts created before email confirmation must confirm their address: the login page offers a button to get the link.

### Production

The project is platform-independent: all it needs is a server with Node.js 20.12+ and a PostgreSQL database.

```bash
npm ci
npm run db:push
npm run build
NODE_ENV=production npm start
```

Run the commands from the project folder so the `.env` file is picked up, or set the variables in the environment. In production `DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` and `APP_URL` are required. Put the app behind a reverse proxy with HTTPS (e.g. Caddy or Nginx): the session cookie is `Secure` and the server trusts exactly one proxy in front of it.

### Contributing

The project is open: anyone can fork it, improve it and propose changes.

1. Fork the repository and create a branch for your change.
2. Make sure `npm run check` and `npm test` pass: GitHub CI runs them on every pull request.
3. Open a pull request explaining what changes and why.

The [known issues](#known-issues) list is a good place to start.

### License

Copyright (C) 2025-2026 Luca Versilia

Released under the **GNU Affero General Public License v3.0 or later** (AGPL-3.0-or-later). Full text in [`LICENSE`](LICENSE).

In plain words:

- you may use, study, modify and redistribute the code, including for commercial purposes;
- if you distribute a modified version, **or make it available as an online service**, you must publish the source code of your changes under the same AGPL license and keep this copyright notice;
- the software comes with no warranty.

Changes that stay on your own machine, without being distributed or put online, don't have to be published.

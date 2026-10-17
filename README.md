# Hospitality Management

**[Italiano](#italiano) · [English](#english)**

---

## Italiano

Gestionale web per piccole strutture ricettive (B&B, agriturismi, case vacanza). Include una dashboard per il proprietario, un calendario di prenotazione pubblico e un widget incorporabile in siti esterni (es. WordPress). L'interfaccia è interamente in italiano.

> **Stato: prototipo.** Vedi [Problemi noti](#problemi-noti).

### Funzionalità

- **Account** (`/signup`, `/login`): registrazione con conferma via email, recupero password (`/forgot-password`). Ogni proprietario vede e modifica solo le proprie strutture e i dati collegati.
- **Dashboard** (`/dashboard`, richiede login): gestione di strutture, camere, prenotazioni ed eventi locali, calendario e impostazioni.
- **Calendario di prenotazione** (`/dashboard/calendario`): doppio mese con selezione del periodo, eventi locali filtrabili per categoria, camere disponibili con prezzo calcolato (notti × tariffa) e modal di prenotazione.
- **Widget incorporabile** (`/widget/:propertyId`): la stessa esperienza del calendario, caricata in un iframe che si ridimensiona da solo tramite `client/public/widget.js`. Le impostazioni generano il codice di incorporamento.
- **Notifiche email**: l'ospite riceve un'email quando invia una richiesta dal widget e quando viene confermata o annullata; il proprietario riceve ogni nuova richiesta e ogni annullamento da parte dell'ospite. Rispondendo all'email si scrive direttamente all'altra parte.
- **Archivio**: strutture e camere non si cancellano ma si archiviano. Spariscono da dashboard e widget, le loro prenotazioni restano, e si ripristinano dalla sezione Archivio. Se ci sono prenotazioni future attive viene chiesta conferma.
- **Privacy degli ospiti**: il widget mostra sotto il pulsante di prenotazione il link all'informativa (`/widget/:propertyId/privacy`, art. 13 GDPR). Il titolare del trattamento è il proprietario: nome, indirizzo ed email di contatto si impostano in Impostazioni → Privacy. Nome, email, telefono e note degli ospiti vengono anonimizzati automaticamente dopo `GUEST_DATA_RETENTION_MONTHS` mesi dal check-out (default 24) e si possono cancellare a mano dalla lista prenotazioni. L'informativa è un modello: falla verificare da un consulente.
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
| `DATABASE_URL` | sì, tranne per la demo | Stringa di connessione PostgreSQL. Il TLS segue `sslmode`: con `?sslmode=require` (es. Neon) il certificato viene verificato; con un'autorità propria usa `?sslmode=verify-full&sslrootcert=/percorso/ca.crt` (es. Supabase); senza `sslmode` niente TLS, adatto solo a un database locale |
| `DATABASE_CA_CERT` | no | Contenuto PEM del certificato dell'autorità del database (es. la CA di Supabase), in alternativa a `sslrootcert` dove non ci sono file, come su Vercel. Il certificato viene verificato e `sslmode` nell'URL viene ignorato |
| `SESSION_SECRET` | sì in produzione | Chiave per firmare il cookie di sessione. In sviluppo, se manca, ne viene generata una casuale a ogni avvio |
| `RESEND_API_KEY` | sì in produzione | Chiave API di [Resend](https://resend.com) per inviare le email di conferma account, recupero password e prenotazioni. In sviluppo, se manca, il contenuto delle email viene stampato nel log del server |
| `EMAIL_FROM` | sì in produzione | Mittente delle email, es. `Hospitality Manager <noreply@tuodominio.it>` (dominio verificato su Resend) |
| `APP_URL` | sì in produzione | URL pubblico dell'app, usato per i link nelle email (es. `https://gestionale.tuodominio.it`) |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | no | Chiavi di [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) (gratuito) per la verifica anti-bot sulle prenotazioni del widget. Vanno impostate entrambe o nessuna; senza chiavi resta attivo solo il campo trappola nascosto |
| `GUEST_DATA_RETENTION_MONTHS` | no | Mesi dopo il check-out oltre i quali i dati personali degli ospiti vengono anonimizzati (default `24`). Il controllo gira all'avvio e poi una volta al giorno (su Vercel con il cron) |
| `DEMO_MODE` | no | `true` trasforma l'istanza in una demo pubblica (vedi [Modalità demo](#modalità-demo)) |
| `CRON_SECRET` | no | Abilita `GET /api/cron/daily` (anonimizzazione e pulizia della demo) per chi invia `Authorization: Bearer <CRON_SECRET>`. Serve sugli hosting senza processo sempre attivo, come Vercel |
| `PORT` | no | Porta del server (default `5000`) |
| `TEST_DATABASE_URL` | solo per `npm test` e `npm run test:e2e` | Database PostgreSQL usa e getta per i test. I test ne cancellano tutti i dati: non usare mai un database con dati veri |

### Script

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo (Express + Vite) |
| `npm run build` | Build del client e bundle del server in `dist/` |
| `npm run start` | Avvia la build di produzione |
| `npm run check` | Controllo dei tipi TypeScript |
| `npm test` | Test di integrazione su un database reale (richiede `TEST_DATABASE_URL`) |
| `npm run test:e2e` | Test end-to-end dell'interfaccia con Playwright (richiede `TEST_DATABASE_URL`; la prima volta esegui `npx playwright install chromium`) |
| `npm run db:migrate` | Applica le migrazioni in `migrations/` al database |
| `npm run db:push` | Applica lo schema al database con Drizzle Kit (sviluppo) |
| `npm run build:vercel` | Build per Vercel in `.vercel/output` (client statico, funzione `/api`, cron); applica le migrazioni se c'è `DATABASE_URL` |
| `npm run db:claim-legacy -- <email>` | Assegna all'account indicato le strutture create prima dell'autenticazione |

### Incorporare il widget

Il codice si copia già pronto da Impostazioni → Widget, una riga per ogni struttura. Va incollato nella pagina del sito dove deve comparire il calendario:

```html
<div data-booking-widget data-property-id="ID_STRUTTURA"></div>
<script src="https://TUO-DOMINIO/widget.js" async></script>
```

Funziona su qualsiasi sito, anche su un dominio diverso da quello dell'app: il widget si carica dall'indirizzo dello script e si adatta in altezza da solo. Su WordPress incollalo in un blocco "HTML personalizzato"; su Wix, Squarespace e simili nel blocco "Incorpora codice". Se lo script arriva da un indirizzo diverso da quello dell'app (es. una CDN), imposta prima `window.BOOKING_WIDGET_URL`.

### API

Tutte le rotte sono sotto `/api` e restituiscono JSON. Le rotte del widget e di autenticazione sono pubbliche; tutte le altre richiedono una sessione e operano solo sui dati del proprietario.

| Risorsa | Rotte |
|---|---|
| Autenticazione | `POST /api/auth/signup`, `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Strutture | `GET/POST /api/properties` (`?archived=true` per l'archivio), `PATCH/DELETE /api/properties/:id`, `POST /api/properties/:id/restore` |
| Camere | `GET/POST /api/rooms` (`?archived=true` per l'archivio), `PATCH/DELETE /api/rooms/:id`, `POST /api/rooms/:id/restore` |
| Prenotazioni | `GET/POST /api/bookings`, `PATCH/DELETE /api/bookings/:id`, `POST /api/bookings/:id/anonymize` |
| Eventi | `GET/POST /api/events`, `PATCH/DELETE /api/events/:id` |
| Calendario e dashboard | `GET /api/calendar`, `GET /api/dashboard/summary?today=AAAA-MM-GG` |
| Account | `GET/PUT /api/account/privacy` (dati del titolare del trattamento) |
| Widget (pubblico) | `GET /api/widget/properties/:propertyId`, `POST /api/widget/bookings`, `POST /api/widget/bookings/:id/cancel` |
| Servizio (pubblico) | `GET /api/config`, `POST /api/demo/login` (solo con `DEMO_MODE`), `GET /api/cron/daily` (solo con `CRON_SECRET`) |

Le prenotazioni dal widget nascono sempre `pending` e il prezzo totale è calcolato dal server.

`GET /api/bookings` e `GET /api/events` sono paginate: `limit` (default 25, massimo 100) e `offset`; il totale è nell'header `X-Total-Count`. Le camere non sono paginate. Calendario e widget ricevono solo i soggiorni e gli eventi non ancora conclusi; la dashboard riceve i totali già calcolati.

`DELETE` su strutture e camere archivia invece di cancellare. Se ci sono prenotazioni future non cancellate risponde `409` con `code: "HAS_UPCOMING_BOOKINGS"` e `upcomingBookings`; per archiviare comunque si ripete la richiesta con `?confirm=true`.

### Struttura del progetto

```
client/      Frontend React (pagine, componenti, widget.js)
server/      Express: auth.ts, email.ts, routes.ts, storage.ts (Drizzle), db.ts, env.ts, turnstile.ts, log-error.ts, log.ts, claim-legacy.ts, retention.ts, demo.ts, migrate.ts, app.ts, index.ts, vercel.ts
shared/      Schema Drizzle e schemi Zod condivisi
tests/       Test di integrazione (node:test) sulle API
e2e/         Test end-to-end dell'interfaccia (Playwright)
script/      Build per Vercel
migrations/  Migrazioni generate da Drizzle Kit
```

### Problemi noti

Nessun problema noto aperto. Segnala bug e proposte nelle [issue](https://github.com/Luke2986/Hospitality-Management/issues).

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
npm run db:migrate
npm run build
NODE_ENV=production npm start
```

Avvia i comandi dalla cartella del progetto, così viene letto il file `.env`; in alternativa imposta le variabili nell'ambiente. In produzione sono obbligatorie `DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` e `APP_URL`. Metti l'app dietro un reverse proxy con HTTPS (es. Caddy o Nginx): il cookie di sessione è `Secure` e il server si fida di un solo proxy davanti a sé.

#### Deploy su Vercel

Il repository contiene già la configurazione (`vercel.json` e `script/build-vercel.ts`): il client è servito come sito statico, le API girano in una funzione serverless e un cron giornaliero sostituisce il timer di anonimizzazione.

1. Su [vercel.com](https://vercel.com) → **Add New → Project**, importa il repository.
2. Per un'istanza reale serve un database PostgreSQL: nel progetto, **Storage → Create Database → Neon** (piano gratuito) e collegalo, imposta da solo `DATABASE_URL`. Va bene anche un altro provider, ad esempio Supabase con `DATABASE_CA_CERT`. Per una demo pubblica salta questo passo: senza `DATABASE_URL` la demo usa un database in memoria.
3. In **Settings → Environment Variables** aggiungi `SESSION_SECRET` e `CRON_SECRET` (genera ciascuno con `openssl rand -hex 32`) e `APP_URL` con l'indirizzo del progetto (es. `https://nome-progetto.vercel.app`). Per un'istanza reale aggiungi anche `RESEND_API_KEY` ed `EMAIL_FROM`; per una demo pubblica, `DEMO_MODE=true` al loro posto.
4. **Deploy**. Con un database, le migrazioni vengono applicate durante il build.

### Modalità demo

Con `DEMO_MODE=true` l'istanza diventa una demo da far provare a chiunque:

- la pagina di accesso mostra solo **Prova la demo**: ogni clic crea un account nuovo con due strutture di esempio (un B&B a Siena e un agriturismo in Val d'Orcia), sei camere, circa 130 prenotazioni distribuite su cinque mesi ed eventi locali inventati;
- ogni visitatore ha i propri dati, quindi può modificare, archiviare e prenotare senza disturbare gli altri; gli account demo vengono cancellati dopo 24 ore dal cron giornaliero (`CRON_SECRET`);
- registrazione e recupero password sono disattivati e nessuna email viene mai inviata, nemmeno dal widget;
- in Impostazioni → Widget, **Prova in un sito di esempio** apre `/sito-esempio.html`, un sito inventato che incorpora il widget con lo snippet di due righe;
- senza `DATABASE_URL` non serve nessun database: i dati stanno in memoria ([PGlite](https://pglite.dev)) e la sessione in un cookie firmato. Su Vercel ogni istanza della funzione ha la sua memoria: se una richiesta arriva su un'istanza nuova, l'account del visitatore viene ricreato con gli stessi dati di partenza, quindi le modifiche fatte possono sparire. Va bene per una vetrina; per conservare le modifiche imposta `DATABASE_URL`.

### Contribuire

Il progetto è aperto: chiunque può fare fork, migliorarlo e proporre modifiche.

1. Fai fork del repository e crea un branch per la tua modifica.
2. Verifica che `npm run check`, `npm test` e `npm run test:e2e` passino: la CI di GitHub li esegue su ogni pull request.
3. Apri una pull request spiegando cosa cambia e perché.

Le [issue aperte](https://github.com/Luke2986/Hospitality-Management/issues) sono un buon punto di partenza.

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

> **Status: prototype.** See [Known issues](#known-issues).

### Features

- **Accounts** (`/signup`, `/login`): sign-up with email confirmation, password reset (`/forgot-password`). Each owner can only see and edit their own properties and related data.
- **Dashboard** (`/dashboard`, login required): manage properties, rooms, bookings and local events, plus calendar and settings.
- **Booking calendar** (`/dashboard/calendario`): dual-month date-range picker, local events filterable by category, available rooms with computed price (nights × rate), and a booking modal.
- **Embeddable widget** (`/widget/:propertyId`): the same calendar experience loaded in an iframe that auto-resizes through `client/public/widget.js`. The settings page generates the embed code.
- **Email notifications**: guests get an email when they send a request from the widget and when it is confirmed or cancelled; owners get every new request and every guest cancellation. Replying to an email writes directly to the other party.
- **Archive**: properties and rooms are archived instead of deleted. They disappear from the dashboard and widget, their bookings are kept, and they can be restored from the Archive section. Archiving asks for confirmation when there are upcoming active bookings.
- **Guest privacy**: the widget shows a link to the privacy notice under the booking button (`/widget/:propertyId/privacy`, GDPR art. 13). The owner is the data controller: name, address and contact email are set in Impostazioni → Privacy. Guests' name, email, phone and notes are anonymized automatically `GUEST_DATA_RETENTION_MONTHS` months after check-out (default 24) and can be erased by hand from the bookings list. The notice is a template: have it checked by a consultant.
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
| `DATABASE_URL` | yes, except for the demo | PostgreSQL connection string. TLS follows `sslmode`: with `?sslmode=require` (e.g. Neon) the certificate is verified; for a private CA use `?sslmode=verify-full&sslrootcert=/path/ca.crt` (e.g. Supabase); without `sslmode` there is no TLS, which is only fine for a local database |
| `DATABASE_CA_CERT` | no | PEM contents of the database's certificate authority (e.g. Supabase's CA), instead of `sslrootcert` where there are no files, as on Vercel. The certificate is verified and `sslmode` in the URL is ignored |
| `SESSION_SECRET` | yes in production | Key used to sign the session cookie. In development a random one is generated on each start if missing |
| `RESEND_API_KEY` | yes in production | [Resend](https://resend.com) API key used to send account confirmation, password reset and booking emails. In development, if missing, email contents are printed to the server log |
| `EMAIL_FROM` | yes in production | Email sender, e.g. `Hospitality Manager <noreply@yourdomain.com>` (domain verified on Resend) |
| `APP_URL` | yes in production | Public URL of the app, used for links in emails (e.g. `https://app.yourdomain.com`) |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | no | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) keys (free) for bot protection on widget bookings. Set both or neither; without them only the hidden honeypot field is active |
| `GUEST_DATA_RETENTION_MONTHS` | no | Months after check-out after which guests' personal data is anonymized (default `24`). The check runs at startup and then once a day (on Vercel via the cron) |
| `DEMO_MODE` | no | `true` turns the instance into a public demo (see [Demo mode](#demo-mode)) |
| `CRON_SECRET` | no | Enables `GET /api/cron/daily` (anonymization and demo cleanup) for requests sending `Authorization: Bearer <CRON_SECRET>`. Needed on hosts without a long-running process, such as Vercel |
| `PORT` | no | Server port (default `5000`) |
| `TEST_DATABASE_URL` | only for `npm test` and `npm run test:e2e` | Disposable PostgreSQL database for the tests. The tests wipe all its data: never point it at real data |

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server (Express + Vite) |
| `npm run build` | Build the client and bundle the server into `dist/` |
| `npm run start` | Run the production build |
| `npm run check` | TypeScript type check |
| `npm test` | Integration tests against a real database (needs `TEST_DATABASE_URL`) |
| `npm run test:e2e` | End-to-end UI tests with Playwright (needs `TEST_DATABASE_URL`; the first time run `npx playwright install chromium`) |
| `npm run db:migrate` | Apply the migrations in `migrations/` to the database |
| `npm run db:push` | Push the schema to the database with Drizzle Kit (development) |
| `npm run build:vercel` | Vercel build into `.vercel/output` (static client, `/api` function, cron); applies migrations when `DATABASE_URL` is set |
| `npm run db:claim-legacy -- <email>` | Assign properties created before authentication to the given account |

### Embedding the widget

Copy the ready-made code from Impostazioni → Widget (one snippet per property) and paste it where the calendar should appear:

```html
<div data-booking-widget data-property-id="PROPERTY_ID"></div>
<script src="https://YOUR-DOMAIN/widget.js" async></script>
```

It works on any site, including a different domain from the app: the widget loads from the script's address and resizes itself. On WordPress paste it into a "Custom HTML" block; on Wix, Squarespace and similar into the "Embed code" block. If the script is served from somewhere other than the app (e.g. a CDN), set `window.BOOKING_WIDGET_URL` first.

### API

All routes live under `/api` and return JSON. Widget and auth routes are public; every other route requires a session and only touches the owner's data.

| Resource | Routes |
|---|---|
| Auth | `POST /api/auth/signup`, `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Properties | `GET/POST /api/properties` (`?archived=true` for the archive), `PATCH/DELETE /api/properties/:id`, `POST /api/properties/:id/restore` |
| Rooms | `GET/POST /api/rooms` (`?archived=true` for the archive), `PATCH/DELETE /api/rooms/:id`, `POST /api/rooms/:id/restore` |
| Bookings | `GET/POST /api/bookings`, `PATCH/DELETE /api/bookings/:id`, `POST /api/bookings/:id/anonymize` |
| Events | `GET/POST /api/events`, `PATCH/DELETE /api/events/:id` |
| Calendar and dashboard | `GET /api/calendar`, `GET /api/dashboard/summary?today=YYYY-MM-DD` |
| Account | `GET/PUT /api/account/privacy` (data controller details) |
| Widget (public) | `GET /api/widget/properties/:propertyId`, `POST /api/widget/bookings`, `POST /api/widget/bookings/:id/cancel` |
| Service (public) | `GET /api/config`, `POST /api/demo/login` (only with `DEMO_MODE`), `GET /api/cron/daily` (only with `CRON_SECRET`) |

Widget bookings are always created as `pending`, and the total price is computed server-side.

`GET /api/bookings` and `GET /api/events` are paginated: `limit` (default 25, max 100) and `offset`; the total is in the `X-Total-Count` header. Rooms are not paginated. The calendar and widget only receive stays and events that haven't ended yet; the dashboard receives precomputed totals.

`DELETE` on properties and rooms archives instead of deleting. With upcoming non-cancelled bookings it returns `409` with `code: "HAS_UPCOMING_BOOKINGS"` and `upcomingBookings`; repeat the request with `?confirm=true` to archive anyway.

### Project structure

```
client/      React frontend (pages, components, widget.js)
server/      Express: auth.ts, email.ts, routes.ts, storage.ts (Drizzle), db.ts, env.ts, turnstile.ts, log-error.ts, log.ts, claim-legacy.ts, retention.ts, demo.ts, migrate.ts, app.ts, index.ts, vercel.ts
shared/      Drizzle schema and shared Zod schemas
tests/       API integration tests (node:test)
e2e/         End-to-end UI tests (Playwright)
script/      Vercel build
migrations/  Migrations generated by Drizzle Kit
```

### Known issues

No open known issues. Report bugs and ideas in the [issues](https://github.com/Luke2986/Hospitality-Management/issues).

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
npm run db:migrate
npm run build
NODE_ENV=production npm start
```

Run the commands from the project folder so the `.env` file is picked up, or set the variables in the environment. In production `DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` and `APP_URL` are required. Put the app behind a reverse proxy with HTTPS (e.g. Caddy or Nginx): the session cookie is `Secure` and the server trusts exactly one proxy in front of it.

#### Deploying to Vercel

The repository already contains the configuration (`vercel.json` and `script/build-vercel.ts`): the client is served as a static site, the API runs in a serverless function, and a daily cron replaces the anonymization timer.

1. On [vercel.com](https://vercel.com) → **Add New → Project**, import the repository.
2. A real instance needs a PostgreSQL database: in the project, **Storage → Create Database → Neon** (free plan) and connect it, it sets `DATABASE_URL` for you. Another provider works too, for example Supabase with `DATABASE_CA_CERT`. For a public demo skip this step: without `DATABASE_URL` the demo uses an in-memory database.
3. In **Settings → Environment Variables** add `SESSION_SECRET` and `CRON_SECRET` (generate each with `openssl rand -hex 32`) and `APP_URL` with the project address (e.g. `https://project-name.vercel.app`). For a real instance also add `RESEND_API_KEY` and `EMAIL_FROM`; for a public demo, `DEMO_MODE=true` instead.
4. **Deploy**. With a database, migrations run during the build.

### Demo mode

With `DEMO_MODE=true` the instance becomes a demo anyone can try:

- the login page only shows **Prova la demo**: each click creates a fresh account with two sample properties (a B&B in Siena and a farm stay in Val d'Orcia), six rooms, about 130 bookings over five months, and made-up local events;
- every visitor gets their own data, so they can edit, archive and book without affecting others; demo accounts are deleted after 24 hours by the daily cron (`CRON_SECRET`);
- sign-up and password reset are disabled and no email is ever sent, not even from the widget;
- in Impostazioni → Widget, **Prova in un sito di esempio** opens `/sito-esempio.html`, a made-up website embedding the widget with the two-line snippet;
- without `DATABASE_URL` no database is needed: data lives in memory ([PGlite](https://pglite.dev)) and the session in a signed cookie. On Vercel each function instance has its own memory: when a request reaches a new instance, the visitor's account is rebuilt with the same starting data, so their changes may disappear. Fine for a showcase; set `DATABASE_URL` to keep changes.

### Contributing

The project is open: anyone can fork it, improve it and propose changes.

1. Fork the repository and create a branch for your change.
2. Make sure `npm run check`, `npm test` and `npm run test:e2e` pass: GitHub CI runs them on every pull request.
3. Open a pull request explaining what changes and why.

The [open issues](https://github.com/Luke2986/Hospitality-Management/issues) are a good place to start.

### License

Copyright (C) 2025-2026 Luca Versilia

Released under the **GNU Affero General Public License v3.0 or later** (AGPL-3.0-or-later). Full text in [`LICENSE`](LICENSE).

In plain words:

- you may use, study, modify and redistribute the code, including for commercial purposes;
- if you distribute a modified version, **or make it available as an online service**, you must publish the source code of your changes under the same AGPL license and keep this copyright notice;
- the software comes with no warranty.

Changes that stay on your own machine, without being distributed or put online, don't have to be published.

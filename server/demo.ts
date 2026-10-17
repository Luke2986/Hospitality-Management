import { createHash, randomUUID } from "crypto";
import { and, like, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { bookings, events, properties, rooms, users, type User } from "@shared/schema";

export const DEMO_EMAIL_DOMAIN = "hospitality-demo.example";
export const DEMO_ACCOUNT_TTL_HOURS = 24;

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

// Deterministic pseudo-random numbers, so every demo account gets the same believable data.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDay(base: Date, offsetDays: number) {
  const d = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays));
  return d.toISOString().slice(0, 10);
}

const PROPERTIES = [
  {
    name: "B&B Il Glicine",
    city: "Siena",
    address: "Via dei Rossi 18, 53100 Siena",
    description:
      "Cinque minuti a piedi da Piazza del Campo, in un palazzo del Settecento con cortile interno e colazione fatta in casa.",
    rooms: [
      { name: "Camera Torre", maxGuests: 2, price: 95, description: "Matrimoniale con vista sui tetti e sulla Torre del Mangia." },
      { name: "Camera Giardino", maxGuests: 2, price: 85, description: "Al piano terra, si affaccia sul cortile con il glicine." },
      { name: "Suite del Campo", maxGuests: 4, price: 150, description: "Due ambienti, divano letto e piccola cucina." },
    ],
  },
  {
    name: "Agriturismo Poggio ai Lecci",
    city: "San Quirico d'Orcia",
    address: "Strada di Ripa d'Orcia 4, 53027 San Quirico d'Orcia",
    description: "Casale in pietra tra i cipressi della Val d'Orcia, con piscina, orto e olio di produzione propria.",
    rooms: [
      { name: "Il Fienile", maxGuests: 4, price: 140, description: "Appartamento su due livelli con camino." },
      { name: "La Cantina", maxGuests: 2, price: 110, description: "Volte in mattoni e accesso diretto al giardino." },
      { name: "Le Querce", maxGuests: 3, price: 120, description: "Tripla con terrazzo sulle colline." },
    ],
  },
];

const GUESTS = [
  "Marco Bianchi", "Giulia Romano", "Francesca Colombo", "Alessandro Ricci", "Chiara Marino", "Luca Greco",
  "Sara Bruno", "Davide Gallo", "Elena Conti", "Matteo De Luca", "Anna Costa", "Paolo Fontana",
  "Sophie Martin", "Lukas Schneider", "Emma Johnson", "Pieter de Vries", "Camille Dubois", "Oliver Smith",
  "Hannah Weber", "Lucía García", "Noah Brown", "Ingrid Larsen", "Tomás Novák", "Claire Moreau",
];

const NOTES = [
  "Arriviamo in tarda serata, verso le 22.",
  "Viaggiamo con un cane di piccola taglia.",
  "Serve un lettino da campeggio per la bambina.",
  "È il nostro anniversario.",
  "Possiamo lasciare i bagagli prima del check-in?",
  "Arriviamo in treno: c'è un parcheggio bici?",
];

const EVENTS: Array<{ property: number; offset: number; days?: number; title: string; category: string; location: string; description: string }> = [
  { property: 0, offset: -12, title: "Mercato contadino di Piazza del Mercato", category: "mercato", location: "Piazza del Mercato, Siena", description: "Formaggi, salumi e verdure dei produttori della provincia." },
  { property: 0, offset: 4, title: "Concerto d'organo nella Basilica dei Servi", category: "concerto", location: "Basilica di San Clemente in Santa Maria dei Servi", description: "Musiche di Bach e Frescobaldi, ingresso libero." },
  { property: 0, offset: 9, days: 2, title: "Fiera dell'antiquariato", category: "fiera", location: "Piazza del Mercato, Siena", description: "Mobili, stampe e oggetti d'epoca da tutta la Toscana." },
  { property: 0, offset: 16, title: "Visita guidata ai bottini medievali", category: "cultura", location: "Fonte Gaia, Siena", description: "Percorso nei cunicoli che portavano l'acqua in città." },
  { property: 0, offset: 23, title: "Mercato contadino di Piazza del Mercato", category: "mercato", location: "Piazza del Mercato, Siena", description: "Formaggi, salumi e verdure dei produttori della provincia." },
  { property: 0, offset: 30, title: "Corsa podistica delle Contrade", category: "sport", location: "Piazza del Campo, Siena", description: "10 km tra le vie del centro storico." },
  { property: 0, offset: 37, title: "Festa della Contrada del Bruco", category: "altro", location: "Via del Comune, Siena", description: "Cena in strada e musica fino a tarda sera." },
  { property: 0, offset: 44, days: 3, title: "Rassegna di cinema all'aperto", category: "cultura", location: "Fortezza Medicea, Siena", description: "Tre serate di film restaurati sotto le stelle." },
  { property: 0, offset: 52, title: "Processione della Madonna di Provenzano", category: "religioso", location: "Collegiata di Provenzano, Siena", description: "Processione serale con le confraternite cittadine." },
  { property: 0, offset: 58, title: "Mercato contadino di Piazza del Mercato", category: "mercato", location: "Piazza del Mercato, Siena", description: "Formaggi, salumi e verdure dei produttori della provincia." },
  { property: 0, offset: 66, title: "Concerto jazz in Piazza Jacopo della Quercia", category: "concerto", location: "Piazza Jacopo della Quercia, Siena", description: "Quartetto dal vivo al tramonto." },
  { property: 0, offset: 79, days: 2, title: "Mostra mercato del panforte", category: "fiera", location: "Logge del Papa, Siena", description: "Pasticcerie senesi a confronto, con degustazioni." },
  { property: 1, offset: -5, title: "Sagra della ribollita", category: "sagra", location: "Campo sportivo, San Quirico d'Orcia", description: "Cucina delle massaie del paese e ballo liscio." },
  { property: 1, offset: 6, days: 2, title: "Sagra dei pici all'aglione", category: "sagra", location: "Piazza Chigi, San Quirico d'Orcia", description: "Pici tirati a mano e vino della Val d'Orcia." },
  { property: 1, offset: 13, title: "Camminata tra i cipressi", category: "sport", location: "Partenza da Bagno Vignoni", description: "Anello di 12 km tra le crete, adatto a tutti." },
  { property: 1, offset: 20, title: "Mercato settimanale", category: "mercato", location: "Via Dante Alighieri, San Quirico d'Orcia", description: "Banchi di alimentari, abbigliamento e artigianato." },
  { property: 1, offset: 27, title: "Concerto al tramonto negli Horti Leonini", category: "concerto", location: "Horti Leonini, San Quirico d'Orcia", description: "Archi e chitarra classica nel giardino rinascimentale." },
  { property: 1, offset: 34, days: 2, title: "Festa dell'olio nuovo", category: "sagra", location: "Frantoio sociale, Pienza", description: "Bruschette con l'olio appena franto e visite al frantoio." },
  { property: 1, offset: 41, title: "Mostra mercato del pecorino", category: "fiera", location: "Piazza Pio II, Pienza", description: "Caseifici della valle con assaggi e premiazioni." },
  { property: 1, offset: 48, title: "Messa e benedizione dei trattori", category: "religioso", location: "Pieve di Corsignano, Pienza", description: "Tradizione contadina con sfilata dei mezzi agricoli." },
  { property: 1, offset: 55, title: "Mercato settimanale", category: "mercato", location: "Via Dante Alighieri, San Quirico d'Orcia", description: "Banchi di alimentari, abbigliamento e artigianato." },
  { property: 1, offset: 63, title: "Degustazione di Brunello in cantina", category: "altro", location: "Montalcino", description: "Visita guidata e assaggio di tre annate." },
  { property: 1, offset: 72, title: "Laboratorio di ceramica per famiglie", category: "cultura", location: "Biblioteca comunale, San Quirico d'Orcia", description: "Due ore di tornio e decorazione per grandi e piccoli." },
  { property: 1, offset: 86, days: 3, title: "Festa del Barbarossa", category: "altro", location: "Centro storico, San Quirico d'Orcia", description: "Corteo storico, tiro con l'arco e banchetti medievali." },
];

// UUID derived from the owner's id: rebuilding an account produces the same ids, so links and sessions keep working.
function stableId(ownerId: string, key: string) {
  const h = createHash("sha256").update(`hospitality-demo:${ownerId}:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// Creates an isolated demo owner with two properties, six rooms, bookings and local events around `today`.
export async function createDemoAccount(today = new Date(), ownerId: string = randomUUID()): Promise<User> {
  const random = mulberry32(20261017);
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];

  return db.transaction(async (tx) => {
    const [owner] = await tx
      .insert(users)
      .values({
        id: ownerId,
        email: `demo-${ownerId.replace(/-/g, "").slice(0, 16)}@${DEMO_EMAIL_DOMAIN}`,
        fullName: "Giulia Ferri",
        emailVerifiedAt: new Date(),
        privacyControllerName: "Giulia Ferri, titolare del B&B Il Glicine",
        privacyControllerAddress: "Via dei Rossi 18, 53100 Siena",
        privacyContactEmail: "privacy@ilglicine.example",
      })
      .returning();

    const createdProperties = await tx
      .insert(properties)
      .values(
        PROPERTIES.map((p, i) => ({
          id: stableId(ownerId, `property:${i}`),
          ownerId: owner.id,
          name: p.name,
          city: p.city,
          address: p.address,
          description: p.description,
          roomsCount: p.rooms.length,
        })),
      )
      .returning();

    const roomValues = PROPERTIES.flatMap((p, i) =>
      p.rooms.map((r, j) => ({
        id: stableId(ownerId, `room:${i}:${j}`),
        propertyId: createdProperties[i].id,
        name: r.name,
        description: r.description,
        maxGuests: r.maxGuests,
        pricePerNight: r.price.toFixed(2),
      })),
    );
    const createdRooms = await tx.insert(rooms).values(roomValues).returning();

    // Guests book days to weeks ahead; requests still pending arrived in the last few days.
    const HOUR_MS = 60 * 60 * 1000;
    const bookedAt = (checkInOffset: number, status: string) => {
      const now = Date.now();
      if (status === "pending") return new Date(now - (1 + random() * 71) * HOUR_MS);
      const daysAgo = Math.max(-checkInOffset, 0) + 2 + random() * 43;
      return new Date(now - daysAgo * 24 * HOUR_MS);
    };
    const bookingValues: (typeof bookings.$inferInsert)[] = [];
    for (const room of createdRooms) {
      let day = -60 + Math.floor(random() * 5);
      while (day < 90) {
        const nights = 1 + Math.floor(random() * 5);
        const guestName = pick(GUESTS);
        const roll = random();
        let status = "confirmed";
        if (day > 3 && roll < 0.08) status = "pending";
        else if (roll > 0.9) status = "cancelled";
        bookingValues.push({
          id: stableId(ownerId, `booking:${bookingValues.length}`),
          roomId: room.id,
          propertyId: room.propertyId,
          guestName,
          guestEmail: `${guestName.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").replace(/ /g, ".")}@example.com`,
          guestPhone: random() < 0.6 ? `+39 3${Math.floor(10 + random() * 89)} ${Math.floor(1000000 + random() * 8999999)}` : null,
          checkIn: isoDay(today, day),
          checkOut: isoDay(today, day + nights),
          guestsCount: 1 + Math.floor(random() * room.maxGuests),
          totalPrice: (Number(room.pricePerNight) * nights).toFixed(2),
          status,
          notes: random() < 0.25 ? pick(NOTES) : null,
          createdAt: bookedAt(day, status),
        });
        day += nights + Math.floor(random() * 9);
      }
    }
    await tx.insert(bookings).values(bookingValues);

    await tx.insert(events).values(
      EVENTS.map((e, i) => ({
        id: stableId(ownerId, `event:${i}`),
        propertyId: createdProperties[e.property].id,
        title: e.title,
        description: e.description,
        eventDate: isoDay(today, e.offset),
        endDate: e.days ? isoDay(today, e.offset + e.days - 1) : null,
        location: e.location,
        category: e.category,
      })),
    );

    return owner;
  });
}

const rebuilding = new Map<string, Promise<User>>();

// With the in-memory database each serverless instance starts empty: a visitor whose request lands on a new
// instance gets their demo account rebuilt there, with the same ids. Only called for ids from a signed session.
export function rebuildDemoAccount(ownerId: string): Promise<User> {
  let pending = rebuilding.get(ownerId);
  if (!pending) {
    pending = createDemoAccount(new Date(), ownerId).finally(() => rebuilding.delete(ownerId));
    rebuilding.set(ownerId, pending);
  }
  return pending;
}

// Each visitor gets a throwaway account; this removes the ones older than a day, with all their data.
export async function removeExpiredDemoAccounts(): Promise<number> {
  // created_at has no time zone, so compare against the database clock rather than a JavaScript Date.
  const removed = await db
    .delete(users)
    .where(
      and(
        like(users.email, `demo-%@${DEMO_EMAIL_DOMAIN}`),
        lt(users.createdAt, sql`now() - make_interval(hours => ${DEMO_ACCOUNT_TTL_HOURS})`),
      ),
    )
    .returning({ id: users.id });
  return removed.length;
}


import { Property, Room, Event, Car } from './types';

export const MOCK_PROPERTY: Property = {
  id: 'p1',
  owner_id: 'u1',
  name: 'Villa I Tramonti',
  description: 'Una splendida villa immersa nelle colline toscane, perfetta per relax e scoperta del territorio. Goditi tramonti mozzafiato e la cucina locale.',
  city: 'Siena',
  country: 'Italia',
  address: 'Via delle Vigne 42',
  phone: '+39 0577 123456',
  email: 'info@villaitramonti.it',
  rooms_count: 3,
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const MOCK_ROOMS: Room[] = [
  {
    id: 'r1',
    property_id: 'p1',
    name: 'Suite Panoramica',
    description: 'Ampia suite con vista a 180 gradi sulle colline. Letto king size e vasca idromassaggio.',
    max_guests: 2,
    price_per_night: 180,
    is_available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1590490360182-283632329b10?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'r2',
    property_id: 'p1',
    name: 'Camera Giardino',
    description: 'Accogliente camera doppia con accesso diretto al giardino privato e patio.',
    max_guests: 2,
    price_per_night: 120,
    is_available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1616594039964-40891a90963d?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'r3',
    property_id: 'p1',
    name: 'Appartamento Family',
    description: 'Spazioso appartamento con cucina e due camere da letto, ideale per famiglie.',
    max_guests: 4,
    price_per_night: 240,
    is_available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'
  }
];

const today = new Date();
const currentYear = today.getFullYear();

export const MOCK_EVENTS: Event[] = [
  {
    id: 'e1',
    property_id: 'p1',
    title: 'Sagra del Tartufo',
    description: 'Un\'esperienza culinaria unica dove potrai degustare il pregiato tartufo bianco delle Crete Senesi, accompagnato da vini locali, stand gastronomici tradizionali e intrattenimento musicale dal vivo per le vie del borgo.',
    event_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5).toISOString(),
    location: 'San Giovanni d\'Asso',
    category: 'sagra',
    is_automatic: true,
    is_recurring: true,
    status: 'confirmed',
    confidence: 'confirmed',
    source_url: 'https://example.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e2',
    property_id: 'p1',
    title: 'Jazz in Piazza',
    description: 'Una serata magica sotto le stelle con i migliori artisti della scena jazz internazionale. L\'evento include un aperitivo di benvenuto e posti a sedere riservati nella storica piazza centrale.',
    event_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12).toISOString(),
    location: 'Piazza Maggiore',
    category: 'concerto',
    is_automatic: false,
    is_recurring: false,
    status: 'confirmed',
    confidence: 'confirmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e3',
    property_id: 'p1',
    title: 'Mercato dell\'Antiquariato',
    description: 'Ogni terza domenica del mese, il centro storico si riempie di tesori nascosti. Esplora tra centinaia di bancarelle piene di mobili antichi, stampe d\'epoca, porcellane, gioielli vintage e oggetti da collezione unici.',
    event_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 18).toISOString(),
    location: 'Centro Storico',
    category: 'mercato',
    is_automatic: true,
    is_recurring: true,
    status: 'confirmed',
    confidence: 'likely',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Eventi Dicembre - Val d'Orcia
  {
    id: 'e-dec-1',
    property_id: 'p1',
    title: 'Villaggio di Natale',
    description: 'Immergiti nella magica atmosfera natalizia con oltre 80 casette di legno che offrono artigianato locale e specialità gastronomiche. Non mancano la pista di pattinaggio su ghiaccio e la casa di Babbo Natale per i più piccoli.',
    event_date: new Date(currentYear, 11, 8).toISOString(), // 8 Dicembre
    location: 'Montepulciano',
    category: 'mercato',
    is_automatic: false,
    is_recurring: true,
    status: 'confirmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e-dec-2',
    property_id: 'p1',
    title: 'Concerto Gospel',
    description: 'Lasciati emozionare dalle voci potenti del coro Gospel di Harlem in un concerto che unisce spiritualità e ritmo sfrenato nella splendida cornice acustica della Cattedrale.',
    event_date: new Date(currentYear, 11, 15).toISOString(), // 15 Dicembre
    location: 'Pienza',
    category: 'concerto',
    is_automatic: false,
    is_recurring: false,
    status: 'confirmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e-dec-3',
    property_id: 'p1',
    title: 'Fiaccole di Natale',
    description: 'Una tradizione millenaria unica al mondo: enormi cataste di legna a forma piramidale vengono accese al suono delle campane, illuminando la notte della Vigilia con un calore magico che riscalda l\'intera città.',
    event_date: new Date(currentYear, 11, 24).toISOString(), // 24 Dicembre
    location: 'Abbadia San Salvatore',
    category: 'cultura',
    is_automatic: false,
    is_recurring: true,
    status: 'confirmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e-dec-4',
    property_id: 'p1',
    title: 'Messa di Mezzanotte',
    description: 'Vivi la solennità del Natale partecipando alla messa cantata in gregoriano dai monaci, in un\'atmosfera di assoluta pace, spiritualità e architettura romanica suggestiva.',
    event_date: new Date(currentYear, 11, 24).toISOString(), // 24 Dicembre (Overlap)
    location: 'Montalcino',
    category: 'religioso',
    is_automatic: false,
    is_recurring: true,
    status: 'confirmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e-dec-5',
    property_id: 'p1',
    title: 'Trekking d\'Inverno',
    description: 'Un percorso panoramico guidato di 10km adatto a tutti, che attraversa i vigneti dormienti e offre viste spettacolari sulla Val d\'Orcia patrimonio UNESCO, concluso con una degustazione di Brunello.',
    event_date: new Date(currentYear, 11, 27).toISOString(), // 27 Dicembre
    location: 'San Quirico d\'Orcia',
    category: 'sport',
    is_automatic: false,
    is_recurring: false,
    status: 'confirmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e-dec-6',
    property_id: 'p1',
    title: 'Festa di Fine Anno',
    description: 'Divertimento assicurato nella piazza principale con DJ set, stand gastronomici aperti tutta la notte e lo spettacolare show pirotecnico che si riflette nella vasca termale monumentale.',
    event_date: new Date(currentYear, 11, 31).toISOString(), // 31 Dicembre
    location: 'Bagno Vignoni',
    category: 'fiera',
    is_automatic: false,
    is_recurring: true,
    status: 'confirmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e-dec-7',
    property_id: 'p1',
    title: 'Cenone in Villa',
    description: 'Esclusivo cenone di San Silvestro riservato agli ospiti: menu degustazione di 7 portate creato dal nostro Chef stellato, abbinamento vini della cantina privata e brindisi di mezzanotte sulla terrazza panoramica.',
    event_date: new Date(currentYear, 11, 31).toISOString(), // 31 Dicembre (Overlap)
    location: 'Villa I Tramonti',
    category: 'sagra',
    is_automatic: false,
    is_recurring: false,
    status: 'confirmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  // Eventi di Gennaio
  {
    id: 'e-jan-1',
    property_id: 'p1',
    title: 'Concerto di Capodanno',
    description: 'Il tradizionale concerto di musica classica per inaugurare il nuovo anno. L\'Orchestra Sinfonica esegue valzer viennesi e brani d\'opera famosi per un inizio all\'insegna della bellezza.',
    event_date: new Date(currentYear + 1, 0, 1).toISOString(), // 1 Gennaio (Next Year)
    location: 'Teatro dei Rinnovati',
    category: 'concerto',
    is_automatic: false,
    is_recurring: true,
    status: 'confirmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e-jan-2',
    property_id: 'p1',
    title: 'Epifania in Piazza',
    description: 'Una grande festa per le famiglie dove la Befana scende acrobaticamente dalla torre del palazzo comunale per distribuire calze piene di dolci artigianali a tutti i bambini presenti.',
    event_date: new Date(currentYear + 1, 0, 6).toISOString(), // 6 Gennaio (Next Year)
    location: 'Piazza del Campo',
    category: 'fiera',
    is_automatic: false,
    is_recurring: true,
    status: 'confirmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e-jan-3',
    property_id: 'p1',
    title: 'Mostra Invernale d\'Arte',
    description: 'Una retrospettiva esclusiva dedicata ai maestri del paesaggio toscano del Novecento, con opere inedite provenienti da collezioni private, ospitata nelle sale affrescate del museo.',
    event_date: new Date(currentYear + 1, 0, 15).toISOString(), // 15 Gennaio (Next Year)
    location: 'Santa Maria della Scala',
    category: 'cultura',
    is_automatic: false,
    is_recurring: false,
    status: 'confirmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'e-jan-4',
    property_id: 'p1',
    title: 'Sagra delle Frittelle',
    description: 'Un appuntamento goloso imperdibile: assapora le famose frittelle di riso di San Giuseppe, preparate al momento in piazza secondo la ricetta segreta tramandata da generazioni.',
    event_date: new Date(currentYear + 1, 0, 28).toISOString(), // 28 Gennaio (Next Year)
    location: 'Piazza del Campo',
    category: 'sagra',
    is_automatic: false,
    is_recurring: true,
    status: 'confirmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const BRANDS = ['BMW', 'Audi', 'Mercedes', 'Fiat', 'Jeep', 'Volkswagen', 'Ford', 'Toyota'];

export const MOCK_CARS: Car[] = [
  {
    id: 'c1',
    brand: 'BMW',
    model: 'Serie 3',
    version: '320d Touring Msport',
    year: 2021,
    km: 45000,
    fuelType: 'Diesel',
    transmission: 'Automatico',
    price: 32500,
    financingMonthlyRate: 450,
    mainImage: 'https://images.unsplash.com/photo-1555215695-3004980adade?auto=format&fit=crop&w=800&q=80',
    dealer: {
      city: 'Milano',
      isCertified: true
    }
  },
  {
    id: 'c2',
    brand: 'Audi',
    model: 'Q3',
    version: '35 TDI S tronic',
    year: 2022,
    km: 25000,
    fuelType: 'Diesel',
    transmission: 'Automatico',
    price: 38900,
    financingMonthlyRate: 520,
    mainImage: 'https://images.unsplash.com/photo-1541348263662-e068662d82af?auto=format&fit=crop&w=800&q=80',
    dealer: {
      city: 'Roma',
      isCertified: true
    }
  },
  {
    id: 'c3',
    brand: 'Fiat',
    model: '500',
    version: '1.0 Hybrid Dolcevita',
    year: 2023,
    km: 5000,
    fuelType: 'Ibrida',
    transmission: 'Manuale',
    price: 15900,
    financingMonthlyRate: 180,
    mainImage: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80',
    dealer: {
      city: 'Torino',
      isCertified: false
    }
  },
  {
    id: 'c4',
    brand: 'Jeep',
    model: 'Renegade',
    version: '1.6 M-Jet Limited',
    year: 2020,
    km: 65000,
    fuelType: 'Diesel',
    transmission: 'Manuale',
    price: 21500,
    financingMonthlyRate: 290,
    mainImage: 'https://images.unsplash.com/photo-1620454917041-62346652e6c9?auto=format&fit=crop&w=800&q=80',
    dealer: {
      city: 'Napoli',
      isCertified: true
    }
  }
];

import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import type { Property } from "@shared/schema";

export type PrivacyInfo = {
  controllerName: string;
  controllerAddress: string | null;
  contactEmail: string | null;
  retentionMonths: number;
  botProtection: boolean;
};

export default function PrivacyNoticePage() {
  const { propertyId } = useParams();
  const { data, isLoading, isError } = useQuery<{ property: Property; privacy: PrivacyInfo }>({
    queryKey: ["/api/widget/properties", propertyId],
    queryFn: async () => {
      const response = await fetch(`/api/widget/properties/${propertyId}`);
      if (!response.ok) throw new Error("Failed to load property");
      return response.json();
    },
  });

  if (isLoading) return null;
  if (isError || !data) {
    return <p className="p-8 text-center text-muted-foreground">Struttura non trovata.</p>;
  }

  const { property, privacy } = data;
  const contact = privacy.contactEmail ? (
    <a href={`mailto:${privacy.contactEmail}`} className="underline">
      {privacy.contactEmail}
    </a>
  ) : (
    "i recapiti della struttura"
  );

  return (
    <main className="min-h-screen bg-background">
      <article className="mx-auto max-w-2xl px-4 py-10 space-y-6 text-sm leading-relaxed text-foreground" data-testid="privacy-notice">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Informativa privacy per gli ospiti</h1>
          <p className="text-muted-foreground">{property.name} · ai sensi dell'art. 13 del Regolamento UE 2016/679 (GDPR)</p>
        </header>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Titolare del trattamento</h2>
          <p>
            {privacy.controllerName}
            {privacy.controllerAddress && <>, {privacy.controllerAddress}</>}. Per qualsiasi richiesta sui tuoi dati
            puoi scrivere a {contact}.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Quali dati raccogliamo</h2>
          <p>
            Nome, email, telefono (facoltativo), eventuali note, date del soggiorno e numero di ospiti che inserisci nel
            modulo di prenotazione. Per proteggere il servizio da abusi registriamo anche l'indirizzo IP della richiesta
            {privacy.botProtection && " e usiamo una verifica anti-bot di Cloudflare Turnstile"}.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Perché e su quale base</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Gestire la richiesta di prenotazione e il soggiorno, comprese le email su conferma o annullamento: è
              necessario per eseguire il contratto o le misure precontrattuali richieste da te (art. 6.1.b GDPR).
            </li>
            <li>
              Prevenire spam e abusi del modulo: legittimo interesse del titolare (art. 6.1.f GDPR).
            </li>
          </ul>
          <p>
            Fornire i dati è necessario per prenotare: senza, la richiesta non può essere gestita. Non li usiamo per
            marketing e non li vendiamo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">A chi li comunichiamo</h2>
          <p>
            Solo ai fornitori tecnici che ci servono per far funzionare il servizio (hosting e database, invio delle
            email{privacy.botProtection && ", verifica anti-bot"}), che agiscono come responsabili del trattamento.
            Alcuni possono trattare dati fuori dall'Unione Europea, con le garanzie previste dal GDPR (decisione di
            adeguatezza o clausole contrattuali standard).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Per quanto tempo</h2>
          <p>
            Nome, email, telefono e note vengono cancellati automaticamente {privacy.retentionMonths} mesi dopo il
            check-out; restano solo date e importi in forma anonima. Restano salvi gli obblighi di legge che la struttura
            gestisce separatamente (per esempio quelli fiscali o la comunicazione degli alloggiati).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">I tuoi diritti</h2>
          <p>
            Puoi chiedere in qualsiasi momento di accedere ai tuoi dati, correggerli, cancellarli, limitarne il
            trattamento, opporti o riceverli in un formato portabile (artt. 15–22 GDPR), scrivendo a {contact}. Hai anche
            il diritto di presentare reclamo al Garante per la protezione dei dati personali (
            <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="underline">
              garanteprivacy.it
            </a>
            ).
          </p>
        </section>
      </article>
    </main>
  );
}

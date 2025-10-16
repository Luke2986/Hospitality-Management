import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Building2, Calendar, BookOpen, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Gestione Ricettiva
              <span className="block text-primary mt-2">Resa Semplice</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              La soluzione completa per gestire il tuo B&B, agriturismo o casa vacanze.
              Monitora prenotazioni, mostra eventi e fai crescere il tuo business.
            </p>
          </div>

          <div className="flex gap-4">
            <Button size="lg" asChild data-testid="button-get-started">
              <Link href="/signup">Inizia</Link>
            </Button>
            <Button size="lg" variant="outline" asChild data-testid="button-login">
              <Link href="/login">Accedi</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16 w-full">
            {[
              {
                icon: Building2,
                title: "Gestione Proprietà",
                description: "Gestisci più proprietà con facilità",
              },
              {
                icon: BookOpen,
                title: "Sistema di Prenotazione",
                description: "Accetta e monitora le prenotazioni",
              },
              {
                icon: Calendar,
                title: "Calendario Eventi",
                description: "Mostra eventi locali agli ospiti",
              },
              {
                icon: TrendingUp,
                title: "Statistiche",
                description: "Monitora prestazioni e ricavi",
              },
            ].map((feature) => (
              <div key={feature.title} className="flex flex-col items-center space-y-2">
                <feature.icon className="w-12 h-12 text-primary" />
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

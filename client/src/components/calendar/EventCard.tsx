import { useState, useId } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, MapPin, Music, Utensils, Trophy, Church, ShoppingBag, Theater, ChevronDown, LucideIcon } from 'lucide-react';
import { Event } from '@shared/schema';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: Event;
}

function getCategoryIcon(category?: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    concerto: Music,
    sagra: Utensils,
    sport: Trophy,
    religioso: Church,
    mercato: ShoppingBag,
    cultura: Theater,
  };
  return icons[category || ''] || Calendar;
}

function getCategoryColor(category?: string): string {
  const colors: Record<string, string> = {
    concerto: 'bg-purple-500',
    sagra: 'bg-orange-500',
    sport: 'bg-green-500',
    religioso: 'bg-blue-500',
    mercato: 'bg-yellow-500',
    cultura: 'bg-pink-500',
  };
  return colors[category || ''] || 'bg-gray-500';
}

export function EventCard({ event }: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = getCategoryIcon(event.category || undefined);
  const colorClass = getCategoryColor(event.category || undefined);
  const descriptionId = useId();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.target === e.currentTarget) {
        e.preventDefault();
        setIsExpanded(!isExpanded);
      }
    }
  };

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-controls={event.description ? descriptionId : undefined}
      data-testid={`event-card-${event.id}`}
      data-category={event.category}
      data-event-title={event.title}
      data-event-date={event.eventDate}
      className="w-full text-left group bg-card rounded-lg p-3 md:p-4 border border-border hover:shadow-lg hover-elevate hover:scale-[1.02] transition-all duration-300 hover:border-primary/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      <div className="flex gap-3">
        {/* Badge data */}
        <div 
          className={`flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-lg ${colorClass} flex flex-col items-center justify-center text-white`}
          aria-hidden="true"
        >
          <span className="text-[10px] md:text-xs font-medium uppercase">
            {format(new Date(event.eventDate), 'MMM', { locale: it })}
          </span>
          <span className="text-lg md:text-xl font-bold">
            {format(new Date(event.eventDate), 'dd')}
          </span>
        </div>

        {/* Contenuto */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2 mb-1">
            <div className="flex items-start gap-2 min-w-0">
              <div className="relative group/tooltip flex items-center pt-0.5">
                <Icon 
                  className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary flex-shrink-0" 
                  aria-label={`Categoria: ${event.category || 'Evento'}`}
                />
                <div 
                  role="tooltip"
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block bg-gray-800 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none"
                >
                  <span className="capitalize">{event.category || 'Evento'}</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                </div>
              </div>
              <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                {event.title}
              </h4>
            </div>
            <ChevronDown 
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-300 flex-shrink-0 ml-1",
                isExpanded ? "rotate-180" : ""
              )} 
              aria-hidden="true"
            />
          </div>

          {event.description && (
            <div 
              id={descriptionId}
              className={cn(
                "text-xs text-muted-foreground overflow-hidden transition-[max-height,opacity,margin] duration-500 ease-in-out",
                isExpanded ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
              )}
            >
              <p className="leading-relaxed">
                {event.description}
              </p>
            </div>
          )}

          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1" onClick={(e) => e.stopPropagation()}>
            <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            {event.location ? (
                <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:text-primary hover:underline focus:outline-none focus:underline"
                    aria-label={`Apri mappa per ${event.location}`}
                >
                    {event.location}
                </a>
            ) : (
                <span className="truncate">Luogo non specificato</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

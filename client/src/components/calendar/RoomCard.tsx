import { Room } from '@shared/schema';
import { Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoomCardProps {
  room: Room;
  nights: number;
  onSelect: () => void;
}

export function RoomCard({ room, nights, onSelect }: RoomCardProps) {
  const pricePerNight = parseFloat(room.pricePerNight);
  const totalPrice = pricePerNight * (nights || 1);

  return (
    <div 
      className="group bg-card rounded-xl overflow-hidden border border-border hover:border-primary/20 hover:shadow-xl transition-all duration-300 flex flex-col h-full"
      data-testid={`room-card-${room.id}`}
    >
      <div className="relative h-48 bg-muted flex-shrink-0">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
          <Sparkles className="w-12 h-12 text-primary/40" />
        </div>
        {/* Guest Badge */}
        <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-md px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5 text-xs font-bold text-foreground border border-border/50">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span>Max {room.maxGuests}</span>
        </div>
      </div>

      <div className="p-4 md:p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors leading-tight">
          {room.name}
        </h3>

        {room.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-grow">
            {room.description}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-border flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              €{totalPrice.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {nights > 0 ? `per ${nights} ${nights === 1 ? 'notte' : 'notti'}` : `€${pricePerNight.toFixed(2)}/notte`}
            </p>
          </div>

          <Button
            onClick={onSelect}
            data-testid={`button-select-room-${room.id}`}
            className="w-full sm:w-auto rounded-full shadow-md hover:scale-105 justify-center"
          >
            Prenota
          </Button>
        </div>
      </div>
    </div>
  );
}

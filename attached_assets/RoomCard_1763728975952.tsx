
import React from 'react';
import { Room } from '../../types';
import { Users, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

interface RoomCardProps {
  room: Room;
  nights: number;
  onSelect: () => void;
}

export function RoomCard({ room, nights, onSelect }: RoomCardProps) {
  const totalPrice = room.price_per_night * (nights || 1);

  return (
    <div className="group bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-widget-primary/20 hover:shadow-xl transition-all duration-300 flex flex-col h-full">
      <div className="relative h-48 bg-gray-100 flex-shrink-0">
        {room.image_url ? (
            <img src={room.image_url} alt={room.name} className="w-full h-full object-cover" />
        ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-widget-primary/10 to-widget-secondary/10">
            <Sparkles className="w-12 h-12 text-widget-primary/40" />
            </div>
        )}
        {/* Guest Badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5 text-xs font-bold text-widget-text border border-white/50">
            <Users className="w-3.5 h-3.5 text-widget-primary" />
            <span>Max {room.max_guests}</span>
        </div>
      </div>

      <div className="p-4 md:p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-widget-text mb-2 group-hover:text-widget-primary transition-colors leading-tight">
          {room.name}
        </h3>

        {room.description && (
          <p className="text-sm text-widget-muted line-clamp-2 mb-4 flex-grow">
            {room.description}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-gray-50 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-bold text-widget-text leading-none">
              €{totalPrice}
            </p>
            <p className="text-xs text-widget-muted mt-1">
              {nights > 0 ? `per ${nights} notti` : `€${room.price_per_night}/notte`}
            </p>
          </div>

          <Button
            onClick={onSelect}
            className="w-full sm:w-auto bg-widget-primary hover:bg-widget-primary/90 text-white rounded-full shadow-md hover:scale-105 justify-center"
          >
            Prenota
          </Button>
        </div>
      </div>
    </div>
  );
}

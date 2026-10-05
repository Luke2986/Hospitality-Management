import { useState } from 'react';
import { differenceInDays } from 'date-fns';
import { Room } from '@shared/schema';
import { RoomCard } from './RoomCard';
import { BookingModal } from './BookingModal';

interface RoomsGridProps {
  rooms: Room[];
  selectedDates: { from?: Date; to?: Date };
  turnstileSiteKey?: string | null;
  privacyNoticeUrl?: string;
}

export function RoomsGrid({ rooms, selectedDates, turnstileSiteKey, privacyNoticeUrl }: RoomsGridProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const nights = selectedDates.from && selectedDates.to 
    ? differenceInDays(selectedDates.to, selectedDates.from)
    : 0;

  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-card rounded-xl p-6 shadow-lg border border-border">
        <h2 className="text-2xl font-bold mb-6 text-foreground">
          Camere disponibili
          {nights > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({nights} {nights === 1 ? 'notte' : 'notti'})
            </span>
          )}
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {rooms.map(room => (
            <div key={room.id}>
                <RoomCard
                    room={room}
                    nights={nights}
                    onSelect={() => handleRoomSelect(room)}
                />
            </div>
          ))}
        </div>
      </div>

      {selectedRoom && isModalOpen && (
        <BookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          room={selectedRoom}
          selectedDates={selectedDates}
          nights={nights}
          turnstileSiteKey={turnstileSiteKey}
          privacyNoticeUrl={privacyNoticeUrl}
        />
      )}
    </>
  );
}

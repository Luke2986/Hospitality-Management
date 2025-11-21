import React, { useState } from 'react';
import { differenceInDays } from 'date-fns';
import { Room } from '../../types';
import { MOCK_ROOMS } from '../../constants';
import { RoomCard } from './RoomCard';
import { BookingModal } from './BookingModal';

interface RoomsGridProps {
  propertyId: string;
  selectedDates: { from?: Date; to?: Date };
}

export function RoomsGrid({ propertyId, selectedDates }: RoomsGridProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // In real app, filter by propertyId
  const rooms = MOCK_ROOMS;

  const nights = selectedDates.from && selectedDates.to 
    ? differenceInDays(selectedDates.to, selectedDates.from)
    : 0;

  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold mb-6 text-widget-text">
          Camere disponibili
          {nights > 0 && (
            <span className="text-sm font-normal text-widget-muted ml-2">
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
        />
      )}
    </>
  );
}
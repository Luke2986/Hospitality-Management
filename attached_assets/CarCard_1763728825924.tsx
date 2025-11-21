import React from 'react';
import { Car } from '../../types';
import { MapPin, Fuel, Calendar, CheckCircle, Heart } from 'lucide-react';

interface CarCardProps {
  car: Car;
}

export const CarCard: React.FC<CarCardProps> = ({ car }) => {
  return (
    <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer">
      {/* Image Container */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={car.mainImage} 
          alt={`${car.brand} ${car.model}`} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3">
          <button className="p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white hover:text-primary transition-colors">
            <Heart size={20} className="text-gray-600 hover:text-primary" />
          </button>
        </div>
        {car.dealer.isCertified && (
          <div className="absolute bottom-3 left-3 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle size={12} />
            CERTIFICATO
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-text-primary leading-tight">
            {car.brand} {car.model}
          </h3>
          <p className="text-sm text-text-secondary truncate">{car.version}</p>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-text-secondary mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>{car.year}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="font-medium">{car.km.toLocaleString('it-IT')} km</div>
          </div>
          <div className="flex items-center gap-2">
            <Fuel size={16} />
            <span>{car.fuelType}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="capitalize">{car.transmission.toLowerCase()}</span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold text-text-primary">
              € {car.price.toLocaleString('it-IT')}
            </div>
            {car.financingMonthlyRate && (
              <div className="text-xs text-text-tertiary">
                da € {car.financingMonthlyRate}/mese
              </div>
            )}
          </div>
          <div className="flex items-center text-xs text-text-tertiary gap-1">
            <MapPin size={14} />
            {car.dealer.city}
          </div>
        </div>
      </div>
    </div>
  );
};
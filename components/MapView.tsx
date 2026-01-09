
import React, { useEffect, useRef } from 'react';
import { ParkingLocation } from '../types.ts';

interface MapViewProps {
  currentLocation: { lat: number, lng: number } | null;
  parkingLocation: ParkingLocation | null;
}

const MapView: React.FC<MapViewProps> = ({ currentLocation, parkingLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // @ts-ignore
    const L = window.L;
    const initialCenter = parkingLocation || currentLocation || { lat: 0, lng: 0 };
    
    mapInstanceRef.current = L.map(mapContainerRef.current).setView([initialCenter.lat, initialCenter.lng], 16);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    // @ts-ignore
    const L = window.L;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (currentLocation) {
      const userMarker = L.marker([currentLocation.lat, currentLocation.lng], {
        icon: L.divIcon({
            className: 'user-marker',
            html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>`
        })
      }).addTo(mapInstanceRef.current);
      markersRef.current.push(userMarker);
    }

    if (parkingLocation) {
      const carMarker = L.marker([parkingLocation.lat, parkingLocation.lng], {
        icon: L.divIcon({
            className: 'car-marker',
            html: `<div class="w-8 h-8 flex items-center justify-center bg-indigo-600 rounded-full border-2 border-white shadow-xl text-white">🚗</div>`
        })
      }).addTo(mapInstanceRef.current);
      markersRef.current.push(carMarker);
      
      // Auto-fit if both exist
      if (currentLocation) {
          const group = L.featureGroup(markersRef.current);
          mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
      } else {
          mapInstanceRef.current.setView([parkingLocation.lat, parkingLocation.lng], 17);
      }
    }
  }, [currentLocation, parkingLocation]);

  return <div ref={mapContainerRef} className="h-full w-full" />;
};

export default MapView;

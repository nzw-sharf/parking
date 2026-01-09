
export interface ParkingLocation {
  lat: number;
  lng: number;
  timestamp: number;
  address?: string;
}

export interface ParkingState {
  isParked: boolean;
  location: ParkingLocation | null;
  photoUrl: string | null;
  meterEndTime: number | null; // Timestamp
  note: string;
  spotDetails: string; // Floor, number, or letter
}

// frontend/src/types/index.ts
export interface Location {
  lat: number;
  lng: number;
}

export interface Place {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  open_now?: boolean | null;
  price_level?: number;
  maps_url: string;
  directions_url: string;
  embed_url: string;
  phone?: string;
  website?: string;
  opening_hours?: string[];
  reviews?: Review[];
  photos?: string[];
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  time: string;
}

export interface QueryRequest {
  prompt: string;
  user_location?: Location;
  max_results?: number;
  use_cache?: boolean;
}

export interface QueryResponse {
  llm_text: string;
  places: Place[];
  request_id: string;
  cached: boolean;
  processing_time: number;
}

export interface ApiError {
  error: string;
  message?: string;
}
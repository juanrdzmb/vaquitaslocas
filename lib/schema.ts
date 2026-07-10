export type Coordinates = {
  lat: number;
  lng: number;
};

export type BudgetItem = {
  category: string;
  description: string;
  amount: number;
  currency: string;
};

export type ItineraryStop = {
  time?: string;
  title: string;
  description: string;
  location?: string;
  coordinates?: Coordinates | null;
  duration?: string;
  cost?: string;
  tags?: string[];
};

export type ItineraryDay = {
  dayNumber: number;
  date: string | null;
  title: string;
  summary: string;
  stops: ItineraryStop[];
};

export type Recommendation = {
  id: string;
  type: "hidden_gem" | "restaurant" | "library" | "bookstore" | "activity" | "viewpoint" | "culture" | "other";
  title: string;
  description: string;
  reason: string;
  location?: string;
  coordinates?: Coordinates | null;
  tags?: string[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export type TransportSegment = {
  id: string;
  type: "flight" | "train" | "bus" | "other";
  date: string | null;
  route: string;
  departure: string;
  arrival: string;
  departureTime: string | null;
  arrivalTime: string | null;
  duration: string | null;
  price: number | null;
  currency: string;
  notes: string | null;
  coordinates: Coordinates | null;
};

export type HotelStay = {
  id: string;
  name: string;
  city: string;
  checkInDate: string | null;
  checkOutDate: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  address: string | null;
  pricePerNight: number | null;
  nights: number | null;
  totalPrice: number | null;
  currency: string;
  paymentStatus: "paid" | "pending" | "free_cancellation" | "unknown";
  cancellationDeadline: string | null;
  notes: string | null;
  coordinates: Coordinates | null;
};

export type Trip = {
  id: string;
  title: string;
  subtitle: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  travelers: number;
  currency: string;
  overview: string;
  highlights: string[];
  tips: string[];
  itinerary: ItineraryDay[];
  budget: BudgetItem[];
  recommendations: Recommendation[];
  transport: TransportSegment[];
  hotels: HotelStay[];
  mapCenter: Coordinates | null;
  createdAt: number;
};

export type RawSheet = {
  name: string;
  rows: Record<string, unknown>[];
};

const RECO_TYPE_KEYWORDS: Array<[string, Recommendation["type"]]> = [
  ["restaurant", "restaurant"],
  ["comida", "restaurant"],
  ["cafe", "restaurant"],
  ["cafeter", "restaurant"],
  ["bar", "restaurant"],
  ["bibliot", "library"],
  ["library", "library"],
  ["librer", "bookstore"],
  ["bookstore", "bookstore"],
  ["books", "bookstore"],
  ["joya", "hidden_gem"],
  ["hidden", "hidden_gem"],
  ["gem", "hidden_gem"],
  ["secre", "hidden_gem"],
  ["mirador", "viewpoint"],
  ["viewpoint", "viewpoint"],
  ["vista", "viewpoint"],
  ["museo", "culture"],
  ["museum", "culture"],
  ["cultural", "culture"],
  ["cultura", "culture"],
  ["galer", "culture"],
  ["actividad", "activity"],
  ["activity", "activity"],
  ["experiencia", "activity"],
  ["tour", "activity"],
  ["plan", "activity"],
];

export function inferRecommendationType(text: string): Recommendation["type"] {
  const lower = text.toLowerCase();
  for (const [keyword, type] of RECO_TYPE_KEYWORDS) {
    if (lower.includes(keyword)) return type;
  }
  return "other";
}

export function recoTypeLabel(type: Recommendation["type"]): string {
  const labels: Record<Recommendation["type"], string> = {
    hidden_gem: "Joya oculta",
    restaurant: "Dónde comer",
    library: "Biblioteca",
    bookstore: "Librería",
    activity: "Actividad",
    viewpoint: "Mirador",
    culture: "Cultura",
    other: "Recomendación",
  };
  return labels[type];
}

export function recoTypeEmoji(type: Recommendation["type"]): string {
  const emojis: Record<Recommendation["type"], string> = {
    hidden_gem: "✦",
    restaurant: "◐",
    library: "❖",
    bookstore: "❖",
    activity: "◇",
    viewpoint: "△",
    culture: "❖",
    other: "•",
  };
  return emojis[type];
}

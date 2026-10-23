export type Coordinates = { lat: number; lng: number };
export type Address = Coordinates & { address: string };
export type Category = "Food" | "Groceries" | "Electronics" | "Flowers" | "Sports";
export type ProductImage = { src: string; alt: string };
export type ProductColor = { id: string; name: string; hex: string; images: ProductImage[] };
export type ProductReview = { id: string; author: string; rating: number; title: string; body: string; date: string };
export type ProductQuestion = { id: string; question: string; answer?: string; answeredBy?: string };
export type Product = {
  id: string; name: string; category: Category; unit: string; emoji: string; description: string;
  brand?: string; model?: string; size?: string; longDescription?: string[];
  specifications?: Record<string, string>; images?: ProductImage[]; colors?: ProductColor[];
  reviews?: ProductReview[]; questions?: ProductQuestion[]; sampleDetails?: boolean;
};
export type Hours = Record<number, [string, string][]>;
export type PaymentMethod = "cash" | "card";
export type StockConfidence = "confirmed" | "probable" | "unverified";
export type Store = Coordinates & {
  id: string; name: string; category: Category; address: string; radiusKm: number;
  prepMinutes: number; hours: Hours; accent?: string; mark?: string;
  acceptingOrders?: boolean; acceptedPaymentMethods?: PaymentMethod[];
  settingsRevision?: number;
};
export type Offer = {
  id: string; productId: string; storeId: string; price: number; stock: "in" | "out"; updatedAt: string;
  colorId?: string; quantityAvailable?: number | null;
  stockConfidence?: StockConfidence;
};
export type Listing = { product: Product; offer: Offer; store: Store; available: boolean; reason: string | null; distanceKm: number; etaMinutes: number };
export type OrderStatus = "placed" | "accepted" | "ready" | "assigned" | "picked_up" | "delivered" | "rejected";
export type OrderItem = { offerId: string; quantity: number; unitPrice: number };
export type Order = {
  id: string; storeId: string; items: OrderItem[]; customerAddress: string;
  customerLat: number; customerLng: number; status: OrderStatus; subtotal: number;
  deliveryFee: number; platformFee: number; total: number; createdAt: string;
  courierId: string | null;
};
export type Courier = Coordinates & { id: string; name: string; online: boolean; lastLocationAt: string | null; completed: number };
export type DemoState = {
  products: Product[]; stores: Store[]; offers: Offer[]; orders: Order[];
  courier: Courier; customer: Address; demoTime: string;
};
export type OrderAction =
  | { type: "merchantAccept" }
  | { type: "merchantReject" }
  | { type: "merchantReady" }
  | { type: "courierAccept"; courierId: string }
  | { type: "courierPickup" }
  | { type: "courierDeliver" };

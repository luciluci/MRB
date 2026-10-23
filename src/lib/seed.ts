import type { DemoState, Hours, Offer, Product, Store } from "./types";
import { colorOffers, offerDetails, productDetails } from "./catalog-details";

const everyDay = (start: string, end: string): Hours => Object.fromEntries(Array.from({ length: 7 }, (_, day) => [day, [[start, end]]])) as Hours;
const weekdays = (start: string, end: string): Hours => ({ 0: [], 1: [[start, end]], 2: [[start, end]], 3: [[start, end]], 4: [[start, end]], 5: [[start, end]], 6: [] });

const stores: Store[] = [
  { id: "iasi-urban-grocer", name: "Urban Grocer", category: "Groceries", address: "Palas area, Iași · sample location", lat: 47.1573, lng: 27.5895, radiusKm: 2, prepMinutes: 15, hours: everyDay("08:00", "22:00"), accent: "#D8E8CD", mark: "UG" },
  { id: "iasi-bean-bowl", name: "Bean & Bowl", category: "Food", address: "Piața Unirii area, Iași · sample location", lat: 47.1665, lng: 27.5800, radiusKm: 2, prepMinutes: 25, hours: everyDay("08:00", "21:00"), accent: "#F4DCC6", mark: "B&B" },
  { id: "iasi-volt-lab", name: "Volt Lab", category: "Electronics", address: "Centru, Iași · sample location", lat: 47.1630, lng: 27.5860, radiusKm: 2, prepMinutes: 20, hours: weekdays("10:00", "20:00"), accent: "#DCD8F0", mark: "VL" },
  { id: "iasi-petal-house", name: "Petal House", category: "Flowers", address: "Piața Unirii area, Iași · sample location", lat: 47.1680, lng: 27.5830, radiusKm: 2, prepMinutes: 30, hours: everyDay("09:00", "19:00"), accent: "#F4DCE2", mark: "PH" },
  { id: "iasi-fieldhouse", name: "Fieldhouse", category: "Sports", address: "Copou area, Iași · sample location", lat: 47.1770, lng: 27.5680, radiusKm: 2, prepMinutes: 20, hours: weekdays("10:00", "18:00"), accent: "#DBEBE9", mark: "FH" },
  { id: "iasi-pixel-point", name: "Pixel Point", category: "Electronics", address: "Tudor Vladimirescu area, Iași · sample location", lat: 47.1550, lng: 27.6050, radiusKm: 2, prepMinutes: 12, hours: weekdays("09:00", "17:00"), accent: "#D8E0FA", mark: "PP" },
  // Paired demo shops make the trade-off between price and delivery time visible.
  { id: "iasi-daily-express", name: "Daily Express", category: "Groceries", address: "Centru, Iași · sample location", lat: 47.1620, lng: 27.5900, radiusKm: 2, prepMinutes: 5, hours: everyDay("08:00", "23:00"), accent: "#E0EFCF", mark: "DE" },
  { id: "iasi-market-value", name: "Market Value", category: "Groceries", address: "Tătărași, Iași · sample location", lat: 47.1700, lng: 27.6100, radiusKm: 2, prepMinutes: 35, hours: everyDay("08:00", "23:00"), accent: "#F2E9C9", mark: "MV" },
  { id: "iasi-quick-bites", name: "Quick Bites", category: "Food", address: "Centru, Iași · sample location", lat: 47.1630, lng: 27.5880, radiusKm: 2, prepMinutes: 8, hours: everyDay("08:00", "23:00"), accent: "#F7D6C5", mark: "QB" },
  { id: "iasi-table-market", name: "Table Market", category: "Food", address: "Nicolina, Iași · sample location", lat: 47.1450, lng: 27.5820, radiusKm: 2, prepMinutes: 38, hours: everyDay("08:00", "23:00"), accent: "#F3E0BB", mark: "TM" },
  { id: "iasi-tech-express", name: "Tech Express", category: "Electronics", address: "Palas area, Iași · sample location", lat: 47.1590, lng: 27.5890, radiusKm: 2, prepMinutes: 6, hours: everyDay("08:00", "23:00"), accent: "#D5E6FA", mark: "TE" },
  { id: "iasi-gadget-depot", name: "Gadget Depot", category: "Electronics", address: "Păcurari, Iași · sample location", lat: 47.1780, lng: 27.5540, radiusKm: 2, prepMinutes: 40, hours: everyDay("08:00", "23:00"), accent: "#E3DCF5", mark: "GD" },
  { id: "iasi-bloom-express", name: "Bloom Express", category: "Flowers", address: "Centru, Iași · sample location", lat: 47.1640, lng: 27.5870, radiusKm: 2, prepMinutes: 7, hours: everyDay("08:00", "23:00"), accent: "#F8D9E6", mark: "BE" },
  { id: "iasi-garden-market", name: "Garden Market", category: "Flowers", address: "Copou, Iași · sample location", lat: 47.1840, lng: 27.5680, radiusKm: 2, prepMinutes: 35, hours: everyDay("08:00", "23:00"), accent: "#DCEACF", mark: "GM" },
  { id: "iasi-sport-express", name: "Sport Express", category: "Sports", address: "Palas area, Iași · sample location", lat: 47.1580, lng: 27.5900, radiusKm: 2, prepMinutes: 5, hours: everyDay("08:00", "23:00"), accent: "#CFECE6", mark: "SE" },
  { id: "iasi-active-outlet", name: "Active Outlet", category: "Sports", address: "Tudor Vladimirescu, Iași · sample location", lat: 47.1510, lng: 27.6150, radiusKm: 2, prepMinutes: 38, hours: everyDay("08:00", "23:00"), accent: "#DCE5F2", mark: "AO" },
];

const products: Product[] = [
  ["coffee", "Flat white", "Food", "cup", "☕", "Double espresso with silky steamed milk"],
  ["bowl", "Chicken grain bowl", "Food", "portion", "🥗", "A warm, filling lunch with greens"],
  ["sandwich", "Turkey focaccia", "Food", "piece", "🥪", "Freshly made focaccia sandwich"],
  ["croissant", "Butter croissant", "Food", "piece", "🥐", "Baked this morning"],
  ["milk", "Fresh milk", "Groceries", "1 L", "🥛", "Everyday essential"],
  ["eggs", "Free range eggs", "Groceries", "10 pack", "🥚", "Large free range eggs"],
  ["apples", "Red apples", "Groceries", "1 kg", "🍎", "Sweet and crisp"],
  ["bread", "Sourdough loaf", "Groceries", "loaf", "🍞", "Slow-fermented bakery loaf"],
  ["detergent", "Laundry detergent", "Groceries", "1.5 L", "🧴", "Fresh cotton scent"],
  ["headphones", "Wireless headphones", "Electronics", "pair", "🎧", "Over-ear listening, all day"],
  ["powerbank", "Power bank 10,000 mAh", "Electronics", "unit", "🔋", "Portable power for busy days"],
  ["charger", "USB-C fast charger", "Electronics", "unit", "🔌", "Compact 30 W charger"],
  ["speaker", "Portable speaker", "Electronics", "unit", "🔊", "Take your music anywhere"],
  ["bouquet", "Seasonal bouquet", "Flowers", "bouquet", "💐", "Florist's pick of the day"],
  ["roses", "Six red roses", "Flowers", "bunch", "🌹", "A classic gesture"],
  ["plant", "Potted monstera", "Flowers", "plant", "🪴", "Easy-going indoor greenery"],
  ["yoga", "Yoga mat", "Sports", "unit", "🧘", "Soft-grip workout mat"],
  ["football", "Training football", "Sports", "unit", "⚽", "Ready for the next match"],
  ["bottle", "Insulated bottle", "Sports", "750 ml", "💧", "Cold drinks on the move"],
  ["pizza", "Margherita pizza", "Food", "32 cm", "🍕", "Tomato sauce, mozzarella and basil on a thin crust"],
  ["wrap", "Falafel wrap", "Food", "portion", "🌯", "Falafel, hummus and crunchy vegetables in a soft wrap"],
  ["muffin", "Blueberry muffin", "Food", "piece", "🧁", "A soft bakery muffin with blueberries"],
  ["bananas", "Bananas", "Groceries", "1 kg", "🍌", "Ripe bananas for breakfast or a snack"],
  ["tomatoes", "Cherry tomatoes", "Groceries", "500 g", "🍅", "Sweet cherry tomatoes for salads and cooking"],
  ["pasta", "Penne pasta", "Groceries", "500 g", "🍝", "Durum wheat penne for everyday meals"],
  ["mouse", "Wireless mouse", "Electronics", "unit", "🖱️", "Compact wireless mouse with a USB receiver"],
  ["keyboard", "Compact keyboard", "Electronics", "unit", "⌨️", "Space-saving wired keyboard with a USB connection"],
  ["usb-cable", "USB-C charging cable", "Electronics", "2 m", "🔌", "Braided USB-C to USB-C cable for charging and data"],
  ["tulips", "Ten pink tulips", "Flowers", "bunch", "🌷", "Ten pink tulip stems wrapped as a gift"],
  ["orchid", "White orchid", "Flowers", "plant", "🪴", "A white flowering orchid in a nursery pot"],
  ["sunflowers", "Five sunflowers", "Flowers", "bunch", "🌻", "Five bright sunflower stems with simple wrapping"],
  ["dumbbells", "Dumbbell pair", "Sports", "2 × 2 kg", "🏋️", "Two coated 2 kg dumbbells for home workouts"],
  ["resistance-bands", "Resistance band set", "Sports", "3 pack", "💪", "Light, medium and heavy resistance loops"],
  ["jump-rope", "Adjustable jump rope", "Sports", "unit", "🪢", "An adjustable rope with comfortable handles"],
].map(([id, name, category, unit, emoji, description]) => ({ id, name, category: category as Product["category"], unit, emoji, description, ...productDetails[id] }));

const rows: [string, string, number, "in" | "out"][] = [
  ["coffee", "iasi-bean-bowl", 16, "in"], ["bowl", "iasi-bean-bowl", 44, "in"], ["sandwich", "iasi-bean-bowl", 31, "in"], ["croissant", "iasi-bean-bowl", 14, "in"],
  ["milk", "iasi-urban-grocer", 11, "in"], ["eggs", "iasi-urban-grocer", 19, "in"], ["apples", "iasi-urban-grocer", 9, "in"], ["bread", "iasi-urban-grocer", 18, "in"], ["detergent", "iasi-urban-grocer", 38, "out"],
  ["headphones", "iasi-volt-lab", 189, "in"], ["powerbank", "iasi-volt-lab", 89, "in"], ["charger", "iasi-volt-lab", 72, "in"], ["speaker", "iasi-volt-lab", 129, "in"],
  ["headphones", "iasi-pixel-point", 179, "in"], ["charger", "iasi-pixel-point", 79, "in"],
  ["bouquet", "iasi-petal-house", 85, "in"], ["roses", "iasi-petal-house", 69, "in"], ["plant", "iasi-petal-house", 95, "in"],
  ["yoga", "iasi-fieldhouse", 110, "in"], ["football", "iasi-fieldhouse", 74, "in"], ["bottle", "iasi-fieldhouse", 65, "in"],
  // Each product below has a faster, higher-priced offer and a slower, cheaper offer.
  ["milk", "iasi-daily-express", 14, "in"], ["eggs", "iasi-daily-express", 24, "in"],
  ["bananas", "iasi-daily-express", 12, "in"], ["tomatoes", "iasi-daily-express", 15, "in"], ["pasta", "iasi-daily-express", 10, "in"],
  ["milk", "iasi-market-value", 8, "in"], ["eggs", "iasi-market-value", 15, "in"],
  ["bananas", "iasi-market-value", 7, "in"], ["tomatoes", "iasi-market-value", 9, "in"], ["pasta", "iasi-market-value", 6, "in"],
  ["coffee", "iasi-quick-bites", 20, "in"], ["croissant", "iasi-quick-bites", 17, "in"],
  ["pizza", "iasi-quick-bites", 42, "in"], ["wrap", "iasi-quick-bites", 32, "in"], ["muffin", "iasi-quick-bites", 16, "in"],
  ["coffee", "iasi-table-market", 12, "in"], ["croissant", "iasi-table-market", 10, "in"],
  ["pizza", "iasi-table-market", 29, "in"], ["wrap", "iasi-table-market", 23, "in"], ["muffin", "iasi-table-market", 11, "in"],
  ["charger", "iasi-tech-express", 85, "in"], ["powerbank", "iasi-tech-express", 109, "in"],
  ["mouse", "iasi-tech-express", 79, "in"], ["keyboard", "iasi-tech-express", 119, "in"], ["usb-cable", "iasi-tech-express", 39, "in"],
  ["charger", "iasi-gadget-depot", 55, "in"], ["powerbank", "iasi-gadget-depot", 69, "in"],
  ["mouse", "iasi-gadget-depot", 49, "in"], ["keyboard", "iasi-gadget-depot", 85, "in"], ["usb-cable", "iasi-gadget-depot", 22, "in"],
  ["bouquet", "iasi-bloom-express", 99, "in"], ["roses", "iasi-bloom-express", 79, "in"],
  ["tulips", "iasi-bloom-express", 85, "in"], ["orchid", "iasi-bloom-express", 95, "in"], ["sunflowers", "iasi-bloom-express", 69, "in"],
  ["bouquet", "iasi-garden-market", 65, "in"], ["roses", "iasi-garden-market", 49, "in"],
  ["tulips", "iasi-garden-market", 59, "in"], ["orchid", "iasi-garden-market", 65, "in"], ["sunflowers", "iasi-garden-market", 45, "in"],
  ["yoga", "iasi-sport-express", 129, "in"], ["bottle", "iasi-sport-express", 79, "in"],
  ["dumbbells", "iasi-sport-express", 89, "in"], ["resistance-bands", "iasi-sport-express", 59, "in"], ["jump-rope", "iasi-sport-express", 39, "in"],
  ["yoga", "iasi-active-outlet", 85, "in"], ["bottle", "iasi-active-outlet", 49, "in"],
  ["dumbbells", "iasi-active-outlet", 59, "in"], ["resistance-bands", "iasi-active-outlet", 35, "in"], ["jump-rope", "iasi-active-outlet", 22, "in"],
];
const offers: Offer[] = [
  ...rows.map(([productId, storeId, price, stock]) => ({ id: `${storeId}-${productId}`, productId, storeId, price, stock, updatedAt: "2026-10-19T08:00:00Z", ...offerDetails[`${storeId}-${productId}`] })),
  ...colorOffers,
];

export function createSeedState(): DemoState {
  return {
    products, stores, offers, orders: [],
    courier: { id: "courier-alex", name: "Alex", online: false, lat: 47.1630, lng: 27.5860, lastLocationAt: null, completed: 0 },
    customer: { address: "Piața Unirii, Iași, România", lat: 47.1665, lng: 27.5800 },
    demoTime: "2026-10-19T10:00:00.000Z",
  };
}

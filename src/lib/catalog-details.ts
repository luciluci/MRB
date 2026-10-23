import type { Offer, Product, ProductColor } from "./types";

const headphoneColors: ProductColor[] = [
  { id: "graphite", name: "Graphite", hex: "#343c42", images: [
    { src: "/products/headphones-graphite.svg", alt: "Wireless headphones in Graphite, front view" },
    { src: "/products/headphones-graphite-side.svg", alt: "Wireless headphones in Graphite, side view" },
  ] },
  { id: "sand", name: "Sand", hex: "#cfbda5", images: [
    { src: "/products/headphones-sand.svg", alt: "Wireless headphones in Sand, front view" },
    { src: "/products/headphones-sand-side.svg", alt: "Wireless headphones in Sand, side view" },
  ] },
  { id: "sage", name: "Sage", hex: "#8d9f88", images: [
    { src: "/products/headphones-sage.svg", alt: "Wireless headphones in Sage, front view" },
    { src: "/products/headphones-sage-side.svg", alt: "Wireless headphones in Sage, side view" },
  ] },
];

// Illustrative catalogue content for the local demo, not manufacturer or live stock data.
export const productDetails: Record<string, Partial<Product>> = {
  headphones: {
    brand: "MRB Studio", model: "Everyday Wireless", size: "Adjustable, over-ear",
    sampleDetails: true, colors: headphoneColors,
    images: headphoneColors[0].images,
    longDescription: [
      "A little more space for your favourite sound. These over-ear headphones pair a softly padded headband with cushioned ear cups for your daily listening routine.",
      "Choose Graphite, Sand or Sage to explore the finish. Hover over a colour thumbnail for a closer look, or select it to see that colour's price and availability at this seller.",
      "The sample package includes one pair of headphones, a USB-C charging cable and a quick-start guide. Product illustrations and technical details are demonstration content.",
    ],
    specifications: {
      "Product type": "Over-ear wireless headphones", "Connection": "Bluetooth 5.3",
      "Charging port": "USB-C", "Battery life": "Up to 30 hours (sample specification)",
      "Weight": "240 g", "Microphone": "Built in", "Fit": "Adjustable headband",
      "In the box": "Headphones, USB-C cable, quick-start guide",
    },
    reviews: [
      { id: "sample-1", author: "Alex · sample reviewer", rating: 5, title: "Comfortable for daily listening", body: "The ear cushions feel soft and the controls are easy to reach. I like the understated finish.", date: "2026-10-12" },
      { id: "sample-2", author: "Mara · sample reviewer", rating: 4, title: "A useful everyday pair", body: "Simple to pair and easy to carry. A travel case would be a welcome addition.", date: "2026-10-15" },
    ],
    questions: [
      { id: "sample-q1", question: "Is a charging cable included?", answer: "Yes. This sample package includes a USB-C charging cable; a wall charger is not included.", answeredBy: "MRB demo catalogue" },
      { id: "sample-q2", question: "Does choosing a colour change the seller?", answer: "No. The colour options shown here belong to the same seller. Each has its own availability.", answeredBy: "MRB demo catalogue" },
    ],
  },
  milk: { size: "1 L", longDescription: ["Fresh milk in a one-litre pack. Check the packaging at collection for the ingredients, storage instructions and use-by date."] },
  eggs: { size: "10 eggs", specifications: { "Pack quantity": "10", "Egg size": "Large" } },
  apples: { size: "1 kg", specifications: { "Variety": "Red apples", "Selling unit": "1 kg" } },
  detergent: { size: "1.5 L", specifications: { "Scent": "Fresh cotton", "Pack volume": "1.5 L" } },
  powerbank: { specifications: { "Capacity": "10,000 mAh" } },
  charger: { specifications: { "Port": "USB-C", "Power": "30 W" } },
  roses: { size: "6 stems", specifications: { "Flower": "Rose", "Colour": "Red", "Bunch quantity": "6 stems" } },
  bottle: { size: "750 ml", specifications: { "Capacity": "750 ml", "Type": "Insulated bottle" } },
};

export const offerDetails: Record<string, Partial<Offer>> = {
  "iasi-volt-lab-headphones": { colorId: "graphite", quantityAvailable: 7 },
  "iasi-pixel-point-headphones": { colorId: "graphite", quantityAvailable: 2 },
};

export const colorOffers: Offer[] = [
  { id: "iasi-volt-lab-headphones-sand", productId: "headphones", storeId: "iasi-volt-lab", colorId: "sand", quantityAvailable: 4, price: 189, stock: "in", updatedAt: "2026-10-19T08:00:00Z" },
  { id: "iasi-volt-lab-headphones-sage", productId: "headphones", storeId: "iasi-volt-lab", colorId: "sage", quantityAvailable: 0, price: 189, stock: "out", updatedAt: "2026-10-19T08:00:00Z" },
  { id: "iasi-pixel-point-headphones-sand", productId: "headphones", storeId: "iasi-pixel-point", colorId: "sand", price: 179, stock: "in", updatedAt: "2026-10-19T08:00:00Z" },
];

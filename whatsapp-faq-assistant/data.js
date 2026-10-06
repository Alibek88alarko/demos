// Fictional store data (demo). Not a real business.
var STORE_KB = [
  { type: "faq", id: "F1", title: "Shipping times", keywords: "shipping how long days business time arrive", answer: "Orders ship within 1-2 business days. Standard shipping in the US takes 3-5 business days, express takes 1-2." },
  { type: "faq", id: "F2", title: "Shipping cost", keywords: "shipping price free cost fee", answer: "Shipping is free on US orders over $75. Below that, standard shipping is $7.95 and express is $19.95." },
  { type: "faq", id: "F3", title: "International shipping", keywords: "international shipping canada outside abroad country", answer: "We currently ship to the US and Canada only. Canadian orders take 5-8 business days." },
  { type: "faq", id: "F4", title: "Return policy", keywords: "return policy window days can i", answer: "You can return unused items within 30 days of delivery. Bedding must be in its original packaging." },
  { type: "faq", id: "F5", title: "How to return", keywords: "return how start process label", answer: "Start a return at hearthandwillow.example/returns with your order number. We email you a prepaid label within 24 hours." },
  { type: "faq", id: "F6", title: "Refund timing", keywords: "return money when refund days", answer: "Refunds go back to your original payment method within 5 business days after we receive the item." },
  { type: "faq", id: "F7", title: "Damaged items", keywords: "damaged arrived item photo replace", answer: "Sorry about that! Send a photo of the damage within 7 days of delivery and we'll ship a replacement at no cost." },
  { type: "faq", id: "F8", title: "Order tracking", keywords: "tracking order status number link", answer: "You get a tracking link by email as soon as your order ships. You can also check it at hearthandwillow.example/track." },
  { type: "product", id: "HW-101", name: "Stonewashed Linen Duvet Cover", keywords: "duvet cover bedding linen", material: "100% European flax linen, stonewashed",
    sizes: [{ label: "Twin", dims: "68 x 90 in", price: 149, stock: 12 }, { label: "Queen", dims: "90 x 92 in", price: 189, stock: 4 }, { label: "King", dims: "106 x 92 in", price: 219, stock: 0 }] },
  { type: "product", id: "HW-205", name: "Chunky Knit Wool Throw Blanket", keywords: "blanket knit wool cozy", material: "merino wool blend",
    sizes: [{ label: "Standard", dims: "50 x 60 in", price: 129, stock: 9 }] },
  { type: "product", id: "HW-310", name: "Handmade Ceramic Vase", keywords: "vase ceramic flowers", material: "glazed stoneware, handmade",
    sizes: [{ label: "Small", dims: "6 in tall", price: 39, stock: 20 }, { label: "Large", dims: "11 in tall", price: 69, stock: 3 }] },
  { type: "product", id: "HW-412", name: "Turkish Cotton Towel Set", keywords: "towel bath set cotton", material: "100% Turkish cotton, 600 GSM",
    sizes: [{ label: "4-piece", dims: "2 bath + 2 hand", price: 79, stock: 15 }, { label: "6-piece", dims: "2 bath + 2 hand + 2 washcloth", price: 99, stock: 0 }] },
  { type: "product", id: "HW-520", name: "Hand-Woven Jute Area Rug", keywords: "rug jute floor area", material: "natural jute, hand-woven",
    sizes: [{ label: "5 x 7 ft", dims: "60 x 84 in", price: 189, stock: 6 }, { label: "8 x 10 ft", dims: "96 x 120 in", price: 349, stock: 2 }] },
  { type: "product", id: "HW-615", name: "Soy Wax Candle, Cedar & Fig", keywords: "candle scented soy cedar fig", material: "soy wax, cotton wick, 50 hour burn",
    sizes: [{ label: "8 oz", dims: "3.5 in jar", price: 32, stock: 40 }] }
];
if (typeof module !== "undefined" && module.exports) module.exports = { STORE_KB: STORE_KB };

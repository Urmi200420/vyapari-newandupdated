// Placeholder catalogue. Later this comes from GET /api/items (Spring Boot).
export const categories = [
  { id: "all", label: "All items", icon: "🛍️" },
  { id: "veggies", label: "Fruits & Vegetables", icon: "🥦" },
  { id: "electronics", label: "Electronics", icon: "📱" },
  { id: "clothing", label: "Clothing", icon: "👕" },
  { id: "footwear", label: "Footwear", icon: "👟" },
  { id: "home", label: "Home & Kitchen", icon: "🍳" },
  { id: "books", label: "Books", icon: "📚" },
  { id: "beauty", label: "Beauty & Care", icon: "💄" },
  { id: "sports", label: "Sports & Fitness", icon: "🏏" },
  { id: "toys", label: "Toys & Games", icon: "🧸" },
];

export const products = [
  { id: 1, name: "Fresh Broccoli (500 g)", category: "veggies", mrp: 110, price: 79, rating: 4.4, emoji: "🥦" },
  { id: 2, name: "Farm Carrots (1 kg)", category: "veggies", mrp: 80, price: 55, rating: 4.3, emoji: "🥕" },
  { id: 3, name: "Kashmiri Apples (1 kg)", category: "veggies", mrp: 260, price: 189, rating: 4.6, emoji: "🍎" },
  { id: 4, name: "Ripe Tomatoes (1 kg)", category: "veggies", mrp: 60, price: 40, rating: 4.1, emoji: "🍅" },
  { id: 5, name: "Smartphone 128 GB", category: "electronics", mrp: 24999, price: 17999, rating: 4.3, emoji: "📱" },
  { id: 6, name: "Laptop 14\" 8 GB RAM", category: "electronics", mrp: 54990, price: 42990, rating: 4.5, emoji: "💻" },
  { id: 7, name: "Wireless Headphones", category: "electronics", mrp: 3999, price: 2499, rating: 4.2, emoji: "🎧" },
  { id: 8, name: "Smart Watch", category: "electronics", mrp: 4999, price: 3299, rating: 4.0, emoji: "⌚" },
  { id: 9, name: "Cotton T-Shirt", category: "clothing", mrp: 799, price: 499, rating: 4.2, emoji: "👕" },
  { id: 10, name: "Denim Jacket", category: "clothing", mrp: 2999, price: 1799, rating: 4.4, emoji: "🧥" },
  { id: 11, name: "Printed Kurti", category: "clothing", mrp: 1499, price: 899, rating: 4.5, emoji: "👗" },
  { id: 12, name: "Cotton Saree", category: "clothing", mrp: 2199, price: 1299, rating: 4.6, emoji: "🥻" },
  { id: 13, name: "Running Shoes", category: "footwear", mrp: 2999, price: 1999, rating: 4.3, emoji: "👟" },
  { id: 14, name: "Leather Sandals", category: "footwear", mrp: 1499, price: 999, rating: 4.1, emoji: "👡" },
  { id: 15, name: "Non-stick Pan", category: "home", mrp: 1199, price: 749, rating: 4.4, emoji: "🍳" },
  { id: 16, name: "Table Lamp", category: "home", mrp: 999, price: 599, rating: 4.0, emoji: "💡" },
  { id: 17, name: "Bestselling Novel", category: "books", mrp: 499, price: 299, rating: 4.7, emoji: "📖" },
  { id: 18, name: "Exam Prep Guide", category: "books", mrp: 650, price: 450, rating: 4.2, emoji: "📚" },
  { id: 19, name: "Face Moisturiser", category: "beauty", mrp: 499, price: 349, rating: 4.3, emoji: "🧴" },
  { id: 20, name: "Lipstick Set", category: "beauty", mrp: 999, price: 599, rating: 4.1, emoji: "💄" },
  { id: 21, name: "Cricket Bat", category: "sports", mrp: 2299, price: 1499, rating: 4.4, emoji: "🏏" },
  { id: 22, name: "Yoga Mat", category: "sports", mrp: 1199, price: 699, rating: 4.5, emoji: "🧘" },
  { id: 23, name: "Building Blocks Set", category: "toys", mrp: 1399, price: 899, rating: 4.6, emoji: "🧱" },
  { id: 24, name: "Plush Teddy Bear", category: "toys", mrp: 899, price: 549, rating: 4.5, emoji: "🧸" },
];

export const formatPrice = (n) => "₹" + n.toLocaleString("en-IN");
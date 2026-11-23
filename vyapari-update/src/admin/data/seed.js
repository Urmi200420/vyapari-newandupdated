/*
  Admin demo data — one seeded dataset for the whole Admin Dashboard.

  Everything here is generated from fixed seeds, so the demo looks the same on every machine.
  Dates are relative to `now`, so the data always looks "current".

  How the money model works (used by Overview + Revenue & Earnings):
    • The ORDER LEDGER holds every order of the last LEDGER_DAYS days in full detail.
    • Older orders are rolled up into one ARCHIVE row per day (see buildArchive), so the
      daily / weekly / monthly / yearly graphs have history without storing thousands of orders.
    • Gross sales      = value of all non-cancelled orders
    • Refunds          = approved / completed return & refund requests
    • Commission       = COMMISSION_RATE × (gross − refunds)        (same 10% the seller wallet uses)
    • Seller earnings  = gross − refunds − commission
    • Courier payouts  = COURIER_RATE × delivered orders            (same ₹40 the delivery wallet uses)
    • Net platform     = commission − courier payouts
*/

export const COMMISSION_RATE = 0.1;
export const COURIER_RATE = 40;
export const SETTLEMENT_DAYS = 7;
export const LEDGER_DAYS = 45;
export const ARCHIVE_DAYS = 3 * 365;
export const DAY = 864e5;

// small repeatable random numbers
export function rng(seed) {
  // mulberry32: small, fast, and nearby seeds give unrelated sequences
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const iso = (t) => new Date(t).toISOString();
export const dayKey = (t) => {
  const d = new Date(t);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
const startOfDay = (t) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/* ---------------- places ---------------- */
export const AREAS = [
  { area: "Gariahat", city: "Kolkata", pincode: "700029" },
  { area: "Ballygunge", city: "Kolkata", pincode: "700019" },
  { area: "Bhowanipore", city: "Kolkata", pincode: "700025" },
  { area: "Garia", city: "Kolkata", pincode: "700150" },
  { area: "Salt Lake", city: "Kolkata", pincode: "700091" },
  { area: "New Town", city: "Kolkata", pincode: "700156" },
  { area: "Park Street", city: "Kolkata", pincode: "700016" },
  { area: "Behala", city: "Kolkata", pincode: "700034" },
  { area: "Dum Dum", city: "Kolkata", pincode: "700028" },
  { area: "Jadavpur", city: "Kolkata", pincode: "700032" },
  { area: "Indiranagar", city: "Bengaluru", pincode: "560038" },
  { area: "Koramangala", city: "Bengaluru", pincode: "560034" },
  { area: "Whitefield", city: "Bengaluru", pincode: "560066" },
  { area: "Jayanagar", city: "Bengaluru", pincode: "560041" },
  { area: "Bandra West", city: "Mumbai", pincode: "400050" },
  { area: "Powai", city: "Mumbai", pincode: "400076" },
  { area: "Andheri West", city: "Mumbai", pincode: "400058" },
  { area: "Saket", city: "Delhi", pincode: "110017" },
  { area: "Lajpat Nagar", city: "Delhi", pincode: "110024" },
];
export const areaOf = (pin) => AREAS.find((a) => a.pincode === pin) || { area: "—", city: "—", pincode: pin };

/* ---------------- catalogue ---------------- */
export const SEED_CATEGORIES = [
  ["electronics", "Electronics", "📱", [["Mobiles", 42], ["Laptops", 18], ["Audio", 36], ["Wearables", 21], ["Chargers & Cables", 54]]],
  ["fashion", "Fashion", "👗", [["Men's Clothing", 88], ["Women's Clothing", 124], ["Ethnic Wear", 67], ["Footwear", 49], ["Bags & Accessories", 31]]],
  ["home-decor", "Home Décor", "🏺", [["Wall Art", 22], ["Lighting", 19], ["Furnishings", 40], ["Planters", 17], ["Kitchen & Dining", 58]]],
  ["beauty", "Beauty", "💄", [["Skincare", 46], ["Makeup", 38], ["Haircare", 27], ["Fragrances", 14]]],
  ["groceries", "Groceries", "🥦", [["Fruits & Vegetables", 64], ["Staples", 71], ["Snacks", 52], ["Beverages", 33], ["Dairy & Bakery", 29]]],
  ["books", "Books", "📚", [["Fiction", 61], ["Academic", 44], ["Children's", 26]]],
  ["sports", "Sports & Fitness", "🏏", [["Cricket", 18], ["Yoga & Fitness", 23], ["Outdoor", 12]]],
  ["toys", "Toys & Games", "🧸", [["Building Sets", 15], ["Soft Toys", 20], ["Board Games", 11]]],
].map(([id, name, icon, subs], i) => ({
  id,
  name,
  icon,
  description: "",
  createdAt: null, // filled in by buildSeed
  order: i,
  subcategories: subs.map(([s, n], j) => ({ id: id + "-" + (j + 1), name: s, products: n })),
}));

const PRODUCTS = {
  electronics: [["Smartphone 128 GB", 17999, 0.5], ["Wireless Headphones", 2499, 3], ["Smart Watch", 3299, 2], ["Power Bank 20000 mAh", 1499, 3], ["Bluetooth Speaker", 1899, 2], ["USB-C Fast Charger", 799, 4], ["Laptop 14\" 8 GB RAM", 42990, 0.08]],
  fashion: [["Cotton T-Shirt", 499, 4], ["Denim Jacket", 1799, 2], ["Printed Kurti", 899, 3], ["Cotton Saree", 1299, 2], ["Running Shoes", 1999, 2], ["Leather Sandals", 999, 2], ["Silk Dupatta", 749, 2]],
  "home-decor": [["Non-stick Pan", 749, 3], ["Table Lamp", 599, 2], ["Terracotta Planter", 449, 3], ["Cotton Bedsheet Set", 1199, 2], ["Wall Clock", 899, 2], ["Ceramic Dinner Set", 2499, 1]],
  beauty: [["Face Moisturiser", 349, 4], ["Lipstick Set", 599, 3], ["Herbal Shampoo", 299, 3], ["Sunscreen SPF 50", 449, 3], ["Eau de Parfum", 1299, 1]],
  groceries: [["Fresh Broccoli (500 g)", 79, 4], ["Kashmiri Apples (1 kg)", 189, 4], ["Basmati Rice (5 kg)", 649, 3], ["Assam Tea (500 g)", 289, 3], ["Mustard Oil (1 L)", 219, 3], ["Mixed Dry Fruits (1 kg)", 899, 1]],
  books: [["Bestselling Novel", 299, 3], ["Exam Prep Guide", 450, 2], ["Children's Story Set", 599, 2]],
  sports: [["Yoga Mat", 699, 3], ["Cricket Bat", 1499, 2], ["Football", 799, 2], ["Dumbbell Set", 1999, 1]],
  toys: [["Building Blocks Set", 899, 2], ["Plush Teddy Bear", 549, 2], ["Family Board Game", 699, 2]],
};
const weighted = (rand, list) => {
  const total = list.reduce((s, x) => s + x[2], 0);
  let r = rand() * total;
  for (const x of list) if ((r -= x[2]) <= 0) return x;
  return list[0];
};

/* ---------------- people ---------------- */
// [name, business, email, phone, pincode, categories, daysAgo, status, note]
const SELLERS = [
  ["Suresh Agarwal", "Green Basket Traders", "hello@greenbasket.example", "9830012345", "700029", ["groceries", "electronics"], 520, "ACTIVE"],
  ["Meenakshi Iyer", "Everyday Essentials", "care@everyday.example", "9820145566", "400050", ["home-decor", "beauty"], 610, "ACTIVE"],
  ["Farhan Qureshi", "Qureshi Electronics Hub", "farhan@qeh.example", "9831177002", "700016", ["electronics"], 480, "ACTIVE"],
  ["Lavanya Reddy", "Lavanya Handlooms", "lavanya@handlooms.example", "9845012233", "560034", ["fashion"], 455, "ACTIVE"],
  ["Gurpreet Singh", "Punjab Sports Co.", "sales@punjabsports.example", "9811023344", "110024", ["sports"], 400, "ACTIVE"],
  ["Ritika Bose", "Bose Book Depot", "ritika@bosebooks.example", "9830556677", "700019", ["books"], 380, "ACTIVE"],
  ["Arjun Malhotra", "UrbanThread Apparel", "arjun@urbanthread.example", "9867034455", "400058", ["fashion"], 350, "ACTIVE"],
  ["Deepa Nambiar", "Kerala Naturals", "deepa@keralanaturals.example", "9880045512", "560038", ["beauty"], 300, "ACTIVE"],
  ["Imran Sheikh", "Sheikh Home Décor", "imran@sheikhdecor.example", "9831299001", "700091", ["home-decor"], 260, "ACTIVE"],
  ["Kavya Menon", "Little Sprouts Toys", "kavya@littlesprouts.example", "9886612003", "560066", ["toys", "books"], 220, "ACTIVE"],
  ["Rohan Kapoor", "Kapoor Footwear", "rohan@kapoorfootwear.example", "9810055678", "110017", ["fashion"], 190, "ACTIVE"],
  ["Neha Agarwal", "FreshFarm Organics", "neha@freshfarm.example", "9830788123", "700156", ["groceries"], 150, "ACTIVE"],
  ["Siddharth Rao", "Gadget Galaxy", "sid@gadgetgalaxy.example", "9845567890", "560041", ["electronics"], 120, "ACTIVE"],
  ["Pooja Sharma", "Glow & Co. Beauty", "pooja@glowco.example", "9820099887", "400076", ["beauty"], 90, "ACTIVE"],
  ["Ankit Jain", "Jain Kitchenware", "ankit@jainkitchen.example", "9811144556", "110024", ["home-decor"], 60, "ACTIVE"],
  ["Vivek Tiwari", "QuickDeals Mart", "vivek@quickdeals.example", "9810877665", "110017", ["electronics", "fashion"], 330, "BLOCKED", "Repeated counterfeit-product complaints"],
  ["Sunita Pal", "Pal Fashion House", "sunita@palfashion.example", "9830233445", "700034", ["fashion"], 210, "BLOCKED", "GST registration documents expired"],
  ["Manoj Kumar", "MK Mobile Accessories", "manoj@mkmobile.example", "9831455667", "700028", ["electronics"], 25, "REJECTED", "Incomplete KYC — PAN and bank proof missing"],
  ["Aditi Banerjee", "Aditi's Terracotta Studio", "aditi@terracotta.example", "9830611224", "700032", ["home-decor"], 1.2, "PENDING"],
  ["Rahul Verma", "Verma Electronics", "rahul@vermaelec.example", "9811866771", "110017", ["electronics"], 2.4, "PENDING"],
  ["Shreya Ghosh", "Shreya's Bakehouse", "shreya@bakehouse.example", "9830900112", "700019", ["groceries"], 0.25, "PENDING"],
  ["Karthik Subramanian", "Silk Route Emporium", "karthik@silkroute.example", "9884012345", "560041", ["fashion"], 3.1, "PENDING"],
  ["Nisha Patel", "Patel Spice Traders", "nisha@patelspice.example", "9820567123", "400058", ["groceries"], 4.3, "PENDING"],
  ["Yusuf Ali", "Ali Leather Works", "yusuf@aliLeather.example", "9831022998", "700016", ["fashion"], 6.2, "PENDING"],
];

// [name, email, phone, vehicle, pincodes, availability, status, daysAgo]
const COURIERS = [
  ["Amit Kumar", "amit.courier@vyapari.example", "9876543210", "Hero Splendor · WB-02-4412", ["700029", "700150", "700019", "700025"], "AVAILABLE", "ACTIVE", 420],
  ["Vikram Das", "vikram.das@vyapari.example", "9123456789", "Electric Scooter · WB-04-1192", ["700091", "700156", "700028"], "ON_DELIVERY", "ACTIVE", 395],
  ["Priya Nair", "priya.nair@vyapari.example", "9900122334", "Honda Activa · WB-06-7781", ["700016", "700025", "700019", "700029"], "AVAILABLE", "ACTIVE", 360],
  ["Sourav Mondal", "sourav.m@vyapari.example", "9831620045", "TVS Jupiter · WB-08-3321", ["700034", "700032", "700150"], "AVAILABLE", "ACTIVE", 300],
  ["Ravi Shankar", "ravi.s@vyapari.example", "9845511220", "Bajaj Pulsar · KA-03-8812", ["560038", "560034", "560041"], "ON_DELIVERY", "ACTIVE", 340],
  ["Manjunath Gowda", "manju.g@vyapari.example", "9886022110", "Ather 450X · KA-05-2219", ["560066", "560038"], "AVAILABLE", "ACTIVE", 210],
  ["Sneha Kulkarni", "sneha.k@vyapari.example", "9820311445", "Honda Dio · MH-02-7765", ["400050", "400058", "400076"], "AVAILABLE", "ACTIVE", 280],
  ["Javed Shaikh", "javed.s@vyapari.example", "9867122334", "Hero Glamour · MH-04-1902", ["400076", "400058", "400050"], "OFF_DUTY", "ACTIVE", 240],
  ["Harpreet Kaur", "harpreet.k@vyapari.example", "9811233456", "Ola S1 · DL-07-4430", ["110017", "110024"], "AVAILABLE", "ACTIVE", 260],
  ["Deepak Yadav", "deepak.y@vyapari.example", "9810455223", "Splendor Plus · DL-03-9981", ["110024", "110017"], "ON_DELIVERY", "ACTIVE", 150],
  ["Tanmoy Saha", "tanmoy.s@vyapari.example", "9830455117", "Bicycle (e-assist)", ["700091", "700028"], "OFF_DUTY", "INACTIVE", 330, "Licence renewal pending"],
  ["Arif Hossain", "arif.h@vyapari.example", "9831788901", "Suzuki Access · WB-12-6631", ["700156", "700091"], "AVAILABLE", "ACTIVE", 18],
];

const FIRST = ["Aarav", "Ishaan", "Kabir", "Vihaan", "Reyansh", "Arnav", "Dhruv", "Aditya", "Rudra", "Shaurya", "Saanvi", "Diya", "Myra", "Anika", "Kiara", "Ira", "Tara", "Zara", "Riya", "Navya", "Ayaan", "Advik", "Rehan", "Om", "Krish", "Pari", "Avni", "Mahi", "Ahana", "Prisha", "Neel", "Samar", "Tanvi", "Ritwik", "Debolina", "Sayan", "Ishita", "Arpita", "Soham", "Moumita"];
const LAST = ["Sharma", "Banerjee", "Chatterjee", "Mukherjee", "Iyer", "Reddy", "Nair", "Menon", "Gupta", "Singh", "Kapoor", "Mehta", "Joshi", "Patel", "Das", "Roy", "Bose", "Sen", "Khan", "Fernandes", "Pillai", "Kulkarni", "Deshpande", "Saxena", "Verma", "Chowdhury", "Ghosh", "Dutta", "Rao", "Bhat"];
const FIXED_CUSTOMERS = [
  ["Aanya Sharma", "aanya@example.com", "9876543210", "560038"],
  ["Anita Rao", "anita.rao@example.com", "9845098765", "700029"],
  ["Karan Mehta", "karan.mehta@example.com", "9820012233", "400050"],
  ["Sana Iqbal", "sana.iqbal@example.com", "9831244551", "700016"],
  ["Rohit Das", "rohit.das@example.com", "9830677889", "700034"],
  ["Meera Joshi", "meera.joshi@example.com", "9811567432", "110017"],
  ["Dev Patel", "dev.patel@example.com", "9867788990", "400076"],
  ["Isha Roy", "isha.roy@example.com", "9830123987", "700091"],
  ["Nikhil Jain", "nikhil.jain@example.com", "9810234876", "110024"],
];
const CUSTOMER_COUNT = 186;

const ADMINS = [
  ["Ananya Ghosh", "ananya.ghosh@vyapari.example", "Super Admin", 640, "ACTIVE", "9830011001"],
  ["Rahul Sen", "rahul.sen@vyapari.example", "Operations Manager", 590, "ACTIVE", "9830011002"],
  ["Fatima Khan", "fatima.khan@vyapari.example", "Support Lead", 410, "ACTIVE", "9830011003"],
  ["Vikash Gupta", "vikash.gupta@vyapari.example", "Finance Admin", 380, "ACTIVE", "9830011004"],
  ["Sneha Mukherjee", "sneha.m@vyapari.example", "Catalog Manager", 200, "ACTIVE", "9830011005"],
  ["Arnab Dutta", "arnab.dutta@vyapari.example", "Operations Manager", 520, "DELETED", "9830011006"],
];
export const ADMIN_ROLES = ["Super Admin", "Operations Manager", "Support Lead", "Finance Admin", "Catalog Manager"];
export const CURRENT_ADMIN_ID = "ADM-001";

/* ---------------- tickets ---------------- */
// [subject, description, priority, status, topic, needsOrder]
const CUSTOMER_TICKETS = [
  ["Received a damaged dinner set", "Two plates in the ceramic dinner set arrived cracked. The outer box was dented. I would like a replacement.", "HIGH", "OPEN", "Damaged product", true],
  ["Refund not credited after cancellation", "I cancelled my order five days ago but the UPI refund has still not reached my account.", "URGENT", "IN_PROGRESS", "Payment & refund", true],
  ["Wrong size delivered", "I ordered running shoes in size 9 but received size 7. Please arrange an exchange.", "MEDIUM", "OPEN", "Wrong item", true],
  ["Delivery partner asked for extra cash", "The courier asked for ₹50 extra on a prepaid order. This should not happen.", "URGENT", "OPEN", "Delivery issue", true],
  ["Unable to apply coupon at checkout", "The festive coupon shows as invalid even though my cart is above the minimum value.", "LOW", "RESOLVED", "Account & app", false],
  ["Order stuck in processing", "My order has shown Processing for three days with no update.", "MEDIUM", "IN_PROGRESS", "Delivery issue", true],
  ["Missing item in grocery order", "The basmati rice from my grocery order was missing from the bag.", "HIGH", "RESOLVED", "Missing item", true],
  ["How do I change my delivery address?", "I moved recently and want to update the default address on my account.", "LOW", "CLOSED", "Account & app", false],
  ["Product looks used", "The smart watch strap has scratches and the box seal was broken.", "HIGH", "OPEN", "Damaged product", true],
  ["Charged twice for one order", "My card statement shows two debits for the same order.", "URGENT", "RESOLVED", "Payment & refund", true],
  ["Late delivery for gift order", "The order was meant for a birthday and arrived two days late.", "MEDIUM", "CLOSED", "Delivery issue", true],
  ["Cannot log in after password reset", "The reset link worked but the new password is not accepted.", "MEDIUM", "OPEN", "Account & app", false],
];
const SELLER_TICKETS = [
  ["Payout delayed for last settlement cycle", "My weekly settlement has not arrived even though all orders are marked delivered.", "HIGH", "IN_PROGRESS", "Payout"],
  ["Product listing rejected without reason", "Three of my listings were hidden from the store. Please tell me what needs to change.", "MEDIUM", "OPEN", "Listing"],
  ["Courier did not arrive for pickup", "Orders have been packed since morning but no delivery partner came to collect them.", "URGENT", "OPEN", "Pickup"],
  ["Need to update GST details", "Our GSTIN changed after re-registration. How do I update it on the shop profile?", "LOW", "RESOLVED", "Account"],
  ["Customer returned a different item", "A return came back with a different product inside the box.", "HIGH", "OPEN", "Returns"],
  ["Commission charged on cancelled order", "The wallet shows a platform fee deducted on an order the customer cancelled.", "MEDIUM", "RESOLVED", "Payout"],
  ["Bulk upload of products", "Is there a way to upload 200 products using a spreadsheet?", "LOW", "CLOSED", "Listing"],
  ["Low visibility of shop in search", "Our products are not appearing for relevant search terms.", "LOW", "IN_PROGRESS", "Listing"],
  ["Bank account verification failed", "The penny-drop verification failed although the details are correct.", "HIGH", "OPEN", "Account"],
];
const DELIVERY_TICKETS = [
  ["Customer not reachable at drop location", "Called the customer four times; the phone is switched off. Please advise.", "HIGH", "OPEN", "Customer not reachable", true],
  ["Incorrect address on order", "The building number does not exist on the street given in the address.", "MEDIUM", "IN_PROGRESS", "Wrong or incomplete address", true],
  ["COD amount mismatch", "The app shows a different COD amount than the invoice in the package.", "HIGH", "RESOLVED", "Payment / COD mismatch", true],
  ["Bike breakdown during delivery run", "Clutch cable broke near the market. Two orders are still with me.", "URGENT", "IN_PROGRESS", "Vehicle breakdown or fuel", true],
  ["Weekly earnings lower than expected", "Four delivered orders are missing from my earnings for last week.", "MEDIUM", "OPEN", "Payout or earnings", false],
  ["Seller kept me waiting for 40 minutes", "The pickup was delayed because the order had not been packed.", "LOW", "CLOSED", "Seller pickup problem", true],
  ["App crashes on OTP screen", "The app closes when I try to enter the delivery OTP.", "HIGH", "RESOLVED", "App problem", true],
  ["Request to add a new pincode", "I can also serve the neighbouring area and would like it added to my profile.", "LOW", "OPEN", "Other", false],
];

/* ---------------- returns & refunds ---------------- */
const RETURN_REASONS = [
  ["RETURN", "Size does not fit"],
  ["RETURN", "Product different from description"],
  ["RETURN", "Received damaged item"],
  ["REFUND", "Item missing from package"],
  ["REFUND", "Charged twice for the same order"],
  ["RETURN", "Defective — stopped working within a week"],
  ["REFUND", "Delivered after the promised date"],
  ["RETURN", "Wrong colour delivered"],
];

/* ---------------- builders ---------------- */
function buildSellers(now) {
  return SELLERS.map(([name, business, email, phone, pincode, cats, daysAgo, status, note], i) => {
    const rand = rng(900 + i * 31);
    const id = "SEL-" + String(101 + i);
    const registeredAt = iso(now - daysAgo * DAY);
    const a = areaOf(pincode);
    const approvedAt = status === "PENDING" || status === "REJECTED" ? null : iso(now - (daysAgo - 2) * DAY);
    const history = [{ at: registeredAt, text: "Registered as a seller" }];
    if (approvedAt) history.push({ at: approvedAt, text: "Approved by Ananya Ghosh" });
    if (status === "BLOCKED") history.push({ at: iso(now - Math.floor(daysAgo / 6) * DAY), text: "Blocked: " + note });
    if (status === "REJECTED") history.push({ at: iso(now - (daysAgo - 1) * DAY), text: "Rejected: " + note });
    return {
      id,
      name,
      business,
      email,
      phone: "+91 " + phone.slice(0, 5) + " " + phone.slice(5),
      city: a.city,
      pincode,
      categories: cats,
      gstin: "19" + business.replace(/[^A-Z]/gi, "").slice(0, 5).toUpperCase().padEnd(5, "X") + (1000 + i * 37) + "M1Z" + (i % 9),
      registeredAt,
      approvedAt,
      status,
      statusNote: note || "",
      rating: status === "PENDING" || status === "REJECTED" ? null : Math.round((3.8 + rand() * 1.1) * 10) / 10,
      products: status === "PENDING" || status === "REJECTED" ? 0 : 12 + Math.floor(rand() * 140),
      lastActiveAt: status === "BLOCKED" ? iso(now - (8 + Math.floor(rand() * 20)) * DAY) : iso(now - Math.floor(rand() * 30) * 3.6e6),
      history,
    };
  });
}

function buildCouriers(now) {
  return COURIERS.map(([name, email, phone, vehicle, pincodes, availability, status, daysAgo, note], i) => {
    const rand = rng(1300 + i * 17);
    return {
      id: "DLV-" + String(201 + i),
      name,
      email,
      phone: "+91 " + phone.slice(0, 5) + " " + phone.slice(5),
      vehicle,
      pincodes,
      city: areaOf(pincodes[0]).city,
      availability: status === "INACTIVE" ? "OFF_DUTY" : availability,
      status,
      statusNote: note || "",
      registeredAt: iso(now - daysAgo * DAY),
      rating: Math.round((4.1 + rand() * 0.85) * 10) / 10,
      lifetimeDeliveries: Math.floor(daysAgo * (1.4 + rand() * 1.2)),
      lastActiveAt: iso(now - (status === "INACTIVE" ? 12 * DAY : Math.floor(rand() * 20) * 6e5)),
    };
  });
}

function buildCustomers(now, coveredPins) {
  const rand = rng(77);
  const list = [];
  const used = new Set();
  const pins = AREAS.filter((a) => coveredPins.has(a.pincode)).map((a) => a.pincode);
  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    let name, email, phone, pincode;
    if (i < FIXED_CUSTOMERS.length) [name, email, phone, pincode] = FIXED_CUSTOMERS[i];
    else {
      do name = pick(rand, FIRST) + " " + pick(rand, LAST);
      while (used.has(name));
      email = name.toLowerCase().replace(" ", ".") + (rand() > 0.6 ? Math.floor(rand() * 90 + 10) : "") + "@" + pick(rand, ["gmail.com", "outlook.com", "yahoo.in", "example.com"]);
      phone = "9" + Math.floor(100000000 + rand() * 899999999);
      pincode = pick(rand, pins);
    }
    used.add(name);
    // more sign-ups recently: square the random number to bunch dates near "now"
    const daysAgo = i < FIXED_CUSTOMERS.length ? 200 + i * 41 : Math.floor(Math.pow(rand(), 1.6) * 1100);
    const r = rand();
    const status = r < 0.035 ? "SUSPENDED" : "ACTIVE";
    // demo activity: minutes since last seen
    const seenMin = status === "SUSPENDED" ? 60 * 24 * (20 + Math.floor(rand() * 60)) : r < 0.12 ? Math.floor(rand() * 12) : r < 0.45 ? 30 + Math.floor(rand() * 600) : 60 * 24 * (1 + Math.floor(rand() * 75));
    list.push({
      id: "CUS-" + String(5001 + i),
      name,
      email,
      phone: "+91 " + phone.slice(0, 5) + " " + phone.slice(5),
      pincode,
      city: areaOf(pincode).city,
      registeredAt: iso(now - daysAgo * DAY - Math.floor(rand() * 20) * 36e5),
      status,
      lastActiveAt: iso(now - seenMin * 6e4),
    });
  }
  return list;
}

function pickStatus(day, rand) {
  const r = rand();
  if (day === 0) return r < 0.38 ? "PENDING" : r < 0.72 ? "CONFIRMED" : "PROCESSING";
  if (day === 1) return r < 0.12 ? "CONFIRMED" : r < 0.4 ? "PROCESSING" : r < 0.82 ? "IN_TRANSIT" : r < 0.95 ? "DELIVERED" : "CANCELLED";
  if (day <= 3) return r < 0.3 ? "IN_TRANSIT" : r < 0.92 ? "DELIVERED" : "CANCELLED";
  return r < 0.935 ? "DELIVERED" : "CANCELLED";
}
const FLOW = ["PENDING", "CONFIRMED", "PROCESSING", "IN_TRANSIT", "DELIVERED"];

function buildOrders(now, sellers, customers, couriers) {
  const rand = rng(4242);
  const orders = [];
  const today = startOfDay(now);
  let seq = 20480;
  const liveSellers = sellers.filter((s) => s.status === "ACTIVE" || s.status === "BLOCKED");
  for (let day = LEDGER_DAYS - 1; day >= 0; day--) {
    const dow = new Date(today - day * DAY).getDay();
    const count = 5 + Math.floor(rand() * 5) + (dow === 0 || dow === 6 ? 3 : 0) + (day === 0 ? 4 : 0);
    for (let k = 0; k < count; k++) {
      // time of day: spread 8am–11pm, today only up to "now"
      const dayStart = today - day * DAY;
      const open = Math.min(dayStart + 8 * 36e5, now - 2 * 36e5); // shop hours start 8am
      const close = day === 0 ? now - 6e5 : dayStart + 23 * 36e5;
      const t = Math.max(dayStart, open) + Math.floor(rand() * Math.max(6e5, close - Math.max(dayStart, open)));
      const sellerPool = liveSellers.filter((s) => (s.status === "BLOCKED" ? day > 20 : true) && Date.parse(s.registeredAt) < t);
      const seller = pick(rand, sellerPool);
      const cat = pick(rand, seller.categories);
      const customerPool = customers.filter((c) => Date.parse(c.registeredAt) < t);
      const customer = pick(rand, customerPool);
      const lines = [];
      const n = 1 + Math.floor(rand() * rand() * 3);
      for (let j = 0; j < n; j++) {
        const [name, price] = weighted(rand, PRODUCTS[cat]);
        const existing = lines.find((l) => l.name === name);
        if (existing) existing.qty++;
        else lines.push({ name, category: cat, qty: 1 + Math.floor(rand() * rand() * 3), price });
      }
      const amount = lines.reduce((s, l) => s + l.qty * l.price, 0);
      const picked = pickStatus(day, rand);
      const age = (now - t) / 36e5; // today's orders move along the pipeline by age
      const status = day === 0 ? (age < 2.5 ? "PENDING" : age < 5 ? "CONFIRMED" : "PROCESSING") : picked;
      const method = rand() < 0.42 ? "UPI" : rand() < 0.45 ? "Card" : "COD";
      const inFlight = status === "IN_TRANSIT" || status === "PROCESSING";
      const matches = couriers.filter((c) => c.status === "ACTIVE" && c.pincodes.includes(customer.pincode) && !(inFlight && c.availability === "OFF_DUTY"));
      const needsCourier = status === "IN_TRANSIT" || status === "DELIVERED" || (status === "PROCESSING" && rand() < 0.35);
      const courier = needsCourier && matches.length ? pick(rand, matches) : null;
      // timeline of status changes up to the current one
      const timeline = [];
      if (status === "CANCELLED") {
        timeline.push({ status: "PENDING", at: iso(t) });
        if (rand() < 0.5) timeline.push({ status: "CONFIRMED", at: iso(t + 2e6) });
        timeline.push({ status: "CANCELLED", at: iso(t + 6e6), note: pick(rand, ["Cancelled by customer", "Seller could not fulfil", "Payment not completed"]) });
      } else {
        const upto = FLOW.indexOf(status);
        const gaps = [0, 0.4, 3, 18, 30];
        let prev = t - 6e4;
        for (let s = 0; s <= upto; s++) {
          const at = Math.max(prev + 6e4, Math.min(now - (upto - s) * 6e5, t + gaps[s] * 36e5 * (0.85 + rand() * 0.3)));
          timeline.push({ status: FLOW[s], at: iso(at) });
          prev = at;
        }
        if (courier) {
          const idx = Math.min(timeline.length - 1, 2);
          timeline.splice(idx + 1, 0, { status: "ASSIGNED", at: iso(Date.parse(timeline[idx].at) + 9e5), note: "Assigned to " + courier.name });
        }
      }
      let payment = method === "COD" ? (status === "DELIVERED" ? "PAID" : "COD_DUE") : "PAID";
      if (status === "CANCELLED") payment = method === "COD" ? "NOT_CHARGED" : "REFUNDED";
      orders.push({
        id: "VYP-" + ++seq,
        createdAt: iso(t),
        customerId: customer.id,
        customerName: customer.name,
        sellerId: seller.id,
        sellerName: seller.business,
        items: lines,
        amount,
        method,
        payment,
        status,
        pincode: customer.pincode,
        address: areaOf(customer.pincode).area + ", " + areaOf(customer.pincode).city + " " + customer.pincode,
        deliveryPersonId: courier ? courier.id : null,
        deliveredAt: status === "DELIVERED" ? timeline[timeline.length - 1].at : null,
        timeline: timeline.sort((a, b) => a.at.localeCompare(b.at)),
      });
    }
  }
  // the two newest orders are always fresh, so the pipeline never looks empty
  orders.slice(-2).forEach((o) => {
    o.status = "PENDING";
    o.deliveryPersonId = null;
    o.deliveredAt = null;
    o.payment = o.method === "COD" ? "COD_DUE" : "PAID";
    o.timeline = [o.timeline[0]];
  });
  return orders.reverse(); // newest first
}

function buildRefunds(now, orders) {
  const rand = rng(515);
  const delivered = orders.filter((o) => o.status === "DELIVERED" && o.payment === "PAID");
  const plan = ["PENDING", "PENDING", "PENDING", "PENDING", "PENDING", "PENDING", "UNDER_REVIEW", "UNDER_REVIEW", "UNDER_REVIEW", "APPROVED", "APPROVED", "APPROVED", "COMPLETED", "COMPLETED", "COMPLETED", "REJECTED", "REJECTED", "COMPLETED"];
  const used = new Set();
  return plan.map((status, i) => {
    let o;
    do o = delivered[Math.floor(Math.pow(rand(), 1.3) * Math.min(delivered.length, 160))];
    while (used.has(o.id));
    used.add(o.id);
    const [type, reason] = RETURN_REASONS[Math.floor(rand() * RETURN_REASONS.length)];
    const line = o.items[0];
    const amount = type === "REFUND" && reason.includes("missing") ? line.price : o.items.length > 1 && rand() < 0.5 ? line.price * line.qty : o.amount;
    const requestedAt = Math.max(Date.parse(o.deliveredAt) + 36e5, Math.min(now - (i < 6 ? i * 3 + 1 : 6 + i * 9) * 36e5, Date.parse(o.deliveredAt) + (6 + rand() * 60) * 36e5));
    const decidedAt = ["APPROVED", "COMPLETED", "REJECTED"].includes(status) ? iso(Math.min(now - 36e5, requestedAt + (10 + rand() * 30) * 36e5)) : null;
    return {
      id: "RR-" + String(3301 + i),
      type,
      orderId: o.id,
      customerId: o.customerId,
      customerName: o.customerName,
      sellerId: o.sellerId,
      sellerName: o.sellerName,
      item: line.name + (o.items.length > 1 && amount === o.amount ? " + " + (o.items.length - 1) + " more" : ""),
      amount,
      reason,
      details: type === "RETURN" ? "Customer has the item in its original packaging and requested a doorstep pickup." : "Customer requested a refund without returning goods.",
      requestedAt: iso(requestedAt),
      status,
      decidedAt,
      decidedBy: decidedAt ? pick(rand, ["Rahul Sen", "Fatima Khan", "Vikash Gupta"]) : null,
      adminNote: status === "REJECTED" ? "Photos show the item was used; outside the return policy." : status === "UNDER_REVIEW" ? "Waiting for seller's response." : "",
    };
  });
}

function buildTickets(now, customers, sellers, couriers, orders) {
  const rand = rng(8080);
  const tickets = [];
  let n = 4101;
  const addNotes = (status, created) => {
    const notes = [];
    if (status !== "OPEN") notes.push({ at: iso(created + 3 * 36e5), by: "Fatima Khan", text: "Looked into this and contacted the people involved." });
    if (status === "RESOLVED" || status === "CLOSED") notes.push({ at: iso(created + 20 * 36e5), by: "Fatima Khan", text: "Issue fixed. Informed the user." });
    return notes;
  };
  const make = (userType, rows, people, orderOf) =>
    rows.forEach(([subject, description, priority, status, topic, needsOrder], i) => {
      const person = people[Math.floor(rand() * Math.min(people.length, 40))];
      const created = now - (i * 0.9 + rand() * 1.5) * DAY - Math.floor(rand() * 10) * 36e5;
      const order = needsOrder ? orderOf(person) : null;
      tickets.push({
        id: "TCK-" + n++,
        userType,
        raisedById: person.id,
        raisedBy: userType === "seller" ? person.name + " · " + person.business : person.name,
        subject,
        description,
        topic,
        orderId: order ? order.id : "",
        priority,
        status,
        createdAt: iso(created),
        updatedAt: iso(status === "OPEN" ? created : created + (status === "IN_PROGRESS" ? 3 : 20) * 36e5),
        resolvedAt: status === "RESOLVED" || status === "CLOSED" ? iso(created + 20 * 36e5) : null,
        notes: addNotes(status, created),
        source: "seed",
      });
    });
  const activeCustomers = customers.filter((c) => c.status === "ACTIVE");
  make("customer", CUSTOMER_TICKETS, activeCustomers, (c) => orders.find((o) => o.customerId === c.id) || pick(rand, orders));
  make("seller", SELLER_TICKETS.map((r) => [...r, r[4] === "Pickup" || r[4] === "Returns"]), sellers.filter((s) => s.status === "ACTIVE"), (s) => orders.find((o) => o.sellerId === s.id) || pick(rand, orders));
  make("delivery", DELIVERY_TICKETS, couriers.filter((c) => c.status === "ACTIVE"), (c) => orders.find((o) => o.deliveryPersonId === c.id) || pick(rand, orders));
  return tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function buildAdmins(now) {
  return ADMINS.map(([name, email, role, daysAgo, status, phone], i) => ({
    id: "ADM-" + String(i + 1).padStart(3, "0"),
    name,
    email,
    phone: "+91 " + phone.slice(0, 5) + " " + phone.slice(5),
    role,
    addedAt: iso(now - daysAgo * DAY),
    addedBy: i === 0 ? "System" : "Ananya Ghosh",
    status,
    deletedAt: status === "DELETED" ? iso(now - 75 * DAY) : null,
    deletedReason: status === "DELETED" ? "Left the organisation" : "",
    lastLoginAt: status === "DELETED" ? iso(now - 76 * DAY) : iso(now - i * 5.3 * 36e5),
  }));
}

export function buildSeed(now = Date.now()) {
  const sellers = buildSellers(now);
  const delivery = buildCouriers(now);
  const covered = new Set(delivery.filter((c) => c.status === "ACTIVE").flatMap((c) => c.pincodes));
  const customers = buildCustomers(now, covered);
  const orders = buildOrders(now, sellers, customers, delivery);
  const refunds = buildRefunds(now, orders);
  // orders with an approved / completed refund show it in their payment status
  refunds.forEach((r) => {
    if (r.status === "APPROVED" || r.status === "COMPLETED") {
      const o = orders.find((x) => x.id === r.orderId);
      o.payment = r.amount >= o.amount ? "REFUNDED" : "PARTIAL_REFUND";
    }
  });
  // last-seen can never be before sign-up or before the person's latest order
  const lastOrder = new Map();
  for (const o of orders) if (!lastOrder.has(o.customerId)) lastOrder.set(o.customerId, o.createdAt);
  const pr = rng(2024);
  customers.forEach((c) => {
    const floor = Math.max(Date.parse(c.registeredAt) + (5 + pr() * 40) * 6e4, lastOrder.has(c.id) ? Date.parse(lastOrder.get(c.id)) : 0);
    if (Date.parse(c.lastActiveAt) < floor) c.lastActiveAt = iso(Math.min(now - 6e4, floor));
  });
  // couriers on duty have the app open; a few sellers are in their dashboard right now
  delivery.forEach((d) => {
    if (d.status === "ACTIVE" && d.availability !== "OFF_DUTY") d.lastActiveAt = iso(now - Math.floor(pr() * 14) * 6e4);
  });
  sellers.forEach((s) => {
    if (s.status === "ACTIVE" && pr() < 0.35) s.lastActiveAt = iso(now - Math.floor(pr() * 12) * 6e4);
  });
  const tickets = buildTickets(now, customers, sellers, delivery, orders);
  const categories = SEED_CATEGORIES.map((c, i) => ({ ...c, createdAt: iso(now - (700 - i * 40) * DAY) }));
  return {
    version: 1,
    seededAt: now,
    sellers,
    customers,
    delivery,
    orders,
    refunds,
    tickets,
    categories,
    admins: buildAdmins(now),
    log: [],
    importedTickets: {},
  };
}

/*
  Settled history before the ledger: one row per day.
  Same shape as the ledger rows built in finance.js: { date, orders, cancelled, delivered, gross, refunds }.
  Generated from fixed seeds relative to the ledger start, so it never changes between visits.
*/
export function buildArchive(seededAt) {
  const rand = rng(31337);
  const ledgerStart = startOfDay(seededAt) - (LEDGER_DAYS - 1) * DAY;
  const rows = [];
  for (let d = ARCHIVE_DAYS; d >= 1; d--) {
    const t = ledgerStart - d * DAY;
    const date = new Date(t);
    const progress = 1 - d / ARCHIVE_DAYS; // 0 = oldest, 1 = just before the ledger
    const growth = 0.22 + 0.78 * Math.pow(progress, 1.25);
    const dow = date.getDay();
    const weekend = dow === 0 || dow === 6 ? 1.3 : 1;
    const m = date.getMonth();
    const festive = m === 9 || m === 10 ? 1.35 : m === 11 || m === 0 ? 1.12 : m === 6 ? 0.9 : 1;
    const noise = 0.75 + rand() * 0.5;
    const orders = Math.max(1, Math.round(7.3 * growth * weekend * festive * noise));
    const cancelled = Math.round(orders * (0.04 + rand() * 0.05));
    const aov = 1650 + rand() * 900; // matches the average order value of the live ledger
    const gross = Math.round((orders - cancelled) * aov);
    const refunds = rand() < 0.22 ? Math.round(aov * (0.4 + rand() * 0.8)) : 0;
    rows.push({ date: dayKey(t), t, orders, cancelled, delivered: orders - cancelled, gross, refunds });
  }
  return rows;
}

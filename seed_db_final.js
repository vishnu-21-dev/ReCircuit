const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, doc, setDoc } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyDih5PI--od8rbqBtKzOzJGxpV5FPnBAZk",
    authDomain: "ideathon2026-ab2cf.firebaseapp.com",
    projectId: "ideathon2026-ab2cf",
    storageBucket: "ideathon2026-ab2cf.firebasestorage.app",
    messagingSenderId: "1046969850319",
    appId: "1:1046969850319:web:f564fec5c5fa51d20c1aba"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const shops = [
  { id: "shop_101", name: 'TechSpares', rating: 4.8, tradesCompleted: 412, address: 'Koramangala, Bangalore', contact: '9876543210', verified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "shop_102", name: 'GreenFix Electronics', rating: 4.7, tradesCompleted: 134, address: 'Indiranagar, Bangalore', contact: '9876543211', verified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "shop_103", name: 'Mobile Parts Hub', rating: 4.2, tradesCompleted: 89, address: 'Jayanagar, Bangalore', contact: '9876543212', verified: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const listings = [
  { category: 'Smartphones', brand: 'Apple', model: 'iPhone 13', part: 'Screen', grade: 'A', condition: 'Original Pulled', warranty: '3 Months', price: 4500, quantity: 5, shopId: 'shop_101', status: 'available', shopName: 'TechSpares', rating: 4.8, trades: 412, distance: '2.1 km', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { category: 'Smartphones', brand: 'Samsung', model: 'S23', part: 'Battery', grade: 'A', condition: 'New Open Box', warranty: '6 Months', price: 1500, quantity: 10, shopId: 'shop_102', status: 'available', shopName: 'GreenFix Electronics', rating: 4.7, trades: 134, distance: '4.5 km', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { category: 'Laptops', brand: 'Lenovo', model: 'Legion 5', part: 'Keyboard', grade: 'B', condition: 'Third-party OEM', warranty: '1 Month', price: 2500, quantity: 2, shopId: 'shop_103', status: 'available', shopName: 'Mobile Parts Hub', rating: 4.2, trades: 89, distance: '1.2 km', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { category: 'Smartphones', brand: 'Apple', model: 'iPhone 13', part: 'Battery', grade: 'A', condition: 'New Open Box', warranty: '6 Months', price: 2000, quantity: 3, shopId: 'shop_101', status: 'available', shopName: 'TechSpares', rating: 4.8, trades: 412, distance: '2.1 km', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

async function seed() {
    try {
        console.log("Seeding Shops...");
        for (const shop of shops) {
            const { id, ...shopData } = shop;
            await setDoc(doc(db, "shops", id), shopData);
        }
        console.log("Seeding Listings...");
        for (const listing of listings) {
            await addDoc(collection(db, "listings"), listing);
        }
        console.log("Database seeded successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
}

seed();

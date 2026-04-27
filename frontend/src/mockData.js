// Mock data for hackathon demo
export const mockListings = [
  {
    id: '1',
    brand: 'Apple',
    model: 'iPhone 11',
    part: 'Screen',
    grade: 'A',
    price: 5000,
    sellerId: 'shop1',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    brand: 'Samsung',
    model: 'Galaxy S20',
    part: 'Battery',
    grade: 'B',
    price: 2000,
    sellerId: 'shop2',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

export const mockRequests = [
  {
    id: '1',
    category: 'Mobile',
    brand: 'Apple',
    model: 'iPhone 12',
    part: 'Camera',
    grade: 'A',
    priceOffered: 3000,
    buyerId: 'user1',
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

export const mockShops = [
  {
    id: 'shop1',
    name: 'Tech Repair Shop',
    uid: 'shop1',
    status: 'approved'
  }
];

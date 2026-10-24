import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { firestoreDb } from '../config/firebase';

export interface FirestoreProduct {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  pricePerEgg: number;
  description?: string;
  imageUrl?: string;
  status: 'ACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
}

export interface FirestoreOrder {
  id: string;
  customerId: string;
  customerPhone: string;
  items: Array<{
    productId: string;
    productName: string;
    packType: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  deliveryAddress: any;
  paymentMethod: 'CASH_ON_DELIVERY' | 'UPI_ON_DELIVERY' | 'ONLINE';
  paymentStatus?: 'PENDING' | 'PAID';
  createdAt?: any;
}

export const firestoreService = {
  isAvailable(): boolean {
    return !!firestoreDb;
  },

  /**
   * Listen to real-time updates for a customer's active orders
   */
  subscribeToCustomerOrders(
    customerId: string, 
    callback: (orders: FirestoreOrder[]) => void
  ): (() => void) | null {
    if (!firestoreDb) return null;

    const ordersRef = collection(firestoreDb, 'orders');
    const q = query(
      ordersRef, 
      where('customerId', '==', customerId), 
      orderBy('createdAt', 'desc'), 
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const orders: FirestoreOrder[] = [];
      snapshot.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      callback(orders);
    }, (error) => {
      console.error('[Firestore] Order subscription error:', error);
    });
  },

  /**
   * Listen to real-time updates for a single order's status (Live Doorstep Tracking)
   */
  subscribeToOrderTracking(
    orderId: string, 
    callback: (order: FirestoreOrder | null) => void
  ): (() => void) | null {
    if (!firestoreDb) return null;

    const orderRef = doc(firestoreDb, 'orders', orderId);
    return onSnapshot(orderRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...(docSnap.data() as any) });
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`[Firestore] Order ${orderId} tracking error:`, error);
    });
  },

  /**
   * Fetch or sync catalog from Firestore
   */
  async getCatalog(): Promise<FirestoreProduct[]> {
    if (!firestoreDb) return [];

    const productsRef = collection(firestoreDb, 'products');
    const snapshot = await getDocs(productsRef);
    const products: FirestoreProduct[] = [];
    snapshot.forEach((docSnap) => {
      products.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    return products;
  },

  /**
   * Listen to live catalog stock changes
   */
  subscribeToCatalog(callback: (products: FirestoreProduct[]) => void): (() => void) | null {
    if (!firestoreDb) return null;

    const productsRef = collection(firestoreDb, 'products');
    return onSnapshot(productsRef, (snapshot) => {
      const products: FirestoreProduct[] = [];
      snapshot.forEach((docSnap) => {
        products.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      callback(products);
    });
  },

  /**
   * Save a customer order in Firestore
   */
  async createOrder(orderData: Omit<FirestoreOrder, 'id'>): Promise<string> {
    if (!firestoreDb) throw new Error('Firestore is not configured');

    const ordersRef = collection(firestoreDb, 'orders');
    const newDocRef = doc(ordersRef);
    await setDoc(newDocRef, {
      ...orderData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newDocRef.id;
  },
};

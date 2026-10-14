import { Depot } from '../models/Depot';

export class RoutingService {
  /**
   * Find servicing depot hub by delivery pincode
   */
  static async resolveDepotByPincode(pincode: string) {
    const depot = await Depot.findOne({
      servicedPincodes: pincode,
      isActive: true,
    });

    if (depot) {
      return depot;
    }

    // Default fallback to first active depot if available (e.g. Koramangala Hub)
    const defaultDepot = await Depot.findOne({ isActive: true });
    if (!defaultDepot) {
      throw new Error('No active distribution depot found in system');
    }

    return defaultDepot;
  }

  /**
   * Check if a pincode is in service area
   */
  static async isPincodeServiced(pincode: string): Promise<boolean> {
    const count = await Depot.countDocuments({
      servicedPincodes: pincode,
      isActive: true,
    });
    return count > 0;
  }
}

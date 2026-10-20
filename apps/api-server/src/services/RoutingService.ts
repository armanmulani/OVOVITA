import { Depot, IDepotDoc } from '../models/Depot';

export interface CoverageResult {
  isServiced: boolean;
  depot?: {
    id: string;
    code: string;
    name: string;
    contactPhone: string;
    address: string;
  };
  distanceKm?: number;
  estimatedMinutes?: number;
  estimatedEtaText?: string;
  deliverySlots: string[];
}

export class RoutingService {
  /**
   * Calculate Haversine distance in kilometers between two GPS coordinates
   */
  static calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  /**
   * Estimate dynamic delivery time based on distance
   */
  static estimateDeliveryMinutes(distanceKm: number): number {
    // 8 mins depot packing + ~2.5 mins per km in city traffic, bounded between 15 and 40 mins
    const estimated = Math.round(8 + distanceKm * 2.5);
    return Math.max(15, Math.min(45, estimated));
  }

  /**
   * Resolve servicing depot hub by delivery coordinates or pincode
   */
  static async resolveDepot(params: {
    pincode?: string;
    longitude?: number;
    latitude?: number;
  }): Promise<{ depot: IDepotDoc; distanceKm?: number; estimatedMinutes: number }> {
    let depot: IDepotDoc | null = null;
    let distanceKm: number | undefined = undefined;

    // 1. Try geospatial proximity if coordinates available
    if (params.longitude && params.latitude) {
      try {
        depot = await Depot.findOne({
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [params.longitude, params.latitude],
              },
              $maxDistance: 25000, // 25 km max servicing radius
            },
          },
          isActive: true,
        });

        if (depot) {
          distanceKm = this.calculateDistanceKm(
            params.latitude,
            params.longitude,
            depot.location.coordinates[1],
            depot.location.coordinates[0]
          );
        }
      } catch (err) {
        console.warn('[RoutingService] Geospatial $near fallback note:', err);
      }
    }

    // 2. Try pincode match if no geospatial match found
    if (!depot && params.pincode) {
      depot = await Depot.findOne({
        servicedPincodes: params.pincode,
        isActive: true,
      });
    }

    // 3. Fallback to default active depot
    if (!depot) {
      depot = await Depot.findOne({ isActive: true });
    }

    if (!depot) {
      throw new Error('No active distribution depot found in system');
    }

    const estimatedMinutes = distanceKm
      ? this.estimateDeliveryMinutes(distanceKm)
      : 20;

    return { depot, distanceKm, estimatedMinutes };
  }

  /**
   * Legacy helper for pincode resolution
   */
  static async resolveDepotByPincode(pincode: string): Promise<IDepotDoc> {
    const res = await this.resolveDepot({ pincode });
    return res.depot;
  }

  /**
   * Check coverage for customer checkout screen
   */
  static async checkCoverage(params: {
    pincode?: string;
    longitude?: number;
    latitude?: number;
  }): Promise<CoverageResult> {
    const slots = [
      'Morning Rush (6:30 - 8:00 AM)',
      'Breakfast Slot (8:00 - 9:30 AM)',
      'Evening Harvest Drop (5:00 - 7:00 PM)',
    ];

    try {
      const { depot, distanceKm, estimatedMinutes } = await this.resolveDepot(params);
      return {
        isServiced: true,
        depot: {
          id: (depot._id as any).toString(),
          code: depot.code,
          name: depot.name,
          contactPhone: depot.contactPhone,
          address: depot.address,
        },
        distanceKm,
        estimatedMinutes,
        estimatedEtaText: `${estimatedMinutes} mins`,
        deliverySlots: slots,
      };
    } catch {
      return {
        isServiced: false,
        deliverySlots: [],
      };
    }
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

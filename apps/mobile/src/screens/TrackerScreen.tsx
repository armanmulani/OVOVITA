import React, { useState, useEffect } from 'react';
import { mobileApi } from '../api';

interface TrackerScreenProps {
  orderId?: string;
  onExploreMore: () => void;
}

export const TrackerScreen: React.FC<TrackerScreenProps> = ({
  orderId,
  onExploreMore,
}) => {
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (orderId) {
          const res = await mobileApi.trackOrder(orderId);
          setOrder(res.data);
        } else {
          // Fetch latest active order
          const myOrders = await mobileApi.getMyOrders();
          if (myOrders.data && myOrders.data.length > 0) {
            setOrder(myOrders.data[0]);
          }
        }
      } catch (err) {
        console.warn('Track order fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const defaultOrder = {
    orderNumber: 'EGG-20260829-0001',
    createdAt: 'Today, 6:45 AM',
    status: 'OUT_FOR_DELIVERY',
    estimatedDeliveryTime: '14 mins',
    finalPayableAmount: 195.0,
    paymentMethod: 'UPI_ON_DELIVERY',
    assignedDeliveryPersonName: 'Ramesh Kumar',
    vehiclePlateNumber: 'KA-01-EQ-9872',
    deliveryAddress: {
      recipientName: 'Rahul Sharma',
      flatPlotNumber: 'Flat 402',
      apartmentName: 'Silver Oak Heights',
      streetName: '5th Main, 4th Block, Koramangala',
    },
    items: [
      {
        productName: 'Classic Farm White Eggs',
        unit: 'TRAY_30',
        quantity: 1,
      },
    ],
  };

  const currentOrder = order || defaultOrder;

  return (
    <div className="flex-1 flex flex-col pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md px-4 py-3 border-b border-surface-container shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onExploreMore}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-variant transition"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Live Tracking</span>
            <h2 className="text-sm font-bold text-on-surface">Order #{currentOrder.orderNumber}</h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold uppercase tracking-wide">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
          </span>
          <span>{currentOrder.status?.replace(/_/g, ' ')}</span>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Live ETA Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[26px]">electric_moped</span>
            </div>
            <div>
              <div className="text-lg font-extrabold text-primary leading-tight">
                Arriving in {currentOrder.estimatedDeliveryTime || '14 mins'}
              </div>
              <div className="text-xs text-on-surface-variant mt-0.5">
                Priority Morning Harvest Run • Delivered at door
              </div>
            </div>
          </div>
        </div>

        {/* Live GPS Map Simulation Container */}
        <div className="relative w-full h-44 rounded-2xl overflow-hidden shadow-sm bg-surface-container border border-surface-container-high flex flex-col justify-end p-3">
          {/* Stylized vector map background representation */}
          <div className="absolute inset-0 bg-gradient-to-br from-surface-container-low via-surface-container to-surface-dim opacity-90"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-secondary/15 animate-ping"></div>
              <div className="absolute w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-[24px]">navigation</span>
              </div>
            </div>
          </div>

          {/* Floating Driver Location Pill */}
          <div className="relative z-10 bg-surface/95 backdrop-blur-md px-3 py-2 rounded-xl shadow border border-surface-container flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="material-symbols-outlined text-secondary text-[18px]">near_me</span>
              <span className="font-bold text-on-surface">950m away • 12th Main Road</span>
            </div>
            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Live GPS</span>
          </div>
        </div>

        {/* Delivery Partner Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-3.5 border border-surface-container shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-base shrink-0 border border-primary/20">
              RK
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm text-on-surface">
                  {currentOrder.assignedDeliveryPersonName || 'Ramesh Kumar'}
                </h4>
                <span className="text-[10px] bg-secondary-container text-on-secondary-container px-1.5 py-0.2 rounded font-bold">
                  ★ 4.9
                </span>
              </div>
              <div className="text-xs text-on-surface-variant mt-0.5">
                {currentOrder.vehiclePlateNumber || 'KA-01-EQ-9872'} • Zero-Crack Certified
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="tel:+919876500002"
              className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-primary transition"
            >
              <span className="material-symbols-outlined text-[18px]">call</span>
            </a>
            <a
              href="https://wa.me/919876500002"
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed flex items-center justify-center transition"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
            </a>
          </div>
        </div>

        {/* Pay-on-Delivery Callout Seal */}
        <div className="bg-surface-container-low rounded-2xl p-3.5 border border-surface-container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">payments</span>
            <div>
              <div className="text-xs font-bold text-on-surface">Pay on Doorstep Delivery</div>
              <div className="text-[11px] text-on-surface-variant">Cash or Instant UPI QR Accepted</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-extrabold text-primary">₹{currentOrder.finalPayableAmount}</div>
            <span className="text-[10px] bg-primary-fixed/80 text-on-primary-fixed px-1.5 py-0.2 rounded font-bold">
              PENDING
            </span>
          </div>
        </div>

        {/* Milestone Progress Timeline */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
            Freshness & Delivery Timeline
          </h4>
          <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-secondary/30">
            <div className="flex items-start gap-3 relative">
              <span className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-[12px] shrink-0 font-bold z-10">
                ✓
              </span>
              <div>
                <div className="text-xs font-bold text-on-surface">Laid at Sunrise (6:15 AM)</div>
                <div className="text-[11px] text-on-surface-variant">Mandya Organic Pasture Farm</div>
              </div>
            </div>

            <div className="flex items-start gap-3 relative">
              <span className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-[12px] shrink-0 font-bold z-10">
                ✓
              </span>
              <div>
                <div className="text-xs font-bold text-on-surface">Candling Quality Inspection Passed</div>
                <div className="text-[11px] text-on-surface-variant">Packed in shock-proof molded pulp tray</div>
              </div>
            </div>

            <div className="flex items-start gap-3 relative">
              <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[12px] shrink-0 font-bold z-10 animate-pulse">
                •
              </span>
              <div>
                <div className="text-xs font-bold text-primary">Out for Delivery</div>
                <div className="text-[11px] text-on-surface-variant">Rider Ramesh Kumar en route (950m away)</div>
              </div>
            </div>

            <div className="flex items-start gap-3 relative opacity-50">
              <span className="w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center text-[12px] shrink-0 font-bold z-10">
                ○
              </span>
              <div>
                <div className="text-xs font-bold text-on-surface">Doorstep Unboxing & Payment</div>
                <div className="text-[11px] text-on-surface-variant">Zero-crack inspection & UPI/Cash collect</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { mobileApi } from '../api';
import { AddressEditModal, AddressData } from '../components/AddressEditModal';

interface ProfileScreenProps {
  user?: any;
  onUpdateUser?: (updatedUser: any) => void;
  onLogout: () => void;
  onReorder?: (items: any[]) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onUpdateUser,
  onLogout,
  onReorder,
}) => {
  const [morningReminder, setMorningReminder] = useState(true);
  const [whatsappReceipts, setWhatsappReceipts] = useState(true);
  const [pastOrders, setPastOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  // Address edit modal state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState<AddressData | null>(null);

  useEffect(() => {
    const loadMyOrders = async () => {
      try {
        const res = await mobileApi.getMyOrders();
        setPastOrders(res.data || []);
      } catch (err) {
        console.warn('Failed to load past orders:', err);
      } finally {
        setIsLoadingOrders(false);
      }
    };

    loadMyOrders();
  }, []);

  const handleSaveAddress = async (addrData: AddressData) => {
    try {
      let res;
      if (addressToEdit?.id) {
        res = await mobileApi.updateAddress(addressToEdit.id, addrData);
      } else {
        res = await mobileApi.addAddress(addrData);
      }
      if (res.user) {
        onUpdateUser?.(res.user);
      } else if (Array.isArray(res.data)) {
        onUpdateUser?.({ ...user, savedAddresses: res.data });
      }
      setIsAddressModalOpen(false);
      setAddressToEdit(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to remove this delivery address?')) return;
    try {
      const res = await mobileApi.deleteAddress(addressId);
      if (res.user) {
        onUpdateUser?.(res.user);
      } else if (Array.isArray(res.data)) {
        onUpdateUser?.({ ...user, savedAddresses: res.data });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete address');
    }
  };

  const userName = user?.name || 'Customer';
  const userPhone = /^[6-9]\d{9}$/.test(user?.phoneNumber || '') ? `+91 ${user.phoneNumber}` : '';
  const userEmail = user?.email || (user?.phoneNumber ? `${user.phoneNumber}@ovovita.in` : 'customer@ovovita.in');
  const initials = (userName || 'C')
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'OV';

  const totalOrders = pastOrders.length;
  const totalTrays = pastOrders.reduce((sum, ord) => {
    const ordTrays = ord.items?.reduce((iSum: number, item: any) => {
      return iSum + (item.unit === 'TRAY_30' ? item.quantity : 1);
    }, 0) || 0;
    return sum + ordTrays;
  }, 0);

  const savedAddresses: any[] = user?.savedAddresses || [];

  return (
    <div className="flex-1 flex flex-col pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md px-4 py-3 border-b border-surface-container shadow-sm">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">
              OV
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold text-primary tracking-wider">Ovovita</span>
              <h2 className="text-sm font-bold text-on-surface">Profile & Settings</h2>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="text-xs font-semibold text-error hover:bg-error-container/30 px-2.5 py-1 rounded-lg transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
        {/* Profile Hero Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 md:p-6 border border-surface-container shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-2xl border-2 border-primary/20">
              {initials}
            </div>
            <span className="absolute -bottom-1 -right-1 bg-secondary text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px] shadow">
              <span className="material-symbols-outlined text-[12px]">verified</span>
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-bold text-on-surface truncate">{userName}</h3>
              <span className="text-xs bg-primary-fixed text-on-primary-fixed px-2.5 py-0.5 rounded-full font-bold">
                {user?.role === 'CUSTOMER' ? 'Direct Member' : user?.role || 'Member'}
              </span>
            </div>
            <div className="text-xs text-on-surface-variant mt-0.5">{userPhone}</div>
            <div className="text-xs text-on-surface-variant truncate">{userEmail}</div>
          </div>
        </div>

        {/* Quick Metrics Bento Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-surface-container-low rounded-xl text-center border border-surface-container">
            <div className="text-xl md:text-2xl font-extrabold text-primary">{totalOrders}</div>
            <div className="text-xs text-on-surface-variant mt-0.5 font-medium">Orders Placed</div>
          </div>
          <div className="p-4 bg-surface-container-low rounded-xl text-center border border-surface-container">
            <div className="text-xl md:text-2xl font-extrabold text-on-surface">{totalTrays}</div>
            <div className="text-xs text-on-surface-variant mt-0.5 font-medium">Trays Delivered</div>
          </div>
          <div className="p-4 bg-secondary-container/50 rounded-xl text-center border border-secondary/20">
            <div className="text-xl md:text-2xl font-extrabold text-secondary flex items-center justify-center gap-0.5">
              <span>5.0</span>
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
            </div>
            <div className="text-xs text-secondary font-bold mt-0.5">Zero-Crack</div>
          </div>
        </div>

        {/* Desktop 2-Column Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Column 1: Saved Addresses */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                <span>Saved Delivery Addresses</span>
              </h4>
              <button
                onClick={() => {
                  setAddressToEdit(null);
                  setIsAddressModalOpen(true);
                }}
                className="text-xs font-bold text-primary hover:text-primary-container flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                <span>Add New</span>
              </button>
            </div>

            {savedAddresses.length === 0 ? (
              <div className="p-6 bg-surface-container-low rounded-xl text-center border border-dashed border-outline-variant/60">
                <p className="text-xs text-on-surface-variant mb-3">No saved delivery addresses yet.</p>
                <button
                  onClick={() => {
                    setAddressToEdit(null);
                    setIsAddressModalOpen(true);
                  }}
                  className="text-xs bg-primary text-white font-bold px-3 py-1.5 rounded-lg shadow-sm hover:bg-primary-container transition"
                >
                  + Add Delivery Address
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedAddresses.map((addr: any, idx: number) => (
                  <div
                    key={addr.id || idx}
                    className="p-3.5 bg-surface-container-low rounded-xl border border-surface-container flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                          {addr.tag === 'WORK' ? 'business' : addr.tag === 'OTHER' ? 'pin_drop' : 'home'}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-on-surface">
                              {addr.tag || 'Address'}
                            </span>
                            {addr.isDefault && (
                              <span className="text-[9px] bg-primary-fixed text-on-primary-fixed px-1.5 py-0.2 rounded font-bold">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-semibold text-on-surface-variant mt-0.5">
                            {addr.recipientName || userName} • {addr.phoneNumber || userPhone}
                          </div>
                          <p className="text-xs text-on-surface mt-1">
                            {addr.flatPlotNumber ? `${addr.flatPlotNumber}, ` : ''}
                            {addr.apartmentName ? `${addr.apartmentName}, ` : ''}
                            {addr.streetName ? `${addr.streetName}, ` : ''}
                            {addr.city || 'Bengaluru'} - {addr.pincode}
                          </p>
                          {addr.gateSecurityInstructions && (
                            <div className="text-[11px] text-outline mt-1 italic flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">shield</span>
                              <span>{addr.gateSecurityInstructions}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setAddressToEdit(addr);
                            setIsAddressModalOpen(true);
                          }}
                          className="p-1 rounded-lg hover:bg-surface-container text-primary transition"
                          title="Edit address"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="p-1 rounded-lg hover:bg-error-container/30 text-error transition"
                          title="Delete address"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Recent Orders & Harvest Alerts */}
          <div className="space-y-6">
            {/* Recent Orders & Instant Reorder */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">history</span>
                  <span>Recent Orders</span>
                </h4>
                <span className="text-[11px] text-outline">Doorstep Verified</span>
              </div>

              {isLoadingOrders ? (
                <div className="py-4 text-center text-xs text-on-surface-variant">Loading orders...</div>
              ) : pastOrders.length === 0 ? (
                <div className="p-4 bg-surface-container-low rounded-xl text-center text-xs text-on-surface-variant">
                  No orders placed yet.
                </div>
              ) : (
                pastOrders.slice(0, 3).map((ord) => (
                  <div
                    key={ord._id}
                    className="p-3.5 bg-surface-container-low rounded-xl border border-surface-container flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-on-surface">#{ord.orderNumber}</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            ord.status === 'DELIVERED'
                              ? 'bg-secondary/15 text-secondary'
                              : 'bg-primary-fixed text-on-primary-fixed'
                          }`}
                        >
                          {ord.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-primary">₹{ord.finalPayableAmount}</span>
                    </div>

                    <div className="text-[11px] text-on-surface-variant">
                      {ord.items?.map((it: any) => `${it.quantity}x ${it.productName} (${it.unit})`).join(', ')}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/60">
                      <span className="text-[10px] text-outline">
                        {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {onReorder && (
                        <button
                          onClick={() => onReorder(ord.items)}
                          className="text-[11px] bg-primary text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-primary-container transition active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[12px]">replay</span>
                          <span>Reorder</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Morning Harvest Preferences */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Fresh Harvest Alerts & Preferences
              </h4>

              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="text-xs font-bold text-on-surface">Daily 6:30 AM Harvest Reminder</div>
                  <div className="text-[11px] text-on-surface-variant">
                    Alert when farm harvest crates arrive at depot
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={morningReminder}
                  onChange={(e) => setMorningReminder(e.target.checked)}
                  className="w-5 h-5 accent-primary cursor-pointer rounded"
                />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-surface-container pt-2">
                <div>
                  <div className="text-xs font-bold text-on-surface">WhatsApp Order & Dispatch Receipts</div>
                  <div className="text-[11px] text-on-surface-variant">
                    Receive rider GPS details and POD due snapshot
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={whatsappReceipts}
                  onChange={(e) => setWhatsappReceipts(e.target.checked)}
                  className="w-5 h-5 accent-primary cursor-pointer rounded"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Address Edit / Create Modal */}
        <AddressEditModal
          isOpen={isAddressModalOpen}
          initialAddress={addressToEdit}
          defaultName={userName}
          defaultPhone={user?.phoneNumber || ''}
          onClose={() => {
            setIsAddressModalOpen(false);
            setAddressToEdit(null);
          }}
          onSave={handleSaveAddress}
        />
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';

export interface AddressData {
  id?: string;
  tag: 'HOME' | 'WORK' | 'OTHER';
  recipientName: string;
  phoneNumber: string;
  flatPlotNumber: string;
  apartmentName?: string;
  streetName: string;
  landmark?: string;
  pincode: string;
  city: string;
  gateSecurityInstructions?: string;
  isDefault?: boolean;
}

interface AddressEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAddress?: AddressData | null;
  onSave: (data: AddressData) => Promise<void>;
  defaultName?: string;
  defaultPhone?: string;
}

export const AddressEditModal: React.FC<AddressEditModalProps> = ({
  isOpen,
  onClose,
  initialAddress,
  onSave,
  defaultName = '',
  defaultPhone = '',
}) => {
  const [tag, setTag] = useState<'HOME' | 'WORK' | 'OTHER'>('HOME');
  const [recipientName, setRecipientName] = useState(defaultName);
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  const [flatPlotNumber, setFlatPlotNumber] = useState('');
  const [apartmentName, setApartmentName] = useState('');
  const [streetName, setStreetName] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState('560034');
  const [city, setCity] = useState('Bengaluru');
  const [gateSecurityInstructions, setGateSecurityInstructions] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialAddress) {
      setTag(initialAddress.tag || 'HOME');
      setRecipientName(initialAddress.recipientName || defaultName);
      setPhoneNumber(initialAddress.phoneNumber || defaultPhone);
      setFlatPlotNumber(initialAddress.flatPlotNumber || '');
      setApartmentName(initialAddress.apartmentName || '');
      setStreetName(initialAddress.streetName || '');
      setLandmark(initialAddress.landmark || '');
      setPincode(initialAddress.pincode || '560034');
      setCity(initialAddress.city || 'Bengaluru');
      setGateSecurityInstructions(initialAddress.gateSecurityInstructions || '');
      setIsDefault(initialAddress.isDefault ?? true);
    } else {
      setTag('HOME');
      setRecipientName(defaultName);
      setPhoneNumber(defaultPhone);
      setFlatPlotNumber('');
      setApartmentName('');
      setStreetName('');
      setLandmark('');
      setPincode('560034');
      setCity('Bengaluru');
      setGateSecurityInstructions('');
      setIsDefault(true);
    }
    setErrorMsg('');
  }, [initialAddress, isOpen, defaultName, defaultPhone]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flatPlotNumber.trim() || !streetName.trim() || !pincode.trim()) {
      setErrorMsg('Please fill in Flat Number, Street, and Pincode.');
      return;
    }
    if (pincode.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit Indian pincode.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      await onSave({
        id: initialAddress?.id,
        tag,
        recipientName: recipientName.trim() || 'Valued Customer',
        phoneNumber: phoneNumber.trim() || '9876543210',
        flatPlotNumber: flatPlotNumber.trim(),
        apartmentName: apartmentName.trim(),
        streetName: streetName.trim(),
        landmark: landmark.trim(),
        pincode: pincode.trim(),
        city: city.trim() || 'Bengaluru',
        gateSecurityInstructions: gateSecurityInstructions.trim(),
        isDefault,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save address.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface max-w-sm w-full rounded-2xl p-5 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">location_on</span>
            <h3 className="font-extrabold text-base text-on-surface">
              {initialAddress?.id ? 'Edit Delivery Address' : 'Add Delivery Address'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2 bg-error-container text-on-error-container text-xs rounded-lg font-semibold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 mt-3">
          {/* Tag Selector */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant block mb-1">Address Label</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['HOME', 'WORK', 'OTHER'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTag(t)}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                    tag === t
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant border-surface-container hover:bg-surface-container'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">
                Recipient Name
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-surface-container-low border border-surface-container rounded-lg text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">
                Phone Number
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-surface-container-low border border-surface-container rounded-lg text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">
                Flat / House No *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Flat 302, Tower B"
                value={flatPlotNumber}
                onChange={(e) => setFlatPlotNumber(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-surface-container-low border border-surface-container rounded-lg text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">
                Society / Apartment
              </label>
              <input
                type="text"
                placeholder="e.g. Prestige Falcon"
                value={apartmentName}
                onChange={(e) => setApartmentName(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-surface-container-low border border-surface-container rounded-lg text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">
              Street / Area *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 5th Main, 4th Block, Koramangala"
              value={streetName}
              onChange={(e) => setStreetName(e.target.value)}
              className="w-full text-xs font-semibold px-2.5 py-1.5 bg-surface-container-low border border-surface-container rounded-lg text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">
                Landmark
              </label>
              <input
                type="text"
                placeholder="Near Wipro Park"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-surface-container-low border border-surface-container rounded-lg text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">
                Pincode *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="560034"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-surface-container-low border border-surface-container rounded-lg text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">
              Delivery / Gate Instructions
            </label>
            <input
              type="text"
              placeholder="Leave with security guard if bell not answered"
              value={gateSecurityInstructions}
              onChange={(e) => setGateSecurityInstructions(e.target.value)}
              className="w-full text-xs font-semibold px-2.5 py-1.5 bg-surface-container-low border border-surface-container rounded-lg text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isDefaultCheckbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
            <label htmlFor="isDefaultCheckbox" className="text-xs text-on-surface-variant cursor-pointer">
              Set as primary delivery address
            </label>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-surface-container text-on-surface text-xs font-bold rounded-xl hover:bg-surface-variant transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              {isSaving ? 'Saving to Database...' : 'Save Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

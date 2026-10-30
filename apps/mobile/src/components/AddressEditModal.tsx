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
  latitude?: number;
  longitude?: number;
}

interface AddressEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAddress?: AddressData | null;
  onSave: (data: AddressData) => Promise<void>;
  defaultName?: string;
  defaultPhone?: string;
}

const PHOTON_API_URL = 'https://photon.komoot.io/api';

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
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Initialize from existing address or defaults
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
      // Capture lat/lng if provided
      if (initialAddress.latitude !== undefined) setLatitude(initialAddress.latitude);
      if (initialAddress.longitude !== undefined) setLongitude(initialAddress.longitude);
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
  }, [initialAddress, defaultName, defaultPhone]);

  // Photon autocomplete state
  const [query, setQuery] = useState(initialAddress?.pincode || '');
  const [results, setResults] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const debounceTimeout = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setSelectedResult(null);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(`${PHOTON_API_URL}?q=${encodeURIComponent(query)}&limit=5`);
        if (!response.ok) throw new Error('Photon API error');
        const data: any = await response.json();
        if (!cancelled) {
          setResults(data.features || []);
          // Auto-select first result if only one match
          if (data.features?.length === 1) {
            setSelectedResult(data.features[0]);
          }
        }
      } catch (err) {
        console.warn('[Photon] autocomplete error:', err);
        if (!cancelled) {
          setResults([]);
          setSelectedResult(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(debounceTimeout);
    };
  }, [query]);

  const handleSelect = (result: any) => {
    setSelectedResult(result);
    // Populate address fields from Photon result
    setPincode(result.properties.postcode || '');
    setCity(result.properties.city || 'Bengaluru');
    // Set latitude/longitude from geometry coordinates [longitude, latitude]
    const [lon, lat] = result.geometry.coordinates;
    setLatitude(lat);
    setLongitude(lon);

    // Hide the list
    setResults([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    // If user is typing pincode directly, still debounce
    if (/^\d{6}$/.test(value)) {
      // User typed a 6-digit pincode - fetch immediately
      setTimeout(async () => {
        if (query.trim().length === 6) {
          setIsLoading(true);
          try {
            const response = await fetch(`${PHOTON_API_URL}?q=${encodeURIComponent(value)}&limit=1`);
            if (!response.ok) throw new Error('Photon API error');
            const data: any = await response.json();
            if (data.features && data.features.length > 0) {
              const result = data.features[0];
              const [lon, lat] = result.geometry.coordinates;
              setPincode(result.properties.postcode || value);
              setCity(result.properties.city || 'Bengaluru');
              setLatitude(lat);
              setLongitude(lon);
              setSelectedResult(result);
            }
          } catch (err) {
            console.warn('[Photon] pincode lookup error:', err);
          } finally {
            setIsLoading(false);
          }
        }
      }, 300);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flatPlotNumber.trim() || !streetName.trim() || !pincode.trim()) {
      setErrorMsg('Please fill in Flat Number, Street, and Pincode.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phoneNumber.trim())) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number for delivery.');
      return;
    }
    if (pincode.trim().length !== 6 && !latitude) {
      setErrorMsg('Please enter a valid 6-digit Indian pincode or select an address from the autocomplete suggestions.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      await onSave({
        id: initialAddress?.id,
        tag,
        recipientName: recipientName.trim() || 'Valued Customer',
        phoneNumber: phoneNumber.trim(),
        flatPlotNumber: flatPlotNumber.trim(),
        apartmentName: apartmentName.trim(),
        streetName: streetName.trim(),
        landmark: landmark.trim(),
        pincode: pincode.trim(),
        city: city.trim() || 'Bengaluru',
        gateSecurityInstructions: gateSecurityInstructions.trim(),
        latitude,
        longitude,
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

        {/* Photon Autocomplete Search Box */}
        <div className="mt-2 mb-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">
                Address or Pincode *
              </label>
              <input
                type="text"
                onChange={handleInputChange}
                value={query}
                placeholder="e.g. 560034 or Koramangala, Bengaluru"
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-surface-container-low border border-surface-container rounded-lg text-on-surface focus:outline-none focus:border-primary transition"
                aria-live="polite"
              />
            </div>
            {isLoading && (
              <span className="text-[10px] text-on-surface-variant">Searching...</span>
            )}
          </div>
        </div>

        {/* Photon Suggestions Dropdown */}
        {results.length > 0 && (
          <div className="mt-2 max-h-40 overflow-y-auto border border-surface-container/50 rounded-lg bg-surface-container-low">
            {results.map((result, idx) => (
              <div
                key={idx}
                onClick={() => handleSelect(result)}
                className="py-2 px-3 cursor-pointer transition hover:bg-surface-container/30 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                <div className="flex-1 truncate">
                  <div className="font-semibold text-on-surface">{result.properties.name || result.properties.postcode}</div>
                  <div className="text-[10px] text-on-surface-variant">
                    {result.properties.city}, {result.properties.state || ''} {result.properties.postcode || ''}
                      . {result.properties.country || 'India'}</div>
                </div>
                <span className="text-[10px] text-on-surface/40 ml-auto">{result.properties.type || ''}</span>
              </div>
            ))}
            {selectedResult && results.length > 0 ? (
              <div
                key="selected"
                onClick={() => handleSelect(selectedResult)}
                className="py-2 px-3 cursor-pointer transition bg-primary/20 border-primary border"
              >
                <span className="material-symbols-outlined text-[14px] text-primary">check_circle</span>
                <span className="font-medium text-on-surface">
                  Selected: {selectedResult.properties.name || selectedResult.properties.postcode}
                </span>
              </div>
            ) : null}
          </div>
        )}

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
                onChange={(e) => {
                  setPincode(e.target.value);
                  // Also trigger photon lookup for 6-digit pincodes
                  if (/^\d{6}$/.test(e.target.value)) {
                    setTimeout(async () => {
                      try {
                        const response = await fetch(`${PHOTON_API_URL}?q=${encodeURIComponent(e.target.value)}&limit=1`);
                        if (!response.ok) throw new Error('Photon API error');
                        const data: any = await response.json();
                        if (data.result && data.result.length > 0) {
                          const result = data.result[0];
                          const [lon, lat] = result.geometry.coordinates;
                          setPincode(result.properties.postcode || e.target.value);
                          setCity(result.properties.city || 'Bengaluru');
                          setLatitude(lat);
                          setLongitude(lon);
                        }
                      } catch (err) {
                        console.warn('[Photon] pincode lookup error:', err);
                      }
                    }, 300);
                  }
                }}
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
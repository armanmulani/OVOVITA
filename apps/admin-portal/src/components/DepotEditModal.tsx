import React, { useState, useEffect } from 'react';
import { PhotonAddressPicker } from './PhotonAddressPicker';
import { api } from '../api';

interface DepotEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  depotId: string;
  onSave: () => void;
}

export const DepotEditModal: React.FC<DepotEditModalProps> = ({
  isOpen,
  onClose,
  depotId,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [servicedPincodes, setServicedPincodes] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDepot, setIsLoadingDepot] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [addressNeedsSuggestion, setAddressNeedsSuggestion] = useState(false);

  useEffect(() => {
    if (!isOpen || !depotId) return;

    let cancelled = false;
    setIsLoadingDepot(true);
    setLoadError('');
    setFormError('');
    setAddressNeedsSuggestion(false);
    api.getDepot(depotId)
      .then(res => {
        if (cancelled) return;
        const d = res.data;
        setName(d.name || '');
        setAddress(d.address || '');
        setContactPerson(d.contactPerson || '');
        setContactPhone(d.contactPhone || '');
        setServicedPincodes((d.servicedPincodes || []).join(', '));
        if (d.location?.coordinates?.length === 2) {
          setLatitude(d.location.coordinates[1]);
          setLongitude(d.location.coordinates[0]);
        } else {
          setLatitude(undefined);
          setLongitude(undefined);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load depot details');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDepot(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, depotId]);

  const handleAddressChange = (addr: string) => {
    setAddress(addr);
    setLatitude(undefined);
    setLongitude(undefined);
    setAddressNeedsSuggestion(true);
    setFormError('');
  };

  const handleAddressSelect = (addr: string, lat: number, lng: number) => {
    setAddress(addr);
    setLatitude(lat);
    setLongitude(lng);
    setAddressNeedsSuggestion(false);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addressNeedsSuggestion) {
      setFormError('Choose an address suggestion to update its map location.');
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      await api.updateDepot(depotId, {
        name,
        address,
        contactPerson,
        contactPhone,
        servicedPincodes: servicedPincodes.split(',').map(p => p.trim()).filter(Boolean),
        location: longitude !== undefined && latitude !== undefined
          ? { type: 'Point', coordinates: [longitude, latitude] }
          : undefined,
      });
      onSave();
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save depot');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full shadow-2xl border border-surface-container-high p-5">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <h3 className="font-bold text-on-surface text-base flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">storefront</span>
            Edit Depot
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {loadError && (
            <p className="text-xs font-medium text-error" role="alert">{loadError}</p>
          )}
          {formError && (
            <p className="text-xs font-medium text-error" role="alert">{formError}</p>
          )}
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">Depot Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full text-xs font-semibold px-2.5 py-1.5 bg-surface-container-low border border-surface-container rounded-lg text-on-surface focus:outline-none focus:border-primary" />
          </div>

          <PhotonAddressPicker
            value={address}
            onChange={handleAddressChange}
            onSelect={handleAddressSelect}
            label="Depot Address"
          />
          {addressNeedsSuggestion && (
            <p className="-mt-2 text-[10px] text-on-surface-variant">
              Select a suggested address to update its map location.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">Contact Person</label>
              <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="w-full text-xs font-semibold px-2.5 py-1.5 bg-surface-container-low border border-surface-container rounded-lg text-on-surface" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">Contact Phone</label>
              <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full text-xs font-semibold px-2.5 py-1.5 bg-surface-container-low border border-surface-container rounded-lg text-on-surface" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">Serviced Pincodes (comma separated)</label>
            <input value={servicedPincodes} onChange={e => setServicedPincodes(e.target.value)} className="w-full text-xs font-semibold px-2.5 py-1.5 bg-surface-container-low border border-surface-container rounded-lg text-on-surface" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-container text-on-surface-variant">Cancel</button>
            <button type="submit" disabled={isSaving || isLoadingDepot || !!loadError} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white disabled:opacity-50">
              {isLoadingDepot ? 'Loading...' : isSaving ? 'Saving...' : 'Save Depot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

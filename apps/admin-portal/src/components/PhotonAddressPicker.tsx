import React, { useState, useEffect } from 'react';

interface PhotonResult {
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    locality?: string;
    district?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    type?: string;
  };
  geometry: {
    coordinates: [number, number];
  };
}

interface PhotonAddressPickerProps {
  value?: string;
  onChange?: (address: string) => void;
  onSelect?: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  label?: string;
}

const PHOTON_API_URL = 'https://photon.komoot.io/api';

export const PhotonAddressPicker: React.FC<PhotonAddressPickerProps> = ({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Search address or pincode',
  label = 'Depot Address',
}) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<PhotonResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearchError, setHasSearchError] = useState(false);
  const [shouldSearch, setShouldSearch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    const debounceTimeout = setTimeout(async () => {
      if (!shouldSearch || query.trim().length < 2) {
        setResults([]);
        setHasSearchError(false);
        setHasSearched(false);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setHasSearchError(false);
      try {
        const response = await fetch(`${PHOTON_API_URL}?q=${encodeURIComponent(query)}&limit=5`);
        if (!response.ok) throw new Error('Photon API error');
        const data = await response.json();
        if (!cancelled) {
          setResults(data.features || []);
          setHasSearched(true);
        }
      } catch (err) {
        console.warn('[Photon] autocomplete error:', err);
        if (!cancelled) {
          setResults([]);
          setHasSearchError(true);
          setHasSearched(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(debounceTimeout);
    };
  }, [query, shouldSearch]);

  const handleSelect = (result: PhotonResult) => {
    const { properties, geometry } = result;
    const street = [properties.housenumber, properties.street].filter(Boolean).join(' ');
    const address = [
      properties.name,
      street,
      properties.city,
      properties.locality,
      properties.district,
      properties.county,
      properties.state,
      properties.postcode,
      properties.country
    ].filter((part, index, parts) => part && parts.findIndex(
      candidate => candidate?.toLocaleLowerCase() === part.toLocaleLowerCase()
    ) === index).join(', ');

    const [lng, lat] = geometry.coordinates;
    onSelect?.(address, lat, lng);
    setQuery(address);
    setResults([]);
    setShouldSearch(false);
    setHasSearched(false);
    setHasSearchError(false);
  };

  return (
    <div className="space-y-2">
      <label htmlFor="depot-address-input" className="text-[11px] font-bold text-on-surface-variant block mb-0.5">
        {label} *
      </label>
      <div className="relative">
        <input
          id="depot-address-input"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShouldSearch(true);
            setHasSearched(false);
            onChange?.(e.target.value);
          }}
          placeholder={placeholder}
          className="w-full text-xs font-semibold px-2.5 py-1.5 bg-surface-container-low border border-surface-container rounded-lg text-on-surface focus:outline-none focus:border-primary transition"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={results.length > 0}
          aria-controls="depot-address-suggestions"
          autoComplete="off"
        />
        {results.length > 0 && (
          <div
            id="depot-address-suggestions"
            role="listbox"
            className="absolute z-10 top-full mt-1 w-full max-h-40 overflow-y-auto border border-surface-container/50 rounded-lg bg-surface-container-low shadow-lg"
          >
            {results.map((result, idx) => (
              <button
                type="button"
                role="option"
                aria-selected="false"
                key={`${result.geometry.coordinates.join(',')}-${idx}`}
                onClick={() => handleSelect(result)}
                className="w-full text-left py-2 px-3 cursor-pointer transition hover:bg-surface-container/30 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                <div className="flex-1 truncate">
                  <div className="font-semibold text-on-surface">
                    {result.properties.name || result.properties.postcode}
                  </div>
                  <div className="text-[10px] text-on-surface-variant">
                    {[
                      result.properties.street,
                      result.properties.city || result.properties.locality,
                      result.properties.district || result.properties.county,
                      result.properties.state,
                      result.properties.postcode,
                      result.properties.country,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {(isLoading || hasSearchError) && (
        <span className="text-[10px] text-on-surface-variant" role="status">
          {isLoading ? 'Searching...' : 'Address suggestions are unavailable. Try again shortly.'}
        </span>
      )}
      {!isLoading && hasSearched && !hasSearchError && results.length === 0 && (
        <span className="text-[10px] text-on-surface-variant" role="status">
          No matching addresses found.
        </span>
      )}
    </div>
  );
};

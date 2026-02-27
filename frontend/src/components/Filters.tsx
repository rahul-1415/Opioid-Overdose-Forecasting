import React, { useMemo } from "react";

interface Props {
  selectedCounty: string;
  selectedZip: string;
  onCountyChange: (val: string) => void;
  onZipChange: (val: string) => void;
  onZipQueryChange: (val: string) => void;
  zipOptions: string[];
  zipQuery: string;
  isZipLoading: boolean;
  isZipDisabled: boolean;
}

const Filters: React.FC<Props> = ({
  selectedCounty,
  selectedZip,
  onCountyChange,
  onZipChange,
  onZipQueryChange,
  zipOptions,
  zipQuery,
  isZipLoading,
  isZipDisabled,
}) => {
  const filteredZipOptions = useMemo(() => {
    const query = zipQuery.trim();
    if (!query) {
      return zipOptions;
    }
    return zipOptions.filter((zip) => zip.includes(query));
  }, [zipOptions, zipQuery]);

  const noZipOptionsAvailable = !isZipLoading && zipOptions.length === 0;
  const noZipMatches = !isZipLoading && zipOptions.length > 0 && filteredZipOptions.length === 0;
  const zipSelectDisabled = isZipDisabled || isZipLoading || noZipOptionsAvailable || noZipMatches;
  const zipSelectValue =
    selectedZip === "All" || filteredZipOptions.includes(selectedZip) ? selectedZip : "All";

  return (
    <div className="filters">
      <div className="filter-field">
        <label htmlFor="county-filter">Where do you want to look?</label>
        <select
          id="county-filter"
          className="filter-select"
          value={selectedCounty}
          onChange={(e) => onCountyChange(e.target.value)}
        >
          <option value="All">All Counties</option>
          <option value="001">Apache</option>
          <option value="003">Cochise</option>
          <option value="005">Coconino</option>
          <option value="007">Gila</option>
          <option value="009">Graham</option>
          <option value="011">Greenlee</option>
          <option value="012">La Paz</option>
          <option value="013">Maricopa</option>
          <option value="015">Mohave</option>
          <option value="017">Navajo</option>
          <option value="019">Pima</option>
          <option value="021">Pinal</option>
          <option value="023">Santa Cruz</option>
          <option value="025">Yavapai</option>
          <option value="027">Yuma</option>
        </select>
      </div>

      <div className="filter-field">
        <label htmlFor="zip-search">Find ZIP quickly</label>
        <input
          id="zip-search"
          type="text"
          className="filter-input"
          placeholder="Type a ZIP prefix (e.g., 850)"
          value={zipQuery}
          onChange={(e) => onZipQueryChange(e.target.value)}
          disabled={isZipDisabled}
        />

        <label htmlFor="zip-filter">Select ZIP Code</label>
        <select
          id="zip-filter"
          className="filter-select"
          value={zipSelectValue}
          onChange={(e) => onZipChange(e.target.value)}
          disabled={zipSelectDisabled}
        >
          {isZipLoading && <option value="All">Loading ZIPs...</option>}
          {noZipOptionsAvailable && <option value="All">No ZIPs available</option>}
          {!isZipLoading && !noZipOptionsAvailable && (
            <>
              <option value="All">All ZIPs</option>
              {filteredZipOptions.map((zip) => (
                <option key={zip} value={zip}>
                  {zip}
                </option>
              ))}
            </>
          )}
          {noZipMatches && (
            <option value="All" disabled>
              No matching ZIPs
            </option>
          )}
        </select>
      </div>
    </div>
  );
};

export default Filters;

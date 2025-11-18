import React from "react";

interface Props {
  selectedCounty: string;
  selectedZip: string;
  onCountyChange: (val: string) => void;
  onZipChange: (val: string) => void;
  zipOptions: string[];
}

const Filters: React.FC<Props> = ({
  selectedCounty,
  selectedZip,
  onCountyChange,
  onZipChange,
  zipOptions, 
}) => {
  return (
    <div className="filters">
      <div>
        <label>Where do you want to look?</label>
        <select value={selectedCounty} onChange={(e) => onCountyChange(e.target.value)}>
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

      <div>
        <label>Select ZIP Code</label>
        <select value={selectedZip} onChange={(e) => onZipChange(e.target.value)}>
          <option value="All">All ZIPs</option>
          {zipOptions.map((zip) => (
            <option key={zip} value={zip}>
              {zip}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Filters;

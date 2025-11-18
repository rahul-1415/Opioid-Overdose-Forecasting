import React, { useEffect, useState } from "react";
import "../styles/NeighborhoodSidebar.css";

interface Props {
  feature: any;
}

const NeighborhoodSidebar: React.FC<Props> = ({ feature }) => {
  const [descriptions, setDescriptions] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetch("/variable_names.csv")
      .then((res) => res.text())
      .then((csv) => {
        const lines = csv.trim().split("\n");
        const map: { [key: string]: string } = {};
        lines.forEach((line) => {
          const [key, label] = line.split(",");
          if (key && label) {
            map[key.trim()] = label.trim();
          }
        });
        setDescriptions(map);
      })
      .catch((err) => console.error("Failed to load variable names:", err));
  }, []);

  if (!feature) return <div className="sidebar">Select a block group on the map.</div>;

  return (
    <div className="sidebar">
      <h3>Neighborhood Characteristics</h3>
      <table>
        <tbody>
          {Object.entries(feature).map(([key, value]) =>
            descriptions[key] ? (
              <tr key={key}>
                <td><strong>{descriptions[key]}</strong></td>
                <td>{value}</td>
              </tr>
            ) : null
          )}
        </tbody>
      </table>
    </div>
  );
};

export default NeighborhoodSidebar;

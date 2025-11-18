import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

interface Props {
  geoData: any;
  onFeatureClick: (feature: any) => void;
  selectedFeature: any;
  selectedCounty: string;
}

const getColor = (totalDosage: number) => {
  return totalDosage > 1000 ? "#800026" :
         totalDosage > 500  ? "#BD0026" :
         totalDosage > 200  ? "#E31A1C" :
         totalDosage > 100  ? "#FC4E2A" :
         totalDosage > 50   ? "#FD8D3C" :
         totalDosage > 20   ? "#FEB24C" :
         totalDosage > 10   ? "#FED976" :
                              "#FFEDA0";
};

const MapComponent: React.FC<Props> = ({
  geoData,
  onFeatureClick,
  selectedFeature,
  selectedCounty,
}) => {
  const mapRef = useRef<any>(null);

  const getStyle = (feature: any) => {
    const totalDosage = feature.properties.total_dosage || 0;
    const countyCode = feature.properties.COUNTYFP;
    const isSelectedCBG = selectedFeature?.GEOID === feature.properties.GEOID;

    const baseStyle = {
      fillColor: getColor(totalDosage),
      color: "black",
      weight: 1,
      fillOpacity: 0.4,
      opacity: 1,
    };

    // If county filter is active
    if (selectedCounty !== "All") {
      if (countyCode === selectedCounty) {
        // If this is the clicked CBG
        if (isSelectedCBG) {
          return {
            ...baseStyle,
            weight: 4,
            color: "#222",
            fillOpacity: 0.85,
          };
        }
        return {
          ...baseStyle,
          weight: 1.5,
          color: "#000",
          fillOpacity: 0.75,
        };
      } else {
        return {
          ...baseStyle,
          fillOpacity: 0.05,
          color: "#ccc",
          weight: 0.3,
          opacity: 0.2,
        };
      }
    }

    // No county filter, but a CBG is selected
    if (isSelectedCBG) {
      return {
        ...baseStyle,
        weight: 4,
        color: "#222",
        fillOpacity: 0.85,
      };
    }

    return baseStyle;
  };

  const onEachFeature = (feature: any, layer: any) => {
    layer.setStyle(getStyle(feature));

    if (selectedFeature?.GEOID === feature.properties.GEOID) {
      layer.bringToFront();
    }

    layer.on({
      click: () => {
        onFeatureClick(feature.properties);
      },
      mouseover: (e) => {
        if (feature.properties.GEOID !== selectedFeature?.GEOID) {
          const layer = e.target;
          layer.setStyle({
            weight: 2,
            color: "black",
            fillOpacity: 0.6,
          });
          layer.bringToFront();
        }
      },
      mouseout: (e) => {
        const layer = e.target;
        layer.setStyle(getStyle(feature));
      },
    });
  };

  useEffect(() => {
    if (geoData && mapRef.current) {
      try {
        const layer = L.geoJSON(geoData);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds);
        }
      } catch (e) {
        console.error("Invalid GeoJSON or geometry error:", e);
      }
    }
  }, [geoData]);

  return (
    <MapContainer
      center={[34.05, -111.09]}
      zoom={7}
      style={{ height: "80vh", width: "60vw" }}
      ref={mapRef}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {geoData && (
        <GeoJSON
          key={`${selectedCounty}-${selectedFeature?.GEOID ?? "none"}-${geoData.features?.length}`}
          data={geoData}
          onEachFeature={onEachFeature}
        />
      )}
    </MapContainer>
  );
};

export default MapComponent;

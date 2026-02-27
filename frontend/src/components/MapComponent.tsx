import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import type { Layer, LeafletMouseEvent, Map as LeafletMap, Path, PathOptions } from "leaflet";
import L from "leaflet";
import { useEffect, useRef } from "react";
import type { MapFeature, MapFeatureCollection } from "../types/geo";
import "leaflet/dist/leaflet.css";

interface Props {
  geoData: MapFeatureCollection | null;
  isLoading: boolean;
  mapLoadError: string | null;
  onFeatureClick: (geoid: string) => void;
  selectedFeatureId: string | null;
  selectedCounty: string;
  selectedZip: string;
}

const getColor = (totalDosage: number): string => {
  return totalDosage > 1000 ? "#800026" :
         totalDosage > 500  ? "#BD0026" :
         totalDosage > 200  ? "#E31A1C" :
         totalDosage > 100  ? "#FC4E2A" :
         totalDosage > 50   ? "#FD8D3C" :
         totalDosage > 20   ? "#FEB24C" :
         totalDosage > 10   ? "#FED976" :
                              "#FFEDA0";
};

const legendRanges = [
  { label: "> 1000", color: "#800026" },
  { label: "501 - 1000", color: "#BD0026" },
  { label: "201 - 500", color: "#E31A1C" },
  { label: "101 - 200", color: "#FC4E2A" },
  { label: "51 - 100", color: "#FD8D3C" },
  { label: "21 - 50", color: "#FEB24C" },
  { label: "11 - 20", color: "#FED976" },
  { label: "<= 10", color: "#FFEDA0" },
] as const;

const toMapFeature = (feature: GeoJsonObject): MapFeature | null => {
  if (feature.type !== "Feature") {
    return null;
  }
  return feature as MapFeature;
};

const MapComponent: React.FC<Props> = ({
  geoData,
  isLoading,
  mapLoadError,
  onFeatureClick,
  selectedFeatureId,
  selectedCounty,
  selectedZip,
}) => {
  const mapRef = useRef<LeafletMap | null>(null);
  const visibleFeatureCount = geoData?.features?.length ?? 0;
  const hasActiveFilters = selectedCounty !== "All" || selectedZip !== "All";

  const getStyle = (feature: MapFeature): PathOptions => {
    const props = feature.properties ?? {};
    const totalDosage = Number(props.total_dosage || 0);
    const countyCode = String(props.COUNTYFP ?? "");
    const geoid = String(props.GEOID ?? "");
    const isSelectedCBG = selectedFeatureId === geoid;

    const baseStyle: PathOptions = {
      fillColor: getColor(totalDosage),
      color: "black",
      weight: 1,
      fillOpacity: 0.4,
      opacity: 1,
    };

    if (selectedCounty !== "All") {
      if (countyCode === selectedCounty) {
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
      }
      return {
        ...baseStyle,
        fillOpacity: 0.05,
        color: "#ccc",
        weight: 0.3,
        opacity: 0.2,
      };
    }

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

  const onEachFeature = (featureObject: GeoJsonObject, layer: Layer) => {
    const feature = toMapFeature(featureObject);
    if (!feature || !(layer instanceof L.Path)) {
      return;
    }

    const pathLayer = layer as Path;
    pathLayer.setStyle(getStyle(feature));

    if (selectedFeatureId === String(feature.properties?.GEOID ?? "")) {
      pathLayer.bringToFront();
    }

    pathLayer.on({
      click: () => {
        const geoid = String(feature.properties?.GEOID ?? "");
        if (geoid) {
          onFeatureClick(geoid);
        }
      },
      mouseover: (event: LeafletMouseEvent) => {
        const hoveredLayer = event.target as Path;
        if (String(feature.properties?.GEOID ?? "") !== selectedFeatureId) {
          hoveredLayer.setStyle({
            weight: 2,
            color: "black",
            fillOpacity: 0.6,
          });
          hoveredLayer.bringToFront();
        }
      },
      mouseout: (event: LeafletMouseEvent) => {
        const hoveredLayer = event.target as Path;
        hoveredLayer.setStyle(getStyle(feature));
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
      } catch (error) {
        console.error("Invalid GeoJSON or geometry error:", error);
      }
    }
  }, [geoData]);

  return (
    <section className="map-shell" aria-busy={isLoading} aria-label="Map panel">
      <div className="map-meta">
        <span>
          <strong>{visibleFeatureCount.toLocaleString()}</strong> block groups visible
        </span>
        <span className="meta-chip">{hasActiveFilters ? "Filtered View" : "Statewide View"}</span>
      </div>
      <p className="map-helper-text">Select a block group to inspect details.</p>

      <div className="map-stage">
        <MapContainer
          center={[34.05, -111.09]}
          zoom={7}
          preferCanvas={true}
          className="map-view"
          ref={mapRef}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {geoData && (
            <GeoJSON
              key={`${selectedCounty}-${selectedZip}-${geoData.features?.length}`}
              data={geoData}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>

        {isLoading && <div className="map-overlay map-overlay-info">Loading map data...</div>}
        {!isLoading && mapLoadError && !geoData && (
          <div className="map-overlay map-overlay-error">Map data is currently unavailable.</div>
        )}

        <aside className="map-legend" aria-label="Total dosage legend">
          <h4>Total dosage legend</h4>
          <ul>
            {legendRanges.map((item) => (
              <li key={item.label}>
                <span className="legend-swatch" style={{ backgroundColor: item.color }} />
                {item.label}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
};

export default MapComponent;

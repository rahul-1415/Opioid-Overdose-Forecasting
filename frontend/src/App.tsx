import { useEffect, useMemo, useState } from "react";
import MapComponent from "./components/MapComponent";
import NeighborhoodSidebar from "./components/NeighborhoodSidebar";
import Filters from "./components/Filters";
import "./styles/App.css";

type FeatureProperties = Record<string, unknown>;

type GeoFeature = {
  properties?: {
    COUNTYFP?: string | number;
    GEOID?: string | number;
    total_dosage?: number;
  } & Record<string, unknown>;
};

type GeoFeatureCollection = {
  type: string;
  features: GeoFeature[];
};

function App() {
  const [allGeoData, setAllGeoData] = useState<GeoFeatureCollection | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<FeatureProperties | null>(null);
  const [selectedCounty, setSelectedCounty] = useState("All");
  const [selectedZip, setSelectedZip] = useState("All");
  const [zipOptions, setZipOptions] = useState<string[]>([]);

  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.MODE === "development"
      ? "http://localhost:8000"
      : window.location.origin);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const mapUrl = new URL("/map_data", API_BASE).toString();
        const zipUrl = new URL("/zipcodes", API_BASE).toString();
        const [mapRes, zipRes] = await Promise.all([fetch(mapUrl), fetch(zipUrl)]);

        if (!mapRes.ok) {
          console.error("Failed to fetch map data:", mapRes.status, mapRes.statusText);
          return;
        }

        const data = (await mapRes.json()) as GeoFeatureCollection;
        setAllGeoData(data);

        if (zipRes.ok) {
          const zips = (await zipRes.json()) as string[];
          setZipOptions(zips);
        } else {
          // Fallback for environments where /zipcodes is unavailable.
          const uniqueZips = new Set<string>();
          for (const feat of data.features || []) {
            const geoid = String(feat?.properties?.GEOID ?? "");
            if (geoid.length >= 10 && geoid.slice(0, 5).match(/^\d{5}$/)) {
              uniqueZips.add(geoid.slice(5, 10));
            }
          }
          setZipOptions(Array.from(uniqueZips).sort());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchAllData();
  }, [API_BASE]);

  useEffect(() => {
    if (!selectedFeatureId) {
      setSelectedFeature(null);
      return;
    }

    const controller = new AbortController();
    const featureUrl = new URL(`/feature/${selectedFeatureId}`, API_BASE).toString();

    const fetchFeature = async () => {
      try {
        const res = await fetch(featureUrl, { signal: controller.signal });
        if (!res.ok) {
          console.error("Failed to fetch feature details:", res.status, res.statusText);
          setSelectedFeature(null);
          return;
        }

        const featureProps = (await res.json()) as FeatureProperties;
        setSelectedFeature(featureProps);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Error fetching feature details:", error);
        }
      }
    };

    fetchFeature();

    return () => controller.abort();
  }, [API_BASE, selectedFeatureId]);

  const geoData = useMemo(() => {
    if (!allGeoData) {
      return null;
    }

    if (selectedCounty === "All" && selectedZip === "All") {
      return allGeoData;
    }

    const filteredFeatures = (allGeoData.features || []).filter((feat) => {
      const props = feat?.properties ?? {};
      const countyCode = String(props.COUNTYFP ?? "");
      const geoid = String(props.GEOID ?? "");
      const geoidZip = geoid.slice(5, 10);

      if (selectedCounty !== "All" && countyCode !== selectedCounty) {
        return false;
      }

      if (selectedZip !== "All" && geoidZip !== selectedZip) {
        return false;
      }

      return true;
    });

    return {
      type: "FeatureCollection",
      features: filteredFeatures,
    } as GeoFeatureCollection;
  }, [allGeoData, selectedCounty, selectedZip]);

  return (
    <div className="app">
      <div className="header">
        <h1>Neighborhoods at Risk of Overdose in Arizona</h1>
        <Filters
          selectedCounty={selectedCounty}
          selectedZip={selectedZip}
          zipOptions={zipOptions}
          onCountyChange={(county) => {
            setSelectedCounty(county);
            setSelectedFeature(null);
            setSelectedFeatureId(null);
          }}
          onZipChange={(zip) => {
            setSelectedZip(zip);
            setSelectedFeature(null);
            setSelectedFeatureId(null);
          }}
        />
      </div>

      <div className="content">
        <MapComponent
          geoData={geoData}
          onFeatureClick={setSelectedFeatureId}
          selectedFeatureId={selectedFeatureId}
          selectedCounty={selectedCounty}
          selectedZip={selectedZip}
        />
        <NeighborhoodSidebar feature={selectedFeature} />
      </div>
    </div>
  );
}

export default App;

import { useEffect, useMemo, useState } from "react";
import MapComponent from "./components/MapComponent";
import NeighborhoodSidebar from "./components/NeighborhoodSidebar";
import Filters from "./components/Filters";
import "./styles/App.css";

type GeoFeature = {
  properties?: {
    COUNTYFP?: string | number;
    GEOID?: string | number;
  } & Record<string, unknown>;
};

type GeoFeatureCollection = {
  type: string;
  features: GeoFeature[];
};

function App() {
  const [allGeoData, setAllGeoData] = useState<GeoFeatureCollection | null>(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
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
        const res = await fetch(new URL("/get_data", API_BASE).toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          console.error("Failed to fetch data:", res.status, res.statusText);
          return;
        }

        const data = (await res.json()) as GeoFeatureCollection;
        setAllGeoData(data);

        const uniqueZips = new Set<string>();
        for (const feat of data.features || []) {
          const geoid = String(feat?.properties?.GEOID ?? "");
          if (geoid.length >= 10 && geoid.slice(0, 5).match(/^\d{5}$/)) {
            uniqueZips.add(geoid.slice(5, 10));
          }
        }
        setZipOptions(Array.from(uniqueZips).sort());
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchAllData();
  }, [API_BASE]);

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
          }}
          onZipChange={(zip) => {
            setSelectedZip(zip);
            setSelectedFeature(null);
          }}
        />
      </div>

      <div className="content">
        <MapComponent
          geoData={geoData}
          onFeatureClick={setSelectedFeature}
          selectedFeature={selectedFeature}
          selectedCounty={selectedCounty}
        />
        <NeighborhoodSidebar feature={selectedFeature} />
      </div>
    </div>
  );
}

export default App;

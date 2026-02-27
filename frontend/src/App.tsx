import { useEffect, useMemo, useState } from "react";
import MapComponent from "./components/MapComponent";
import NeighborhoodSidebar from "./components/NeighborhoodSidebar";
import Filters from "./components/Filters";
import type { FeatureProperties, MapFeature, MapFeatureCollection } from "./types/geo";
import "./styles/App.css";

function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    const savedTheme = window.localStorage.getItem("theme");
    return savedTheme === "light" ? "light" : "dark";
  });
  const [allGeoData, setAllGeoData] = useState<MapFeatureCollection | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<FeatureProperties | null>(null);
  const [selectedCounty, setSelectedCounty] = useState("All");
  const [selectedZip, setSelectedZip] = useState("All");
  const [zipOptions, setZipOptions] = useState<string[]>([]);
  const [zipQuery, setZipQuery] = useState("");
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [isZipLoading, setIsZipLoading] = useState(true);
  const [isFeatureLoading, setIsFeatureLoading] = useState(false);
  const [featureLoadError, setFeatureLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.MODE === "development"
      ? "http://localhost:8000"
      : window.location.origin);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    let isCancelled = false;

    const fetchAllData = async () => {
      setIsMapLoading(true);
      setIsZipLoading(true);
      setMapLoadError(null);

      try {
        const mapUrl = new URL("/map_data", API_BASE).toString();
        const mapRes = await fetch(mapUrl);

        if (!mapRes.ok) {
          throw new Error(`Map data request failed with status ${mapRes.status}`);
        }

        const data = (await mapRes.json()) as MapFeatureCollection;
        if (isCancelled) {
          return;
        }
        setAllGeoData(data);

        const zipUrl = new URL("/zipcodes", API_BASE).toString();
        const zipRes = await fetch(zipUrl);

        if (zipRes.ok) {
          const zips = (await zipRes.json()) as string[];
          if (!isCancelled) {
            setZipOptions(zips);
          }
        } else {
          // Fallback for environments where /zipcodes is unavailable.
          const uniqueZips = new Set<string>();
          for (const feat of data.features || []) {
            const geoid = String(feat?.properties?.GEOID ?? "");
            if (geoid.length >= 10 && geoid.slice(0, 5).match(/^\d{5}$/)) {
              uniqueZips.add(geoid.slice(5, 10));
            }
          }
          if (!isCancelled) {
            setZipOptions(Array.from(uniqueZips).sort());
          }
        }
      } catch (error) {
        console.error("Error fetching map data:", error);
        if (!isCancelled) {
          setMapLoadError(
            "We could not load map data. Please check your connection and try again."
          );
          setAllGeoData(null);
          setZipOptions([]);
          setSelectedZip("All");
          setSelectedFeatureId(null);
          setSelectedFeature(null);
        }
      } finally {
        if (!isCancelled) {
          setIsMapLoading(false);
          setIsZipLoading(false);
        }
      }
    };

    fetchAllData();

    return () => {
      isCancelled = true;
    };
  }, [API_BASE, reloadKey]);

  useEffect(() => {
    if (!selectedFeatureId) {
      setSelectedFeature(null);
      setIsFeatureLoading(false);
      setFeatureLoadError(null);
      return;
    }

    const controller = new AbortController();
    const featureUrl = new URL(`/feature/${selectedFeatureId}`, API_BASE).toString();

    const fetchFeature = async () => {
      setIsFeatureLoading(true);
      setFeatureLoadError(null);

      try {
        const res = await fetch(featureUrl, { signal: controller.signal });
        if (!res.ok) {
          console.error("Failed to fetch feature details:", res.status, res.statusText);
          setSelectedFeature(null);
          setFeatureLoadError("Unable to load neighborhood details for this selection.");
          return;
        }

        const featureProps = (await res.json()) as FeatureProperties;
        setSelectedFeature(featureProps);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Error fetching feature details:", error);
          setFeatureLoadError("Unable to load neighborhood details for this selection.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsFeatureLoading(false);
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

    const filteredFeatures = (allGeoData.features || []).filter((feat: MapFeature) => {
      const props = feat.properties ?? {};
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
    } as MapFeatureCollection;
  }, [allGeoData, selectedCounty, selectedZip]);

  const statusMessage = mapLoadError
    ? mapLoadError
    : isMapLoading
      ? "Loading map and ZIP data."
      : isFeatureLoading
        ? "Loading neighborhood details."
        : featureLoadError
          ? featureLoadError
          : "Map ready.";

  return (
    <main className="app" role="main" aria-busy={isMapLoading}>
      <p className="sr-live" aria-live="polite">
        {statusMessage}
      </p>

      <header className="header">
        <div className="header-top">
          <p className="eyebrow">Arizona Opioid Risk Explorer</p>
          <label className="theme-toggle" htmlFor="theme-toggle">
            <span className="theme-toggle-text">Dark</span>
            <input
              id="theme-toggle"
              type="checkbox"
              checked={theme === "light"}
              onChange={(event) => setTheme(event.target.checked ? "light" : "dark")}
              aria-label="Toggle light and dark color mode"
            />
            <span className="theme-toggle-track" aria-hidden="true">
              <span className="theme-toggle-thumb" />
            </span>
            <span className="theme-toggle-text">Light</span>
          </label>
        </div>
        <h1>Neighborhoods at Risk of Overdose in Arizona</h1>
        <p className="subheading">
          Use county and ZIP filters to focus the map, then select a block group to view detailed
          social, health, and prescription indicators.
        </p>

        {mapLoadError && (
          <div className="status-alert" role="alert">
            <p>{mapLoadError}</p>
            <button type="button" onClick={() => setReloadKey((prev) => prev + 1)}>
              Retry loading data
            </button>
          </div>
        )}

        <Filters
          selectedCounty={selectedCounty}
          selectedZip={selectedZip}
          zipOptions={zipOptions}
          zipQuery={zipQuery}
          isZipLoading={isZipLoading}
          isZipDisabled={isMapLoading || !!mapLoadError}
          onCountyChange={(county) => {
            setSelectedCounty(county);
            setSelectedFeature(null);
            setSelectedFeatureId(null);
            setFeatureLoadError(null);
          }}
          onZipChange={(zip) => {
            setSelectedZip(zip);
            setSelectedFeature(null);
            setSelectedFeatureId(null);
            setFeatureLoadError(null);
          }}
          onZipQueryChange={setZipQuery}
        />
      </header>

      <section className="content" aria-label="Map and neighborhood details">
        <MapComponent
          geoData={geoData}
          isLoading={isMapLoading}
          mapLoadError={mapLoadError}
          onFeatureClick={setSelectedFeatureId}
          selectedFeatureId={selectedFeatureId}
          selectedCounty={selectedCounty}
          selectedZip={selectedZip}
        />
        <NeighborhoodSidebar
          feature={selectedFeature}
          isLoading={isFeatureLoading}
          errorMessage={featureLoadError}
        />
      </section>
    </main>
  );
}

export default App;

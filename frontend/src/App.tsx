// import { useEffect, useState } from "react";
// import MapComponent from "./components/MapComponent";
// import NeighborhoodSidebar from "./components/NeighborhoodSidebar";
// import Filters from "./components/Filters";
// import "./styles/App.css";

// function App() {
//   const [geoData, setGeoData] = useState(null);
//   const [selectedFeature, setSelectedFeature] = useState(null);
//   const [selectedCounty, setSelectedCounty] = useState("All");
//   const [selectedZip, setSelectedZip] = useState("All");

//   useEffect(() => {
//     fetchData();
//   }, [selectedCounty, selectedZip]);

//   const fetchData = async () => {
//     const isDefault = selectedCounty === "All" && selectedZip === "All";
//     const url = new URL(
//       isDefault ? "/get_data" : "/filter",
//       window.location.origin
//     );

//     if (!isDefault) {
//       url.searchParams.append("county", selectedCounty);
//       url.searchParams.append("zip_code", selectedZip);
//     }

//     try {
//       const res = await fetch(url.toString(), {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//         }
//       });

//       if (!res.ok) {
//         console.error("Failed to fetch data:", res.status, res.statusText);
//         return;
//       }

//       const data = await res.json();
//       setGeoData(data);
//     } catch (error) {
//       console.error("Error fetching data:", error);
//     }
//   };

//   return (
//     <div className="app">
//       <div className="header">
//         <h1>Neighborhoods at Risk of Overdose in Arizona</h1>
//         <Filters
//           selectedCounty={selectedCounty}
//           selectedZip={selectedZip}
//           onCountyChange={setSelectedCounty}
//           onZipChange={setSelectedZip}
//         />
//       </div>

//       <div className="content">
//         <MapComponent
//           geoData={geoData}
//           onFeatureClick={setSelectedFeature}
//           selectedFeature={selectedFeature}
//         />
//         <NeighborhoodSidebar feature={selectedFeature} />
//       </div>
//     </div>
//   );
// }

// export default App;


import { useEffect, useState } from "react";
import MapComponent from "./components/MapComponent";
import NeighborhoodSidebar from "./components/NeighborhoodSidebar";
import Filters from "./components/Filters";
import "./styles/App.css";

function App() {
  const [geoData, setGeoData] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);  // for clicked CBG
  const [selectedCounty, setSelectedCounty] = useState("All");
  const [selectedZip, setSelectedZip] = useState("All");
  const [zipOptions, setZipOptions] = useState<string[]>([]);

  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.MODE === "development"
      ? "http://localhost:8000"
      : window.location.origin);

  useEffect(() => {
    fetchData();
  }, [selectedCounty, selectedZip]);

  useEffect(() => {
    fetch(new URL("/zipcodes", API_BASE))
      .then((res) => res.json())
      .then((data) => setZipOptions(data))
      .catch((err) => console.error("Failed to load ZIP codes:", err));
  }, []);

  const fetchData = async () => {
    const isDefault = selectedCounty === "All" && selectedZip === "All";
    const url = new URL(isDefault ? "/get_data" : "/filter", API_BASE);

    if (!isDefault) {
      url.searchParams.append("county", selectedCounty);
      url.searchParams.append("zip_code", selectedZip);
    }

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.error("Failed to fetch data:", res.status, res.statusText);
        return;
      }

      const data = await res.json();
      setGeoData(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

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
    setSelectedFeature(null);  // ✅ Clear the highlighted CBG
  }}
  onZipChange={(zip) => {
    setSelectedZip(zip);
    setSelectedFeature(null);  // ✅ Clear on ZIP filter change too
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

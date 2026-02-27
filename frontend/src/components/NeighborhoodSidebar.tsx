import React, { useEffect, useState } from "react";
import "../styles/NeighborhoodSidebar.css";
import type { FeatureProperties } from "../types/geo";

interface Props {
  feature: FeatureProperties | null;
  isLoading: boolean;
  errorMessage: string | null;
}

type FeatureRow = {
  key: string;
  label: string;
  value: unknown;
};

type SidebarCategory = {
  id: string;
  title: string;
  matches: (key: string) => boolean;
};

const KEY_INDICATOR_KEYS = [
  "name",
  "GEOID",
  "COUNTYFP",
  "total_dosage",
  "total_mme",
  "life_expectancy",
  "life_expectancy_se",
  "tot_pop",
  "med_hh_inc",
  "per_capita_inc",
  "pov_pop",
  "pop_w_ins",
] as const;

const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  {
    id: "demographics",
    title: "Demographics",
    matches: (key) =>
      key === "tot_pop" ||
      key === "male" ||
      key === "female" ||
      key === "white" ||
      key === "black" ||
      key === "aian" ||
      key === "asian" ||
      key === "hisp" ||
      key === "other" ||
      key === "two_or_more" ||
      key.startsWith("pop_"),
  },
  {
    id: "income-poverty",
    title: "Income & Poverty",
    matches: (key) =>
      key.startsWith("ag_") ||
      key.startsWith("med_") ||
      key.startsWith("inc_") ||
      key.startsWith("pov_") ||
      key === "per_capita_inc" ||
      key.startsWith("hh_w_"),
  },
  {
    id: "household-housing",
    title: "Households & Housing",
    matches: (key) =>
      key.startsWith("hh_") ||
      key.startsWith("hu_") ||
      key.startsWith("hs_") ||
      key === "tot_hh" ||
      key === "fam_hh" ||
      key === "mar_hh" ||
      key === "nonfam_hh" ||
      key === "norel_hh" ||
      key.startsWith("sngl_") ||
      key === "avrg_hh_size",
  },
  {
    id: "work-transport",
    title: "Employment & Commute",
    matches: (key) =>
      key.startsWith("commute_") ||
      key === "workers" ||
      key === "in_state" ||
      key === "out_state" ||
      key === "in_labfce" ||
      key === "empl" ||
      key === "unempl",
  },
  {
    id: "education-language",
    title: "Education & Language",
    matches: (key) =>
      key.startsWith("in_") ||
      key === "no_hs" ||
      key === "hs" ||
      key === "ged" ||
      key === "some_college" ||
      key === "associates" ||
      key === "bachelors" ||
      key === "masters" ||
      key === "prof" ||
      key === "doctorate" ||
      key.endsWith("_only"),
  },
  {
    id: "health-access",
    title: "Health & Access",
    matches: (key) =>
      key.startsWith("adhs_") ||
      key === "total_dosage" ||
      key === "total_mme" ||
      key === "life_expectancy" ||
      key === "life_expectancy_se" ||
      key === "pop_w_ins" ||
      key === "religious_orgs" ||
      key === "libraries" ||
      key === "public_housing_developments",
  },
  {
    id: "veteran-civic",
    title: "Veterans & Civic",
    matches: (key) => key === "veterans" || key.startsWith("vet_"),
  },
  {
    id: "geo-metadata",
    title: "Geography & Metadata",
    matches: (key) =>
      key === "STATEFP" ||
      key === "COUNTYFP" ||
      key === "TRACTCE" ||
      key === "BLKGRPCE" ||
      key === "GEOID" ||
      key === "NAMELSAD" ||
      key === "name" ||
      key === "ALAND" ||
      key === "AWATER" ||
      key === "INTPTLAT" ||
      key === "INTPTLON" ||
      key === "MTFCC" ||
      key === "FUNCSTAT" ||
      key === "id_x" ||
      key === "id_y" ||
      key === "geoid_y",
  },
];

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
  }

  return String(value);
};

const readableLabel = (key: string): string => {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const parseCsvLine = (line: string): [string, string] => {
  const [rawKey = "", rawLabel = ""] = line.split(",", 2);
  return [rawKey.trim().replace(/^\uFEFF/, ""), rawLabel.trim()];
};

const buildRows = (
  feature: FeatureProperties,
  descriptions: Record<string, string>
): FeatureRow[] => {
  return Object.entries(feature)
    .map(([key, value]) => ({
      key,
      label: descriptions[key] ?? readableLabel(key),
      value,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

const NeighborhoodSidebar: React.FC<Props> = ({ feature, isLoading, errorMessage }) => {
  const [descriptions, setDescriptions] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetch("/variable_names.csv")
      .then((res) => res.text())
      .then((csv) => {
        const lines = csv.trim().split(/\r?\n/);
        const map: { [key: string]: string } = {};

        lines.forEach((line, index) => {
          const [key, label] = parseCsvLine(line);
          if (!key || !label) {
            return;
          }

          // Skip CSV header row.
          if (index === 0 && key.toLowerCase() === "variable") {
            return;
          }

          map[key] = label;
        });
        setDescriptions(map);
      })
      .catch((err) => console.error("Failed to load variable names:", err));
  }, []);

  if (isLoading) {
    return (
      <aside className="sidebar" aria-busy="true" aria-label="Neighborhood details panel">
        <h3>Neighborhood Characteristics</h3>
        <div className="sidebar-loading">
          <p>Loading neighborhood details...</p>
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      </aside>
    );
  }

  if (errorMessage) {
    return (
      <aside
        className="sidebar sidebar-empty"
        aria-busy="false"
        aria-label="Neighborhood details panel"
      >
        <h3>Neighborhood Characteristics</h3>
        <p>{errorMessage}</p>
      </aside>
    );
  }

  if (!feature) {
    return (
      <aside
        className="sidebar sidebar-empty"
        aria-busy="false"
        aria-label="Neighborhood details panel"
      >
        <h3>Neighborhood Characteristics</h3>
        <p>
          Select a block group on the map to inspect population, housing, and healthcare
          context for that neighborhood.
        </p>
      </aside>
    );
  }

  const allRows = buildRows(feature, descriptions);
  const highlightRows = KEY_INDICATOR_KEYS
    .map((key) => allRows.find((row) => row.key === key))
    .filter((row): row is FeatureRow => Boolean(row));

  const highlightSet = new Set(highlightRows.map((row) => row.key));
  const remainingRows = allRows.filter((row) => !highlightSet.has(row.key));

  const categorizedRows = SIDEBAR_CATEGORIES.map((category) => ({
    ...category,
    rows: remainingRows.filter((row) => category.matches(row.key)),
  })).filter((category) => category.rows.length > 0);

  const categorizedKeySet = new Set(
    categorizedRows.flatMap((category) => category.rows.map((row) => row.key))
  );
  const uncategorizedRows = remainingRows.filter((row) => !categorizedKeySet.has(row.key));

  return (
    <aside className="sidebar" aria-busy="false" aria-label="Neighborhood details panel">
      <h3>Neighborhood Characteristics</h3>
      <div className="sidebar-table-wrap">
        <div className="sidebar-content">
          {highlightRows.length > 0 && (
            <section className="sidebar-highlights" aria-label="Key indicators">
              <h4>Key Indicators</h4>
              <div className="highlight-grid">
                {highlightRows.map((row) => (
                  <article key={row.key} className="highlight-item">
                    <p>{row.label}</p>
                    <strong>{formatValue(row.value)}</strong>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="sidebar-sections" aria-label="Detailed categories">
            {categorizedRows.map((category, index) => (
              <details key={category.id} className="sidebar-section" open={index === 0}>
                <summary>
                  <span>{category.title}</span>
                  <span className="section-count">{category.rows.length}</span>
                </summary>
                <table>
                  <tbody>
                    {category.rows.map((row) => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        <td>{formatValue(row.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            ))}

            {uncategorizedRows.length > 0 && (
              <details className="sidebar-section">
                <summary>
                  <span>Other Data</span>
                  <span className="section-count">{uncategorizedRows.length}</span>
                </summary>
                <table>
                  <tbody>
                    {uncategorizedRows.map((row) => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        <td>{formatValue(row.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </section>
        </div>
      </div>
    </aside>
  );
};

export default NeighborhoodSidebar;

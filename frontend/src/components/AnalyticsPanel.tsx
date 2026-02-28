import { useMemo } from "react";
import type { MapFeatureCollection } from "../types/geo";

interface Props {
  geoData: MapFeatureCollection | null;
  isLoading: boolean;
  errorMessage: string | null;
  selectedCounty: string;
  selectedZip: string;
}

type CountyAggregate = {
  countyCode: string;
  countyName: string;
  blockGroups: number;
  totalDosage: number;
};

type DosageBucket = {
  label: string;
  minExclusive: number;
  maxInclusive: number;
};

const COUNTY_LABELS: Record<string, string> = {
  "001": "Apache",
  "003": "Cochise",
  "005": "Coconino",
  "007": "Gila",
  "009": "Graham",
  "011": "Greenlee",
  "012": "La Paz",
  "013": "Maricopa",
  "015": "Mohave",
  "017": "Navajo",
  "019": "Pima",
  "021": "Pinal",
  "023": "Santa Cruz",
  "025": "Yavapai",
  "027": "Yuma",
};

const DOSAGE_BUCKETS: DosageBucket[] = [
  { label: "<= 10", minExclusive: Number.NEGATIVE_INFINITY, maxInclusive: 10 },
  { label: "11 - 20", minExclusive: 10, maxInclusive: 20 },
  { label: "21 - 50", minExclusive: 20, maxInclusive: 50 },
  { label: "51 - 100", minExclusive: 50, maxInclusive: 100 },
  { label: "101 - 200", minExclusive: 100, maxInclusive: 200 },
  { label: "201 - 500", minExclusive: 200, maxInclusive: 500 },
  { label: "501 - 1000", minExclusive: 500, maxInclusive: 1000 },
  { label: "> 1000", minExclusive: 1000, maxInclusive: Number.POSITIVE_INFINITY },
];

const DOC_KEY_FINDINGS = [
  "Stronger opioid dispensing is associated with higher ADHS healthcare facility density.",
  "Documented facility-to-dosage correlations: medical (0.25), licensed (0.24), urgent care (0.24).",
  "Priority risk domains in the documentation: socioeconomic stress, housing instability, care access, age structure, and veterans/disability concentration.",
  "Modeling workflow is a demo prototype (synthetic target) and not yet suitable for real risk inference until validated overdose outcome data is integrated.",
];

const DOC_ENGINEERED_FEATURES = [
  { name: "Poverty Rate", formula: "pov_pop / tot_pop" },
  { name: "Healthcare Score", formula: "ADHS facility counts per neighborhood" },
  { name: "Higher Education Rate", formula: "(bachelors + masters + doctorate) / tot_pop" },
  {
    name: "Housing Quality",
    formula: "(-1 * crowded housing) + kitchen access + plumbing access",
  },
  {
    name: "Vulnerability Index",
    formula: "Composite of socioeconomic, healthcare, education, and housing factors",
  },
];

const getCountyLabel = (countyCode: string): string => COUNTY_LABELS[countyCode] ?? countyCode;

const toNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const toStringValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return "";
};

const formatNumber = (value: number): string => value.toLocaleString(undefined, { maximumFractionDigits: 1 });

const AnalyticsPanel: React.FC<Props> = ({
  geoData,
  isLoading,
  errorMessage,
  selectedCounty,
  selectedZip,
}) => {
  const analytics = useMemo(() => {
    const features = geoData?.features ?? [];
    if (features.length === 0) {
      return null;
    }

    const dosageValues: number[] = [];
    const countyTotals = new Map<string, CountyAggregate>();
    const topBlockGroups: Array<{ geoid: string; countyCode: string; dosage: number }> = [];
    const uniqueZips = new Set<string>();

    for (const feature of features) {
      const props = feature.properties ?? {};
      const countyCode = toStringValue(props.COUNTYFP);
      const geoid = toStringValue(props.GEOID);
      const dosage = toNumber(props.total_dosage);

      dosageValues.push(dosage);
      topBlockGroups.push({ geoid, countyCode, dosage });

      if (geoid.length >= 10) {
        uniqueZips.add(geoid.slice(5, 10));
      }

      const existing = countyTotals.get(countyCode);
      if (!existing) {
        countyTotals.set(countyCode, {
          countyCode,
          countyName: getCountyLabel(countyCode),
          blockGroups: 1,
          totalDosage: dosage,
        });
      } else {
        existing.blockGroups += 1;
        existing.totalDosage += dosage;
      }
    }

    const totalDosage = dosageValues.reduce((sum, value) => sum + value, 0);
    const avgDosage = totalDosage / dosageValues.length;

    const sortedDosage = [...dosageValues].sort((a, b) => a - b);
    const middle = Math.floor(sortedDosage.length / 2);
    const medianDosage =
      sortedDosage.length % 2 === 0
        ? (sortedDosage[middle - 1] + sortedDosage[middle]) / 2
        : sortedDosage[middle];

    const countyRanked = [...countyTotals.values()]
      .sort((a, b) => b.totalDosage - a.totalDosage)
      .slice(0, 6)
      .map((entry) => ({
        ...entry,
        avgDosage: entry.totalDosage / entry.blockGroups,
      }));

    const highestDosageCBGs = topBlockGroups
      .sort((a, b) => b.dosage - a.dosage)
      .slice(0, 10)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
        countyName: getCountyLabel(entry.countyCode),
      }));

    const dosageDistribution = DOSAGE_BUCKETS.map((bucket) => {
      const count = dosageValues.filter(
        (value) => value > bucket.minExclusive && value <= bucket.maxInclusive
      ).length;
      return {
        ...bucket,
        count,
      };
    });

    const maxBucketCount = Math.max(...dosageDistribution.map((bucket) => bucket.count), 1);

    return {
      blockGroups: features.length,
      uniqueZips: uniqueZips.size,
      totalDosage,
      avgDosage,
      medianDosage,
      countyRanked,
      highestDosageCBGs,
      dosageDistribution,
      maxBucketCount,
    };
  }, [geoData]);

  const filterContext = useMemo(() => {
    const countyLabel = selectedCounty === "All" ? "All Counties" : getCountyLabel(selectedCounty);
    const zipLabel = selectedZip === "All" ? "All ZIPs" : selectedZip;
    return `${countyLabel} | ${zipLabel}`;
  }, [selectedCounty, selectedZip]);

  if (isLoading && !analytics) {
    return (
      <section className="analytics-content" aria-label="Analytics dashboard">
        <div className="analytics-panel analytics-state">
          <h2>Analytics</h2>
          <p>Preparing analytics from map data...</p>
        </div>
      </section>
    );
  }

  if (errorMessage && !analytics) {
    return (
      <section className="analytics-content" aria-label="Analytics dashboard">
        <div className="analytics-panel analytics-state">
          <h2>Analytics</h2>
          <p>{errorMessage}</p>
        </div>
      </section>
    );
  }

  if (!analytics) {
    return (
      <section className="analytics-content" aria-label="Analytics dashboard">
        <div className="analytics-panel analytics-state">
          <h2>Analytics</h2>
          <p>No records available for the current filter selection.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="analytics-content" aria-label="Analytics dashboard">
      <div className="analytics-panel">
        <div className="analytics-head">
          <h2>Analytics Snapshot</h2>
          <p>Current filter scope: {filterContext}</p>
        </div>

        <div className="analytics-kpi-grid" aria-label="Top metrics">
          <article className="analytics-kpi">
            <span>Visible CBGs</span>
            <strong>{analytics.blockGroups.toLocaleString()}</strong>
          </article>
          <article className="analytics-kpi">
            <span>Total Dosage</span>
            <strong>{formatNumber(analytics.totalDosage)}</strong>
          </article>
          <article className="analytics-kpi">
            <span>Average Dosage / CBG</span>
            <strong>{formatNumber(analytics.avgDosage)}</strong>
          </article>
          <article className="analytics-kpi">
            <span>Median Dosage / CBG</span>
            <strong>{formatNumber(analytics.medianDosage)}</strong>
          </article>
          <article className="analytics-kpi">
            <span>Unique ZIPs Covered</span>
            <strong>{analytics.uniqueZips.toLocaleString()}</strong>
          </article>
        </div>

        <div className="analytics-grid">
          <article className="analytics-card">
            <h3>Dosage Distribution</h3>
            <ul className="dosage-buckets">
              {analytics.dosageDistribution.map((bucket) => (
                <li key={bucket.label}>
                  <span>{bucket.label}</span>
                  <div className="bucket-track" aria-hidden="true">
                    <div
                      className="bucket-fill"
                      style={{ width: `${(bucket.count / analytics.maxBucketCount) * 100}%` }}
                    />
                  </div>
                  <strong>{bucket.count.toLocaleString()}</strong>
                </li>
              ))}
            </ul>
          </article>

          <article className="analytics-card">
            <h3>Top Counties by Total Dosage</h3>
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>County</th>
                  <th>CBGs</th>
                  <th>Total</th>
                  <th>Avg</th>
                </tr>
              </thead>
              <tbody>
                {analytics.countyRanked.map((county) => (
                  <tr key={county.countyCode}>
                    <td>{county.countyName}</td>
                    <td>{county.blockGroups.toLocaleString()}</td>
                    <td>{formatNumber(county.totalDosage)}</td>
                    <td>{formatNumber(county.avgDosage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="analytics-card">
            <h3>Highest Dosage Block Groups</h3>
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>GEOID</th>
                  <th>County</th>
                  <th>Dosage</th>
                </tr>
              </thead>
              <tbody>
                {analytics.highestDosageCBGs.map((row) => (
                  <tr key={row.geoid || `${row.countyCode}-${row.rank}`}>
                    <td>{row.rank}</td>
                    <td>{row.geoid || "N/A"}</td>
                    <td>{row.countyName}</td>
                    <td>{formatNumber(row.dosage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="analytics-card">
            <h3>EDA Findings (Documentation)</h3>
            <ul className="analytics-list">
              {DOC_KEY_FINDINGS.map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ul>
          </article>

          <article className="analytics-card">
            <h3>Engineered Features Used</h3>
            <ul className="analytics-list">
              {DOC_ENGINEERED_FEATURES.map((feature) => (
                <li key={feature.name}>
                  <span className="formula-name">{feature.name}</span>
                  <code>{feature.formula}</code>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
};

export default AnalyticsPanel;

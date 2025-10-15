import { useMemo, useState } from "react";
import type { ElementRecord } from "@bio-sim/atomic-data";

interface PeriodicTableProps {
  readonly elements: ElementRecord[];
  readonly activeSymbol?: string;
  onSelect(symbol: string): void;
}

const POSITIONS: Record<string, { column: number; row: number }> = {
  // Period 1
  H: { column: 1, row: 1 },
  He: { column: 18, row: 1 },

  // Period 2
  Li: { column: 1, row: 2 },
  Be: { column: 2, row: 2 },
  B: { column: 13, row: 2 },
  C: { column: 14, row: 2 },
  N: { column: 15, row: 2 },
  O: { column: 16, row: 2 },
  F: { column: 17, row: 2 },
  Ne: { column: 18, row: 2 },

  // Period 3
  Na: { column: 1, row: 3 },
  Mg: { column: 2, row: 3 },
  Al: { column: 13, row: 3 },
  Si: { column: 14, row: 3 },
  P: { column: 15, row: 3 },
  S: { column: 16, row: 3 },
  Cl: { column: 17, row: 3 },
  Ar: { column: 18, row: 3 },

  // Period 4
  K: { column: 1, row: 4 },
  Ca: { column: 2, row: 4 },
  Sc: { column: 3, row: 4 },
  Ti: { column: 4, row: 4 },
  V: { column: 5, row: 4 },
  Cr: { column: 6, row: 4 },
  Mn: { column: 7, row: 4 },
  Fe: { column: 8, row: 4 },
  Co: { column: 9, row: 4 },
  Ni: { column: 10, row: 4 },
  Cu: { column: 11, row: 4 },
  Zn: { column: 12, row: 4 },
  Ga: { column: 13, row: 4 },
  Ge: { column: 14, row: 4 },
  As: { column: 15, row: 4 },
  Se: { column: 16, row: 4 },
  Br: { column: 17, row: 4 },
  Kr: { column: 18, row: 4 },

  // Period 5
  Rb: { column: 1, row: 5 },
  Sr: { column: 2, row: 5 },
  Y: { column: 3, row: 5 },
  Zr: { column: 4, row: 5 },
  Nb: { column: 5, row: 5 },
  Mo: { column: 6, row: 5 },
  Tc: { column: 7, row: 5 },
  Ru: { column: 8, row: 5 },
  Rh: { column: 9, row: 5 },
  Pd: { column: 10, row: 5 },
  Ag: { column: 11, row: 5 },
  Cd: { column: 12, row: 5 },
  In: { column: 13, row: 5 },
  Sn: { column: 14, row: 5 },
  Sb: { column: 15, row: 5 },
  Te: { column: 16, row: 5 },
  I: { column: 17, row: 5 },
  Xe: { column: 18, row: 5 },

  // Period 6
  Cs: { column: 1, row: 6 },
  Ba: { column: 2, row: 6 },
  Hf: { column: 4, row: 6 },
  Ta: { column: 5, row: 6 },
  W: { column: 6, row: 6 },
  Re: { column: 7, row: 6 },
  Os: { column: 8, row: 6 },
  Ir: { column: 9, row: 6 },
  Pt: { column: 10, row: 6 },
  Au: { column: 11, row: 6 },
  Hg: { column: 12, row: 6 },
  Tl: { column: 13, row: 6 },
  Pb: { column: 14, row: 6 },
  Bi: { column: 15, row: 6 },
  Po: { column: 16, row: 6 },
  At: { column: 17, row: 6 },
  Rn: { column: 18, row: 6 },
};

const CATEGORY_COLORS = {
  "nonmetal": { color: "rgba(255, 193, 7, 0.8)", name: "Nonmetals" },
  "alkali metal": { color: "rgba(220, 53, 69, 0.8)", name: "Alkali Metals" },
  "alkaline earth metal": { color: "rgba(255, 102, 0, 0.8)", name: "Alkaline Earth Metals" },
  "transition metal": { color: "rgba(74, 144, 226, 0.8)", name: "Transition Metals" },
  "metalloid": { color: "rgba(108, 117, 125, 0.8)", name: "Metalloids" },
  "post-transition metal": { color: "rgba(40, 167, 69, 0.8)", name: "Post-transition Metals" },
  "halogen": { color: "rgba(138, 43, 226, 0.8)", name: "Halogens" },
  "noble gas": { color: "rgba(23, 162, 184, 0.8)", name: "Noble Gases" },
};

export function PeriodicTable({ elements, activeSymbol, onSelect }: PeriodicTableProps) {
  const [query, setQuery] = useState("");

  const filteredElements = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return elements;
    }
    return elements.filter((element) => {
      if (element.symbol.toLowerCase().includes(normalized)) {
        return true;
      }
      if (element.element.toLowerCase().includes(normalized)) {
        return true;
      }
      if (String(element.atomicNumber).includes(normalized)) {
        return true;
      }
      return false;
    });
  }, [elements, query]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(elements.map(el => el.category));
    return Array.from(categories).sort();
  }, [elements]);

  return (
    <div className="periodic-grid-wrapper">
      <div className="periodic-table__search">
        <input
          type="search"
          placeholder="Search element or atomic #"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="category-legend">
        <div className="category-legend__title">Element Categories</div>
        <div className="category-legend__items">
          {uniqueCategories.map((category) => {
            const categoryInfo = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS];
            if (!categoryInfo) {return null;}
            return (
              <div key={category} className="category-legend__item">
                <div
                  className="category-legend__swatch"
                  style={{ backgroundColor: categoryInfo.color }}
                />
                <span>{categoryInfo.name}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="periodic-grid">
        {filteredElements.map((element) => {
        const active = element.symbol === activeSymbol;
        const categorySlug = element.category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const classes = ["periodic-tile", `periodic-tile--${categorySlug}`];
        if (active) {
          classes.push("active");
        }
        const position = POSITIONS[element.symbol];
        const style = position
          ? { gridColumn: position.column, gridRow: position.row }
          : undefined;
        return (
          <button
            key={element.symbol}
            type="button"
            className={classes.join(" ")}
            style={style}
            onClick={() => onSelect(element.symbol)}
          >
            <span className="periodic-tile__number">{element.atomicNumber}</span>
            <strong>{element.symbol}</strong>
            <span className="periodic-tile__mass">{element.atomicMass.toFixed(3)}</span>
          </button>
        );
        })}
      </div>
    </div>
  );
}

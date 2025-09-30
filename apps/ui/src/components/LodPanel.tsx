import type { LodAsset } from "@bio-sim/atomic-data";

interface LodPanelProps {
  readonly assets: LodAsset[];
}

export function LodPanel({ assets }: LodPanelProps) {
  return (
    <div className="lod-panel">
      <table>
        <thead>
          <tr>
            <th>Level</th>
            <th>Description</th>
            <th>Atoms (≈)</th>
            <th>Asset</th>
            <th>Shading</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.level}>
              <td>LOD {asset.level}</td>
              <td>{asset.description}</td>
              <td>{asset.approxAtomCount.toLocaleString()}</td>
              <td>{asset.geometryAsset}</td>
              <td>{asset.shadingProfile}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

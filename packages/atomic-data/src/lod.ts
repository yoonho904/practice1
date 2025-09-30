export interface LodAsset {
  readonly level: 0 | 1 | 2 | 3;
  readonly description: string;
  readonly approxAtomCount: number;
  readonly geometryAsset: string;
  readonly shadingProfile: string;
}

export const ribosomeLodAssets: LodAsset[] = [
  {
    level: 0,
    description: "Macro mesh of ribosomal subunits with volumetric membranes",
    approxAtomCount: 5_000,
    geometryAsset: "assets/ribosome/lod0.glb",
    shadingProfile: "pbr-volumetric",
  },
  {
    level: 1,
    description: "RNP complexes instanced across translation cycle",
    approxAtomCount: 100_000,
    geometryAsset: "assets/ribosome/lod1.glb",
    shadingProfile: "pbr-instanced",
  },
  {
    level: 2,
    description: "Atomistic residues with billboard solvent shell",
    approxAtomCount: 2_300_000,
    geometryAsset: "assets/ribosome/lod2.bin",
    shadingProfile: "deferred-points",
  },
  {
    level: 3,
    description: "Hybrid QM/MM pocket regions for catalytic snapshots",
    approxAtomCount: 120_000,
    geometryAsset: "assets/ribosome/lod3-pocket.qmmm",
    shadingProfile: "spectral-volumetric",
  },
];

export const translationMicroDomainLod: LodAsset[] = [
  {
    level: 0,
    description: "Microtubule scaffold with motor protein rails",
    approxAtomCount: 180_000,
    geometryAsset: "assets/cell/translation-rail-lod0.glb",
    shadingProfile: "anisotropic-specular",
  },
  {
    level: 1,
    description: "Vesicle pools, tRNA crowding fields, ATP gradients",
    approxAtomCount: 950_000,
    geometryAsset: "assets/cell/translation-rail-lod1.glb",
    shadingProfile: "instanced-particles",
  },
  {
    level: 2,
    description: "Single ribosome cohorts with nascent peptide traces",
    approxAtomCount: 3_400_000,
    geometryAsset: "assets/cell/translation-rail-lod2.bin",
    shadingProfile: "deferred-lines",
  },
];

export interface ElementProfile {
  readonly symbol: string;
  readonly covalentRadiusPm: number; // picometers
  readonly vdwRadiusPm: number; // picometers
  readonly standardBondEnergyKJ: number; // kJ/mol representative single bond energy
  readonly hydrationEntropy: number; // J/(mol·K)
  readonly preferredCoordination: number;
}

const ELEMENT_PROFILES: Record<string, ElementProfile> = {
  Li: {
    symbol: "Li",
    covalentRadiusPm: 128,
    vdwRadiusPm: 182,
    standardBondEnergyKJ: 159,
    hydrationEntropy: -130,
    preferredCoordination: 4,
  },
  H: {
    symbol: "H",
    covalentRadiusPm: 31,
    vdwRadiusPm: 120,
    standardBondEnergyKJ: 436,
    hydrationEntropy: -56,
    preferredCoordination: 1,
  },
  C: {
    symbol: "C",
    covalentRadiusPm: 76,
    vdwRadiusPm: 170,
    standardBondEnergyKJ: 358,
    hydrationEntropy: -45,
    preferredCoordination: 4,
  },
  N: {
    symbol: "N",
    covalentRadiusPm: 71,
    vdwRadiusPm: 155,
    standardBondEnergyKJ: 305,
    hydrationEntropy: -50,
    preferredCoordination: 3,
  },
  O: {
    symbol: "O",
    covalentRadiusPm: 66,
    vdwRadiusPm: 152,
    standardBondEnergyKJ: 498,
    hydrationEntropy: -60,
    preferredCoordination: 2,
  },
  P: {
    symbol: "P",
    covalentRadiusPm: 107,
    vdwRadiusPm: 180,
    standardBondEnergyKJ: 201,
    hydrationEntropy: -35,
    preferredCoordination: 5,
  },
  S: {
    symbol: "S",
    covalentRadiusPm: 105,
    vdwRadiusPm: 180,
    standardBondEnergyKJ: 265,
    hydrationEntropy: -40,
    preferredCoordination: 2,
  },
  Mg: {
    symbol: "Mg",
    covalentRadiusPm: 141,
    vdwRadiusPm: 173,
    standardBondEnergyKJ: 147,
    hydrationEntropy: -150,
    preferredCoordination: 6,
  },
  Cr: {
    symbol: "Cr",
    covalentRadiusPm: 128,
    vdwRadiusPm: 200,
    standardBondEnergyKJ: 352,
    hydrationEntropy: -115,
    preferredCoordination: 6,
  },
  Mn: {
    symbol: "Mn",
    covalentRadiusPm: 127,
    vdwRadiusPm: 197,
    standardBondEnergyKJ: 322,
    hydrationEntropy: -120,
    preferredCoordination: 6,
  },
  Na: {
    symbol: "Na",
    covalentRadiusPm: 166,
    vdwRadiusPm: 227,
    standardBondEnergyKJ: 104,
    hydrationEntropy: -110,
    preferredCoordination: 6,
  },
  K: {
    symbol: "K",
    covalentRadiusPm: 203,
    vdwRadiusPm: 275,
    standardBondEnergyKJ: 90,
    hydrationEntropy: -80,
    preferredCoordination: 6,
  },
  Ca: {
    symbol: "Ca",
    covalentRadiusPm: 176,
    vdwRadiusPm: 231,
    standardBondEnergyKJ: 150,
    hydrationEntropy: -120,
    preferredCoordination: 7,
  },
  Fe: {
    symbol: "Fe",
    covalentRadiusPm: 132,
    vdwRadiusPm: 194,
    standardBondEnergyKJ: 388,
    hydrationEntropy: -110,
    preferredCoordination: 6,
  },
  Co: {
    symbol: "Co",
    covalentRadiusPm: 126,
    vdwRadiusPm: 192,
    standardBondEnergyKJ: 375,
    hydrationEntropy: -108,
    preferredCoordination: 6,
  },
  Ni: {
    symbol: "Ni",
    covalentRadiusPm: 124,
    vdwRadiusPm: 190,
    standardBondEnergyKJ: 380,
    hydrationEntropy: -102,
    preferredCoordination: 6,
  },
  Cu: {
    symbol: "Cu",
    covalentRadiusPm: 132,
    vdwRadiusPm: 186,
    standardBondEnergyKJ: 343,
    hydrationEntropy: -104,
    preferredCoordination: 4,
  },
  Zn: {
    symbol: "Zn",
    covalentRadiusPm: 122,
    vdwRadiusPm: 210,
    standardBondEnergyKJ: 285,
    hydrationEntropy: -105,
    preferredCoordination: 4,
  },
  Se: {
    symbol: "Se",
    covalentRadiusPm: 120,
    vdwRadiusPm: 190,
    standardBondEnergyKJ: 270,
    hydrationEntropy: -80,
    preferredCoordination: 2,
  },
  Mo: {
    symbol: "Mo",
    covalentRadiusPm: 154,
    vdwRadiusPm: 209,
    standardBondEnergyKJ: 560,
    hydrationEntropy: -135,
    preferredCoordination: 6,
  },
};

export function getElementProfile(symbol: string): ElementProfile | undefined {
  return ELEMENT_PROFILES[symbol];
}

export const SUPPORTED_PROFILES = Object.keys(ELEMENT_PROFILES);

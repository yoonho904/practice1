import { HydrogenLikeAtom, type QuantumNumbers } from '../../../../services/quantum-engine/src/index.js';
import {
  generateOrbitalParticles,
  clearOrbitalSamplingCaches,
  getOrbitalCacheKey,
  FIELD_EXTENT_TOLERANCE,
  type OrbitalCacheKey,
  type OrbitalSamplingResult,
} from '../physics/orbitalSampling.js';
import { computeDensityField } from '../physics/densityField.js';
import { computeNodalSurfaceData, type NodalSurfaceData } from '../physics/nodalSurfaces.js';

type SampleRequestMessage = {
  id: number;
  type: 'sample';
  payload: {
    atomicNumber: number;
    quantumNumbers: QuantumNumbers;
    count: number;
    isDarkBackground: boolean;
  };
};

type NodalDataRequestMessage = {
  id: number;
  type: 'nodal-data';
  payload: {
    atomicNumber: number;
    quantumNumbers: QuantumNumbers;
    extent: number;
  };
};

type ClearCacheMessage = {
  id: number;
  type: 'clear-caches';
};

type OutlineFieldRequestMessage = {
  id: number;
  type: 'outline-field';
  payload: {
    atomicNumber: number;
    quantumNumbers: QuantumNumbers;
    extent: number;
    maxProbability: number;
    resolution?: number;
  };
};

type WorkerRequestMessage =
  | SampleRequestMessage
  | NodalDataRequestMessage
  | ClearCacheMessage
  | OutlineFieldRequestMessage;

type SampleResultMessage = {
  id: number;
  type: 'sample-result';
  payload: OrbitalSamplingResult;
};

type SampleErrorMessage = {
  id: number;
  type: 'sample-error';
  error: string;
};

type NodalResultMessage = {
  id: number;
  type: 'nodal-result';
  payload: {
    radialNodes: Float32Array;
    coneAngles: Float32Array;
    phiAngles: Float32Array;
    includeHorizontalPlane: boolean;
  };
};

type NodalErrorMessage = {
  id: number;
  type: 'nodal-error';
  error: string;
};

type ClearCacheResultMessage = {
  id: number;
  type: 'cache-cleared';
};

type OutlineFieldResultMessage = {
  id: number;
  type: 'outline-result';
  payload: {
    extent: number;
    resolution: number;
    field: Float32Array;
    maxSample: number;
    maxProbability: number;
    isoLevel: number;
  };
};

type OutlineFieldErrorMessage = {
  id: number;
  type: 'outline-error';
  error: string;
};

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;
const nodalSurfaceDataCache = new Map<OrbitalCacheKey, NodalSurfaceData>();
const outlineFieldCache = new Map<
  OrbitalCacheKey,
  {
    extent: number;
    resolution: number;
    maxProbability: number;
    field: Float32Array;
    maxSample: number;
    isoLevel: number;
  }
>();

function computeOutlineField(
  atom: HydrogenLikeAtom,
  quantumNumbers: QuantumNumbers,
  extent: number,
  maxProbability: number,
  resolution: number,
): {
  field: Float32Array;
  maxSample: number;
  isoLevel: number;
  resolvedResolution: number;
} {
  const { field, maxSample, resolution: resolvedResolution } = computeDensityField(
    atom,
    quantumNumbers,
    extent,
    maxProbability,
    resolution,
  );

  const isoLevel = Math.min(Math.max(maxSample * 0.45, 0.05), 0.36);

  return { field, maxSample, isoLevel, resolvedResolution };
}

ctx.onmessage = (event: MessageEvent<WorkerRequestMessage>) => {
  const message = event.data;
  if (!message) {
    return;
  }

  if (message.type === 'clear-caches') {
    clearOrbitalSamplingCaches();
    nodalSurfaceDataCache.clear();
    outlineFieldCache.clear();
    const response: ClearCacheResultMessage = {
      id: message.id,
      type: 'cache-cleared',
    };
    ctx.postMessage(response);
    return;
  }

  if (message.type === 'sample') {
    const { atomicNumber, quantumNumbers, count, isDarkBackground } = message.payload;
    try {
      const atom = new HydrogenLikeAtom(atomicNumber);
      const sample = generateOrbitalParticles(atom, atomicNumber, quantumNumbers, count, isDarkBackground);

      const positions = sample.positions.slice();
      const colors = sample.colors.slice();
      const basePositions = sample.basePositions.slice();
      const allValidPositions = sample.allValidPositions.slice();

      const cacheKey = getOrbitalCacheKey(atomicNumber, quantumNumbers);
      const densityResolution = 72;
      let outlineEntry = outlineFieldCache.get(cacheKey);

      if (
        !outlineEntry ||
        outlineEntry.resolution < densityResolution ||
        Math.abs(outlineEntry.extent - sample.extent) >= FIELD_EXTENT_TOLERANCE ||
        Math.abs(outlineEntry.maxProbability - sample.maxProbability) >
          Math.max(1e-10, Math.abs(sample.maxProbability) * 0.02)
      ) {
        const { field, maxSample, isoLevel, resolvedResolution } = computeOutlineField(
          atom,
          quantumNumbers,
          sample.extent,
          sample.maxProbability,
          densityResolution,
        );

        outlineEntry = {
          extent: sample.extent,
          resolution: resolvedResolution,
          maxProbability: sample.maxProbability,
          field,
          maxSample,
          isoLevel,
        };
        outlineFieldCache.set(cacheKey, outlineEntry);
      }

      const densityField = outlineEntry
        ? {
            resolution: outlineEntry.resolution,
            field: outlineEntry.field.slice(),
            maxSample: outlineEntry.maxSample,
            maxProbability: outlineEntry.maxProbability,
          }
        : undefined;

      const response: SampleResultMessage = {
        id: message.id,
        type: 'sample-result',
        payload: {
          positions,
          colors,
          basePositions,
          allValidPositions,
          extent: sample.extent,
          maxProbability: sample.maxProbability,
          densityField,
        },
      };
      const transferables: Transferable[] = [
        positions.buffer,
        colors.buffer,
        basePositions.buffer,
        allValidPositions.buffer,
      ];

      if (densityField) {
        transferables.push(densityField.field.buffer);
      }

      ctx.postMessage(response, transferables);
    } catch (error) {
      const response: SampleErrorMessage = {
        id: message.id,
        type: 'sample-error',
        error: error instanceof Error ? error.message : 'Unknown sampling error',
      };
      ctx.postMessage(response);
    }
    return;
  }

  if (message.type === 'outline-field') {
    const { atomicNumber, quantumNumbers, extent, maxProbability, resolution = 28 } = message.payload;
    const cacheKey = getOrbitalCacheKey(atomicNumber, quantumNumbers);
    try {
      const cached = outlineFieldCache.get(cacheKey);
      if (
        cached &&
        cached.resolution === resolution &&
        Math.abs(cached.extent - extent) < FIELD_EXTENT_TOLERANCE &&
        Math.abs(cached.maxProbability - maxProbability) <=
          Math.max(1e-10, Math.abs(maxProbability) * 0.02)
      ) {
        const response: OutlineFieldResultMessage = {
          id: message.id,
          type: 'outline-result',
          payload: {
            extent: cached.extent,
            resolution: cached.resolution,
            field: cached.field.slice(),
            maxSample: cached.maxSample,
            maxProbability: cached.maxProbability,
            isoLevel: cached.isoLevel,
          },
        };
        ctx.postMessage(response, [response.payload.field.buffer]);
        return;
      }

      const atom = new HydrogenLikeAtom(atomicNumber);
      const { field, maxSample, isoLevel, resolvedResolution } = computeOutlineField(
        atom,
        quantumNumbers,
        extent,
        maxProbability,
        resolution,
      );

      outlineFieldCache.set(cacheKey, {
        extent,
        resolution: resolvedResolution,
        maxProbability,
        field: field.slice(),
        maxSample,
        isoLevel,
      });

      const response: OutlineFieldResultMessage = {
        id: message.id,
        type: 'outline-result',
        payload: {
          extent,
          resolution: resolvedResolution,
          field,
          maxSample,
          maxProbability,
          isoLevel,
        },
      };
      ctx.postMessage(response, [field.buffer]);
    } catch (error) {
      const response: OutlineFieldErrorMessage = {
        id: message.id,
        type: 'outline-error',
        error: error instanceof Error ? error.message : 'Failed to compute outline field data',
      };
      ctx.postMessage(response);
    }
    return;
  }

  if (message.type === 'nodal-data') {
    const { atomicNumber, quantumNumbers, extent } = message.payload;
    const cacheKey = getOrbitalCacheKey(atomicNumber, quantumNumbers);
    try {
      let data = nodalSurfaceDataCache.get(cacheKey);
      if (!data) {
        const atom = new HydrogenLikeAtom(atomicNumber);
        data = computeNodalSurfaceData(atom, quantumNumbers, extent);
        nodalSurfaceDataCache.set(cacheKey, data);
      }

      const radialNodes = data.radialNodes.slice();
      const coneAngles = data.coneAngles.slice();
      const phiAngles = data.phiAngles.slice();

      const response: NodalResultMessage = {
        id: message.id,
        type: 'nodal-result',
        payload: {
          radialNodes,
          coneAngles,
          phiAngles,
          includeHorizontalPlane: data.includeHorizontalPlane,
        },
      };
      ctx.postMessage(response, [radialNodes.buffer, coneAngles.buffer, phiAngles.buffer]);
    } catch (error) {
      const response: NodalErrorMessage = {
        id: message.id,
        type: 'nodal-error',
        error: error instanceof Error ? error.message : 'Failed to compute nodal surface data',
      };
      ctx.postMessage(response);
    }
  }
};

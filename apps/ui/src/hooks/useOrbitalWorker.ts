import { useCallback, useEffect, useRef } from 'react';
import { type OrbitalSamplingResult } from '../physics/orbitalSampling.js';
import { type NodalSurfaceData } from '../physics/nodalSurfaces.js';

export interface OutlineFieldData {
  extent: number;
  resolution: number;
  field: Float32Array;
  maxSample: number;
  maxProbability: number;
  isoLevel: number;
}

interface SampleRequestPayload {
  atomicNumber: number;
  quantumNumbers: {
    n: number;
    l: number;
    m: number;
    s: number;
  };
  count: number;
  isDarkBackground: boolean;
}

interface NodalRequestPayload {
  atomicNumber: number;
  quantumNumbers: {
    n: number;
    l: number;
    m: number;
    s: number;
  };
  extent: number;
}

interface OutlineRequestPayload {
  atomicNumber: number;
  quantumNumbers: {
    n: number;
    l: number;
    m: number;
    s: number;
  };
  extent: number;
  maxProbability: number;
  resolution?: number;
}

type WorkerMessage =
  | { id: number; type: 'sample-result'; payload: OrbitalSamplingResult }
  | {
      id: number;
      type: 'nodal-result';
      payload: {
        radialNodes: Float32Array | number[];
        coneAngles: Float32Array | number[];
        phiAngles: Float32Array | number[];
        includeHorizontalPlane: boolean;
      };
    }
  | {
      id: number;
      type: 'outline-result';
      payload: {
        extent: number;
        resolution: number;
        field: Float32Array | number[];
        maxSample: number;
        maxProbability: number;
        isoLevel: number;
      };
    }
  | { id: number; type: 'sample-error'; error: string }
  | { id: number; type: 'nodal-error'; error: string }
  | { id: number; type: 'outline-error'; error: string }
  | { id: number; type: 'cache-cleared' };

type PendingEntry =
  | {
      kind: 'sample';
      resolve: (value: OrbitalSamplingResult) => void;
      reject: (reason: unknown) => void;
    }
  | {
      kind: 'nodal';
      resolve: (value: NodalSurfaceData) => void;
      reject: (reason: unknown) => void;
    }
  | {
      kind: 'outline';
      resolve: (value: OutlineFieldData) => void;
      reject: (reason: unknown) => void;
    };

export interface OrbitalWorkerClient {
  isAvailable: () => boolean;
  requestSampling: (payload: SampleRequestPayload) => Promise<OrbitalSamplingResult | null>;
  requestNodalData: (payload: NodalRequestPayload) => Promise<NodalSurfaceData | null>;
  requestOutlineField: (payload: OutlineRequestPayload) => Promise<OutlineFieldData | null>;
  clearCaches: () => void;
}

export function useOrbitalWorker(): OrbitalWorkerClient {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pendingRef = useRef(new Map<number, PendingEntry>());

  useEffect(() => {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../workers/orbitalSamplerWorker.ts', import.meta.url), {
        type: 'module',
      });
      workerRef.current = worker;
    } catch (error) {
      console.warn('Failed to initialize orbital sampling worker', error);
      workerRef.current = null;
      return;
    }

    const pendingRequests = pendingRef.current;

    const handleMessage = (event: MessageEvent<WorkerMessage>) => {
      const data = event.data;
      if (!data || typeof data !== 'object') {
        return;
      }

      if (data.type === 'cache-cleared') {
        return;
      }

      const entry = pendingRequests.get(data.id);
      if (!entry) {
        return;
      }
      pendingRequests.delete(data.id);

      switch (data.type) {
        case 'sample-result':
          if (entry.kind === 'sample') {
            entry.resolve(data.payload);
          }
          break;
        case 'nodal-result':
          if (entry.kind === 'nodal') {
            entry.resolve({
              radialNodes: new Float32Array(data.payload.radialNodes),
              coneAngles: new Float32Array(data.payload.coneAngles),
              phiAngles: new Float32Array(data.payload.phiAngles),
              includeHorizontalPlane: data.payload.includeHorizontalPlane,
            });
          }
          break;
        case 'outline-result':
          if (entry.kind === 'outline') {
            entry.resolve({
              extent: data.payload.extent,
              resolution: data.payload.resolution,
              field: new Float32Array(data.payload.field),
              maxSample: data.payload.maxSample,
              maxProbability: data.payload.maxProbability,
              isoLevel: data.payload.isoLevel,
            });
          }
          break;
        case 'sample-error':
        case 'nodal-error':
        case 'outline-error':
          entry.reject(new Error(data.error ?? 'Orbital worker error'));
          break;
        default:
          break;
      }
    };

    const handleError = (event: ErrorEvent) => {
      const failure = event.error instanceof Error ? event.error : new Error(event.message ?? 'Worker error');
      if (pendingRequests.size > 0) {
        pendingRequests.forEach(({ reject }) => reject(failure));
        pendingRequests.clear();
      }
    };

    worker.addEventListener('message', handleMessage as EventListener);
    worker.addEventListener('error', handleError);

    return () => {
      worker.removeEventListener('message', handleMessage as EventListener);
      worker.removeEventListener('error', handleError);
      worker.terminate();
      workerRef.current = null;
      if (pendingRequests.size > 0) {
        const failure = new Error('Orbital sampling worker terminated');
        pendingRequests.forEach(({ reject }) => reject(failure));
        pendingRequests.clear();
      }
    };
  }, []);

  const dispatchRequest = useCallback(
    <T,>(type: PendingEntry['kind'], payload: unknown, messageType: string, transfer?: Transferable[]) => {
      const worker = workerRef.current;
      if (!worker) {
        return null;
      }

      const id = requestIdRef.current++;

      const promise = new Promise<T>((resolve, reject) => {
        pendingRef.current.set(id, { kind: type, resolve, reject } as PendingEntry);
        try {
          worker.postMessage({ id, type: messageType, payload }, transfer || []);
        } catch (error) {
          pendingRef.current.delete(id);
          reject(error);
        }
      })
        .catch((error) => {
          pendingRef.current.delete(id);
          throw error;
        }) as Promise<T>;

      return promise;
    },
    [],
  );

  const requestSamplingInternal = useCallback(
    (payload: SampleRequestPayload) => dispatchRequest<OrbitalSamplingResult>('sample', payload, 'sample'),
    [dispatchRequest],
  );

  const requestNodalDataInternal = useCallback(
    (payload: NodalRequestPayload) => dispatchRequest<NodalSurfaceData>('nodal', payload, 'nodal-data'),
    [dispatchRequest],
  );

  const requestOutlineFieldInternal = useCallback(
    (payload: OutlineRequestPayload) => dispatchRequest<OutlineFieldData>('outline', payload, 'outline-field'),
    [dispatchRequest],
  );

  const clearCaches = useCallback(() => {
    const worker = workerRef.current;
    if (!worker) {
      return;
    }

    const id = requestIdRef.current++;
    try {
      worker.postMessage({ id, type: 'clear-caches' });
    } catch (error) {
      console.warn('Failed to request worker cache clear', error);
    }
  }, []);

  const isAvailable = useCallback(() => workerRef.current !== null, []);

  return {
    isAvailable,
    requestSampling: (payload) => {
      const promise = requestSamplingInternal(payload);
      if (!promise) {
        return Promise.resolve(null);
      }
      return promise
        .then((result) => result)
        .catch((error) => {
          console.warn('Worker sampling request failed', error);
          return null;
        });
    },
    requestNodalData: (payload) => {
      const promise = requestNodalDataInternal(payload);
      if (!promise) {
        return Promise.resolve(null);
      }
      return promise
        .then((result) => result)
        .catch((error) => {
          console.warn('Worker nodal request failed', error);
          return null;
        });
    },
    requestOutlineField: (payload) => {
      const promise = requestOutlineFieldInternal(payload);
      if (!promise) {
        return Promise.resolve(null);
      }
      return promise
        .then((result) => result)
        .catch((error) => {
          console.warn('Worker outline request failed', error);
          return null;
        });
    },
    clearCaches,
  };
}

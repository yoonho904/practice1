# Backend Offload Architecture Plan
## Move Quantum Calculations from Frontend to Backend

## Problem Statement

**Current State:**
- All quantum calculations happen in the browser (frontend)
- `HydrogenLikeAtom` runs in React component
- Heavy math (wavefunction evaluation, particle generation) blocks UI thread
- Causes lag, crashes on high particle counts
- Will get **much worse** with Option 3 (Hartree-Fock/DFT)

**Why This Is Critical:**
- Option 3 requires iterative SCF calculations (self-consistent field)
- Matrix operations on 100x100+ matrices
- Can take **seconds to minutes** to converge
- Absolutely cannot run in browser without freezing UI
- Need backend infrastructure **before** implementing Option 3

---

## Architecture Overview

### Current Architecture (Bad)
```
┌─────────────────────────────────────┐
│         Browser (React)             │
├─────────────────────────────────────┤
│  QuantumVisualizer.tsx              │
│  ├─ HydrogenLikeAtom (heavy math)   │
│  ├─ generateOrbitalParticles()      │
│  ├─ evaluateWavefunction() x10000   │
│  └─ Three.js rendering              │
└─────────────────────────────────────┘
        ↓ (All blocking UI thread)
   Lag/Freeze/Crash
```

### Target Architecture (Good)
```
┌──────────────────────┐         ┌────────────────────────────┐
│   Browser (React)    │         │  Backend (Node.js/Fastify) │
├──────────────────────┤         ├────────────────────────────┤
│ QuantumVisualizer    │  HTTP   │  Quantum Calculation API   │
│  ├─ UI Controls      │ ◄─────► │  ├─ HydrogenLikeAtom       │
│  ├─ Three.js         │         │  ├─ HartreeFock (future)   │
│  └─ Render particles │         │  ├─ DFT (future)           │
│      (from API)      │         │  └─ Particle generation    │
└──────────────────────┘         └────────────────────────────┘
       ↓                                    ↓
  No blocking!                    Heavy math in background
  Smooth 60 FPS                   Multi-threaded possible
```

---

## Implementation Plan

### Phase 1: Create Backend API (Week 1)

**Goal:** Move particle generation to backend, keep frontend simple

#### 1.1: Set Up Quantum API Service
**Location:** `services/quantum-api/` (new service)

**Tech Stack:**
- **Framework:** Fastify (already in quantum-engine deps, fast, TypeScript native)
- **API Style:** REST (simple) + Server-Sent Events for progress
- **Deployment:** Vercel Serverless Functions or Railway/Render

**Structure:**
```
services/quantum-api/
├── src/
│   ├── server.ts                 # Fastify app entry
│   ├── routes/
│   │   ├── particles.ts          # POST /api/particles
│   │   ├── orbital-info.ts       # GET /api/orbital/{n}/{l}/{m}
│   │   └── health.ts             # GET /health
│   ├── services/
│   │   ├── particle-generator.ts # Core calculation logic
│   │   └── cache.ts              # LRU cache for common orbitals
│   ├── workers/                  # Future: Worker threads
│   └── types/
│       └── api-types.ts          # Request/Response schemas
├── package.json
└── tsconfig.json
```

#### 1.2: API Endpoints

**Endpoint 1: Generate Particles**
```typescript
POST /api/particles

Request:
{
  atomicNumber: number,      // Z
  quantumNumbers: {
    n: number,
    l: number,
    m: number,
    s: number
  },
  particleCount: number,     // How many particles to generate
  isDarkBackground: boolean  // For color selection
}

Response:
{
  positions: number[],       // Float32Array as regular array
  colors: number[],          // Float32Array as regular array
  metadata: {
    energy: number,
    radius: number,
    angularMomentum: number,
    computeTimeMs: number
  }
}
```

**Endpoint 2: Orbital Information (Cached)**
```typescript
GET /api/orbital/:Z/:n/:l/:m

Response:
{
  energy: number,
  radius: number,
  angularMomentum: number,
  orbitalName: string,        // "1s", "2p", etc.
  elementName: string,        // "Hydrogen", "Helium+"
  waveFunction: {
    radialNodes: number,
    angularNodes: number,
  }
}
```

**Endpoint 3: Health Check**
```typescript
GET /health

Response:
{
  status: "ok",
  version: "0.1.0",
  uptime: number,
  quantumEngineVersion: string
}
```

#### 1.3: Caching Strategy

**Problem:** Same orbitals requested repeatedly
- User toggles between n=1,2,3
- Same (Z, n, l, m) combinations common

**Solution:** LRU Cache
```typescript
import LRU from 'lru-cache';

const particleCache = new LRU<string, ParticleData>({
  max: 100,                    // Cache 100 orbital configs
  ttl: 1000 * 60 * 60,        // 1 hour TTL
  maxSize: 50 * 1024 * 1024,  // 50 MB max
  sizeCalculation: (value) => {
    return value.positions.byteLength + value.colors.byteLength;
  }
});

function getCacheKey(req: ParticleRequest): string {
  return `${req.atomicNumber}-${req.quantumNumbers.n}-${req.quantumNumbers.l}-${req.quantumNumbers.m}-${req.particleCount}`;
}
```

#### 1.4: Move Calculation Logic
**From:** `apps/ui/src/QuantumVisualizer.tsx`
**To:** `services/quantum-api/src/services/particle-generator.ts`

**Refactor:**
```typescript
// Before (in React component)
const atom = new HydrogenLikeAtom(atomicNumber);
const { positions, colors } = generateOrbitalParticles(
  atom, quantumNumbers, particleCount, isDarkBackground
);

// After (in backend service)
export class ParticleGeneratorService {
  async generateParticles(req: ParticleRequest): Promise<ParticleResponse> {
    const atom = new HydrogenLikeAtom(req.atomicNumber);
    const startTime = Date.now();

    const { positions, colors } = this.generateOrbitalParticles(
      atom,
      req.quantumNumbers,
      req.particleCount,
      req.isDarkBackground
    );

    return {
      positions: Array.from(positions),
      colors: Array.from(colors),
      metadata: {
        energy: atom.calculateEnergy(req.quantumNumbers.n),
        radius: atom.calculateBohrRadius(req.quantumNumbers.n),
        angularMomentum: Math.sqrt(req.quantumNumbers.l * (req.quantumNumbers.l + 1)),
        computeTimeMs: Date.now() - startTime
      }
    };
  }
}
```

---

### Phase 2: Update Frontend (Week 1)

#### 2.1: Create API Client
**Location:** `apps/ui/src/api/quantum-api-client.ts`

```typescript
export class QuantumAPIClient {
  private baseURL: string;

  constructor(baseURL: string = import.meta.env.VITE_QUANTUM_API_URL || 'http://localhost:3000') {
    this.baseURL = baseURL;
  }

  async generateParticles(params: ParticleRequest): Promise<ParticleResponse> {
    const response = await fetch(`${this.baseURL}/api/particles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getOrbitalInfo(Z: number, n: number, l: number, m: number): Promise<OrbitalInfo> {
    const response = await fetch(`${this.baseURL}/api/orbital/${Z}/${n}/${l}/${m}`);
    return response.json();
  }
}
```

#### 2.2: Update QuantumVisualizer Component
**Location:** `apps/ui/src/QuantumVisualizer.tsx`

**Changes:**
```typescript
// Add loading state
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Replace direct calculation with API call
useEffect(() => {
  async function loadParticles() {
    setIsLoading(true);
    setError(null);

    try {
      const apiClient = new QuantumAPIClient();
      const data = await apiClient.generateParticles({
        atomicNumber,
        quantumNumbers,
        particleCount,
        isDarkBackground
      });

      // Convert arrays back to Float32Array
      const positions = new Float32Array(data.positions);
      const colors = new Float32Array(data.colors);

      // Update Three.js geometry
      updateParticleGeometry(positions, colors);

    } catch (err) {
      setError(err.message);
      console.error('Failed to load particles:', err);
    } finally {
      setIsLoading(false);
    }
  }

  loadParticles();
}, [atomicNumber, quantumNumbers, particleCount, isDarkBackground]);
```

#### 2.3: Add Loading UI
```typescript
// In QuantumVisualizer return
{isLoading && (
  <div style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(0,0,0,0.8)',
    padding: '2rem',
    borderRadius: '12px',
    color: '#fff'
  }}>
    <div>Calculating orbital...</div>
    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
      Computing {particleCount.toLocaleString()} particles
    </div>
  </div>
)}

{error && (
  <div style={{
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: '#ff4444',
    color: '#fff',
    padding: '1rem',
    borderRadius: '8px'
  }}>
    Error: {error}
  </div>
)}
```

---

### Phase 3: Optimize & Scale (Week 2)

#### 3.1: Request Debouncing
**Problem:** User drags slider → 100 API requests/second

**Solution:** Debounce requests
```typescript
import { useMemo } from 'react';
import debounce from 'lodash.debounce';

const debouncedLoadParticles = useMemo(
  () => debounce(loadParticles, 300), // 300ms delay
  []
);

// Use debounced version for sliders
useEffect(() => {
  debouncedLoadParticles();
}, [particleCount, noiseIntensity]); // Debounced

// Use immediate version for discrete changes
useEffect(() => {
  loadParticles();
}, [n, l, m, atomicNumber]); // Immediate
```

#### 3.2: Progressive Rendering
**Problem:** 25000 particles take long time to calculate

**Solution:** Stream particles in batches
```typescript
// Backend: Server-Sent Events
app.get('/api/particles/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');

  const batchSize = 1000;
  for (let i = 0; i < particleCount; i += batchSize) {
    const batch = generateParticleBatch(i, batchSize);
    res.write(`data: ${JSON.stringify(batch)}\n\n`);
  }

  res.end();
});

// Frontend: Progressive updates
const eventSource = new EventSource('/api/particles/stream?...');
eventSource.onmessage = (event) => {
  const batch = JSON.parse(event.data);
  appendParticlesToGeometry(batch); // Add to existing particles
};
```

#### 3.3: Worker Threads (Backend)
**For Option 3 (Hartree-Fock):** Use Node.js worker threads

```typescript
import { Worker } from 'worker_threads';

class HartreeFockService {
  async calculateGroundState(Z: number, electronCount: number): Promise<HFResult> {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./workers/hartree-fock-worker.js', {
        workerData: { Z, electronCount }
      });

      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  }
}
```

---

### Phase 4: Prepare for Option 3 (Week 3-4)

#### 4.1: Create HF/DFT Service Structure
```
services/quantum-api/src/services/
├── particle-generator.ts      # Existing (hydrogen-like)
├── hartree-fock.ts            # NEW: HF implementation
├── dft.ts                     # NEW: DFT implementation
└── method-selector.ts         # Choose method based on complexity
```

#### 4.2: Method Selection API
```typescript
POST /api/calculate

Request:
{
  atomicNumber: number,
  electronCount: number,
  method: "hydrogen-like" | "hartree-fock" | "dft",
  basisSet?: string,           // For HF/DFT
  convergence?: number         // SCF convergence threshold
}

Response (with progress):
{
  status: "calculating" | "converged" | "failed",
  progress: number,            // 0-100
  iteration?: number,          // Current SCF iteration
  energy?: number,             // Current energy
  orbitals?: [...]             // When converged
}
```

#### 4.3: WebSocket for Long Calculations
**Why:** HTTP timeout for 30+ second calculations

```typescript
// Backend: WebSocket server
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', async (data) => {
    const request = JSON.parse(data.toString());

    // Start HF calculation
    const hf = new HartreeFockCalculator(request);

    // Send progress updates
    hf.on('iteration', (iter, energy) => {
      ws.send(JSON.stringify({
        type: 'progress',
        iteration: iter,
        energy: energy
      }));
    });

    const result = await hf.solve();
    ws.send(JSON.stringify({
      type: 'complete',
      result: result
    }));
  });
});

// Frontend: WebSocket client
const ws = new WebSocket('ws://localhost:8080');
ws.send(JSON.stringify({ atomicNumber: 6, electronCount: 6 }));

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'progress') {
    updateProgressBar(msg.iteration, msg.energy);
  } else if (msg.type === 'complete') {
    displayOrbitals(msg.result);
  }
};
```

---

## Deployment Strategy

### Development
```bash
# Terminal 1: Backend
cd services/quantum-api
npm run dev  # Port 3000

# Terminal 2: Frontend
cd apps/ui
VITE_QUANTUM_API_URL=http://localhost:3000 npm run dev
```

### Production Options

#### Option A: Vercel (Easiest)
- **Frontend:** Vercel (automatic from GitHub)
- **Backend:** Vercel Serverless Functions
- **Limits:** 10s timeout (not enough for HF)
- **Best for:** Phase 1-2 only

#### Option B: Railway/Render (Recommended)
- **Frontend:** Vercel
- **Backend:** Railway or Render (no timeout limits)
- **Cost:** ~$5/month for backend
- **Best for:** All phases including Option 3

#### Option C: Self-Hosted
- **Frontend:** Vercel or Netlify
- **Backend:** DigitalOcean/AWS/GCP
- **Cost:** ~$10-20/month
- **Best for:** Maximum control

### Environment Variables
```bash
# Frontend (.env)
VITE_QUANTUM_API_URL=https://quantum-api.yourapp.com

# Backend (.env)
PORT=3000
NODE_ENV=production
CACHE_TTL=3600
MAX_PARTICLE_COUNT=50000
ENABLE_WORKER_THREADS=true
```

---

## Testing Strategy

### Unit Tests
```typescript
// services/quantum-api/src/__tests__/particle-generator.test.ts
describe('ParticleGeneratorService', () => {
  it('should generate correct number of particles', async () => {
    const service = new ParticleGeneratorService();
    const result = await service.generateParticles({
      atomicNumber: 1,
      quantumNumbers: { n: 1, l: 0, m: 0, s: 0.5 },
      particleCount: 1000,
      isDarkBackground: true
    });

    expect(result.positions.length).toBe(1000 * 3); // x,y,z per particle
    expect(result.colors.length).toBe(1000 * 3);    // r,g,b per particle
  });
});
```

### Integration Tests
```typescript
// Test full API flow
describe('Particles API', () => {
  it('should return particles via HTTP', async () => {
    const response = await fetch('http://localhost:3000/api/particles', {
      method: 'POST',
      body: JSON.stringify({...}),
    });

    const data = await response.json();
    expect(data.positions).toBeDefined();
    expect(data.metadata.computeTimeMs).toBeLessThan(5000);
  });
});
```

### Load Testing
```bash
# Use autocannon for load testing
npx autocannon -c 10 -d 30 http://localhost:3000/api/particles
```

---

## Performance Targets

### Phase 1 Targets (Hydrogen-Like)
- **Particle generation:** < 100ms for 10k particles
- **API response time:** < 200ms (including network)
- **Cache hit rate:** > 80%
- **Frontend FPS:** Steady 60 FPS during calculations

### Phase 4 Targets (Hartree-Fock)
- **Carbon (6 electrons):** < 5 seconds
- **Nitrogen (7 electrons):** < 10 seconds
- **Oxygen (8 electrons):** < 20 seconds
- **Progress updates:** Every 100ms
- **Frontend:** Remains responsive during calculation

---

## Migration Checklist

### Week 1: Backend Setup
- [ ] Create `services/quantum-api/` directory structure
- [ ] Set up Fastify server with TypeScript
- [ ] Implement `/api/particles` endpoint
- [ ] Move `generateOrbitalParticles()` to backend
- [ ] Add LRU cache
- [ ] Write unit tests for particle generation
- [ ] Deploy to Railway/Render for testing

### Week 1: Frontend Updates
- [ ] Create `QuantumAPIClient` class
- [ ] Update `QuantumVisualizer` to use API
- [ ] Add loading states and error handling
- [ ] Add debouncing for slider inputs
- [ ] Update environment variables
- [ ] Test with backend running locally

### Week 2: Optimization
- [ ] Implement request debouncing
- [ ] Add progressive rendering (optional)
- [ ] Monitor API response times
- [ ] Optimize cache hit rate
- [ ] Load test API with 100 concurrent users

### Week 3-4: Prepare for Option 3
- [ ] Research Hartree-Fock implementation
- [ ] Set up WebSocket server
- [ ] Create worker thread infrastructure
- [ ] Design HF API endpoints
- [ ] Implement progress streaming
- [ ] Test with simple multi-electron atoms (He, Li)

---

## Rollout Strategy

### Stage 1: Feature Flag (Safe Rollout)
```typescript
// Frontend
const USE_BACKEND_API = import.meta.env.VITE_USE_QUANTUM_API === 'true';

if (USE_BACKEND_API) {
  // New: Call API
  const data = await apiClient.generateParticles(...);
} else {
  // Old: Local calculation
  const data = generateOrbitalParticles(...);
}
```

### Stage 2: A/B Test
- 10% of users → Backend API
- 90% of users → Local calculation
- Monitor error rates, performance

### Stage 3: Full Migration
- 100% of users → Backend API
- Remove old frontend calculation code
- Archive `generateOrbitalParticles()` in frontend

---

## Cost Estimate

### Backend Hosting (Railway/Render)
- **Starter Plan:** $5/month (512MB RAM, 0.5 CPU)
- **Pro Plan:** $20/month (2GB RAM, 2 CPU) ← Recommended for Option 3
- **Traffic:** First 100GB/month free

### Total Monthly Cost
- **Phase 1-2:** $5/month
- **Phase 4 (Option 3):** $20/month
- **Frontend (Vercel):** Free (generous limits)

---

## Summary

### Why This Plan Works

1. **Incremental:** Start simple (Phase 1), add complexity later
2. **Testable:** Each phase is independently deployable
3. **Future-proof:** Ready for Hartree-Fock without refactoring
4. **User Experience:** Frontend stays responsive
5. **Scalable:** Can add worker threads, caching, load balancing

### Timeline
- **Week 1:** Backend API + Frontend integration (deployable)
- **Week 2:** Optimization and testing
- **Week 3-4:** Prepare for Option 3 (HF/DFT infrastructure)
- **Week 5+:** Implement Hartree-Fock (with biochem specialist)

### Next Steps
1. Review this plan with biochem friend
2. Set up Railway/Render account
3. Create `services/quantum-api/` and implement Phase 1
4. Deploy backend and test with frontend
5. Once stable, start implementing Option 3 (Hartree-Fock)

**Critical:** Complete Phases 1-2 BEFORE starting Option 3 implementation. The backend infrastructure is essential for Option 3 to work.

You are an experienced, simulation modeling developer excelling in creating quantum orbital atom visualizations that scale to molecules, cells, multi-cell organisms, ecosystems, modeling professional. You have years of experience and are the absolute best at your job because you have thousands of projects under your belt and you have extensive knowledge about every aspect about your projects. Yes every aspect. Review this plan, the current architecture, its faults, what needs to be done on the backend, where to improve, literally every single detail about this project. And then in your role, make another plan that you think is the best that makes this project be able to have the best chance to make it big. Based on what we currently have, where we do we need to go, what we need to change, what we need to scaffold, literally every aspect. Also keep in mind that the first part of the project (the atom, single and multi-electron) should try to be free for the developers and optimized to the best of its ability with a backend.
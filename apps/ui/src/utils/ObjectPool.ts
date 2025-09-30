export interface Poolable {
  reset(): void;
}

export interface PoolableConstructor<T extends Poolable> {
  new (): T;
}

export class ObjectPool<T extends Poolable> {
  private readonly pool: T[] = [];
  private readonly createFn: () => T;
  private readonly maxSize: number;
  private readonly resetOnReturn: boolean;

  constructor(
    createFn: () => T,
    initialSize: number = 10,
    maxSize: number = 100,
    resetOnReturn: boolean = true
  ) {
    this.createFn = createFn;
    this.maxSize = maxSize;
    this.resetOnReturn = resetOnReturn;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  acquire(): T {
    const obj = this.pool.pop();
    if (obj) {
      return obj;
    }

    // Pool exhausted, create new object
    return this.createFn();
  }

  release(obj: T): void {
    if (this.pool.length >= this.maxSize) {
      // Pool is full, let object be garbage collected
      return;
    }

    if (this.resetOnReturn) {
      obj.reset();
    }

    this.pool.push(obj);
  }

  size(): number {
    return this.pool.length;
  }

  clear(): void {
    this.pool.length = 0;
  }
}

export class Vector3Pool implements Poolable {
  public x: number = 0;
  public y: number = 0;
  public z: number = 0;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(other: Vector3Pool): this {
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
    return this;
  }

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.z = 0;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize(): this {
    const length = this.length();
    if (length > 0) {
      this.x /= length;
      this.y /= length;
      this.z /= length;
    }
    return this;
  }

  multiplyScalar(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }
}

export class ElectronData implements Poolable {
  public position: Vector3Pool = new Vector3Pool();
  public probability: number = 0;
  public shell: number = 0;
  public quantum = { n: 0, l: 0, m: 0, spin: 1 as 1 | -1 };
  public color = { r: 0, g: 0, b: 0 };
  public size: number = 1;
  public opacity: number = 1;

  reset(): void {
    this.position.reset();
    this.probability = 0;
    this.shell = 0;
    this.quantum = { n: 0, l: 0, m: 0, spin: 1 };
    this.color = { r: 0, g: 0, b: 0 };
    this.size = 1;
    this.opacity = 1;
  }

  setPosition(x: number, y: number, z: number): this {
    this.position.set(x, y, z);
    return this;
  }

  setProbability(probability: number): this {
    this.probability = probability;
    return this;
  }

  setQuantum(n: number, l: number, m: number, spin: 1 | -1 = 1): this {
    this.quantum.n = n;
    this.quantum.l = l;
    this.quantum.m = m;
    this.quantum.spin = spin;
    return this;
  }

  setColor(r: number, g: number, b: number): this {
    this.color.r = r;
    this.color.g = g;
    this.color.b = b;
    return this;
  }
}

export class OrbitalSample implements Poolable {
  public position: [number, number, number] = [0, 0, 0];
  public probability: number = 0;
  public shell: number = 0;

  reset(): void {
    this.position[0] = 0;
    this.position[1] = 0;
    this.position[2] = 0;
    this.probability = 0;
    this.shell = 0;
  }

  setPosition(x: number, y: number, z: number): this {
    this.position[0] = x;
    this.position[1] = y;
    this.position[2] = z;
    return this;
  }

  setProbability(probability: number): this {
    this.probability = probability;
    return this;
  }

  setShell(shell: number): this {
    this.shell = shell;
    return this;
  }
}

// Global pools for common objects
export const vector3Pool = new ObjectPool(() => new Vector3Pool(), 50, 200);
export const electronDataPool = new ObjectPool(() => new ElectronData(), 100, 1000);
export const orbitalSamplePool = new ObjectPool(() => new OrbitalSample(), 200, 2000);

// Cleanup function for app teardown
export function clearAllPools(): void {
  vector3Pool.clear();
  electronDataPool.clear();
  orbitalSamplePool.clear();
}
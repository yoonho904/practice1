export function factorial(n: number): number {
  if (n < 0) {
    throw new RangeError("factorial not defined for negative numbers");
  }
  let result = 1;
  for (let i = 2; i <= n; i += 1) {
    result *= i;
  }
  return result;
}

export function doubleFactorial(n: number): number {
  if (n < -1) {
    throw new RangeError("double factorial not defined for given input");
  }
  if (n === -1 || n === 0) {
    return 1;
  }
  let result = 1;
  for (let i = n; i > 1; i -= 2) {
    result *= i;
  }
  return result;
}

export function generalizedLaguerre(n: number, alpha: number, x: number): number {
  if (n === 0) {
    return 1;
  }
  if (n === 1) {
    return 1 + alpha - x;
  }

  let L0 = 1;
  let L1 = 1 + alpha - x;

  for (let k = 2; k <= n; k += 1) {
    const coeff1 = ((2 * k - 1 + alpha - x) * L1 - (k - 1 + alpha) * L0) / k;
    L0 = L1;
    L1 = coeff1;
  }

  return L1;
}

export function associatedLegendre(l: number, m: number, x: number): number {
  if (m < 0) {
    const sign = m % 2 === 0 ? 1 : -1;
    return sign * (factorial(l - Math.abs(m)) / factorial(l + Math.abs(m))) * associatedLegendre(l, Math.abs(m), x);
  }

  let pmm = 1;
  if (m > 0) {
    const somx2 = Math.sqrt((1 - x) * (1 + x));
    let fact = 1;
    for (let i = 1; i <= m; i += 1) {
      pmm *= -fact * somx2;
      fact += 2;
    }
  }

  if (l === m) {
    return pmm;
  }

  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) {
    return pmmp1;
  }

  let pll = 0;
  for (let ll = m + 2; ll <= l; ll += 1) {
    pll = ((2 * ll - 1) * x * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }

  return pll;
}

export const PI = Math.PI;
export const TAU = Math.PI * 2;

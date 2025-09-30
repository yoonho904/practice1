/**
 * Intelligent method selection system for quantum calculations
 * Automatically chooses the best computational method for each element/ion
 */

import type { CalculationConfig } from '../types/quantum-types.js';

export type AccuracyLevel = 'exact' | 'high' | 'approximate' | 'semi-empirical';
export type ComputationalCost = 'low' | 'medium' | 'high' | 'extreme';

/**
 * Quantum method interface describing calculation approach
 */
export interface QuantumMethod {
  readonly name: string;
  readonly accuracy: AccuracyLevel;
  readonly computationalCost: ComputationalCost;
  readonly applicableElements: readonly number[];
  readonly scalingWithElectrons: string;
  readonly requiresBasisSet: boolean;
  readonly handlesElectronCorrelation: boolean;
  readonly relativisticEffects?: boolean;
  readonly effectiveCoreActivated?: boolean;
  readonly functional?: string; // For DFT methods
}

/**
 * Method information for validation and metadata
 */
export interface MethodInfo extends QuantumMethod {}

/**
 * Intelligent quantum method selector
 * Uses decision tree to choose optimal method for each calculation
 */
export class MethodSelector {
  private readonly methods: Map<string, QuantumMethod>;

  constructor() {
    this.methods = new Map();
    this.initializeMethods();
  }

  /**
   * Select optimal quantum method for given calculation configuration
   */
  selectMethod(config: CalculationConfig): QuantumMethod {
    const { atomicNumber, ionCharge, accuracy, methodOptions } = config;
    const electronCount = atomicNumber - ionCharge;

    // Handle hydrogen-like systems (1 electron)
    if (electronCount === 1) {
      return this.methods.get('hydrogen-like-exact')!;
    }

    // Handle computational budget constraints
    const budget = methodOptions?.computationalBudget as string;
    if (budget === 'low') {
      return this.selectLowCostMethod(atomicNumber, accuracy);
    }

    // Handle failed method escalation
    const previousMethodFailed = methodOptions?.previousMethodFailed as string;
    if (previousMethodFailed) {
      return this.escalateMethod(previousMethodFailed, atomicNumber, accuracy);
    }

    // Light elements (Z ≤ 10)
    if (atomicNumber <= 10) {
      if (accuracy <= 1e-8) {
        return this.methods.get('coupled-cluster')!;
      }
      return this.methods.get('hartree-fock')!;
    }

    // Heavy elements (Z > 54) - need relativistic effects
    if (atomicNumber > 54) {
      return this.methods.get('relativistic-dft')!;
    }

    // Medium elements and transition metals
    if (atomicNumber >= 11) {
      return this.methods.get('dft')!;
    }

    // Default fallback
    return this.methods.get('dft')!;
  }

  /**
   * Validate if method is applicable to given element
   */
  validateMethodForElement(methodName: string, atomicNumber: number, ionCharge: number): void {
    const method = this.methods.get(methodName);
    if (!method) {
      throw new Error(`Unknown method: ${methodName}`);
    }

    const electronCount = atomicNumber - ionCharge;

    // Special validation for hydrogen-like
    if (methodName === 'hydrogen-like-exact' && electronCount !== 1) {
      throw new Error('Hydrogen-like method not applicable to multi-electron systems');
    }

    // Check if element is in applicable list
    if (!method.applicableElements.includes(atomicNumber)) {
      throw new Error(`Method ${methodName} not applicable to element ${atomicNumber}`);
    }
  }

  /**
   * Get detailed information about a specific method
   */
  getMethodInfo(methodName: string): MethodInfo {
    const method = this.methods.get(methodName);
    if (!method) {
      throw new Error(`Unknown method: ${methodName}`);
    }
    return { ...method };
  }

  /**
   * Initialize all available quantum methods
   */
  private initializeMethods(): void {
    // Hydrogen-like exact solutions
    this.methods.set('hydrogen-like-exact', {
      name: 'hydrogen-like-exact',
      accuracy: 'exact',
      computationalCost: 'low',
      applicableElements: Array.from({ length: 118 }, (_, i) => i + 1), // All elements (as ions)
      scalingWithElectrons: 'constant',
      requiresBasisSet: false,
      handlesElectronCorrelation: false,
    });

    // Hartree-Fock method
    this.methods.set('hartree-fock', {
      name: 'hartree-fock',
      accuracy: 'approximate',
      computationalCost: 'medium',
      applicableElements: Array.from({ length: 118 }, (_, i) => i + 1),
      scalingWithElectrons: 'N^4',
      requiresBasisSet: true,
      handlesElectronCorrelation: false,
    });

    // Semi-empirical method (very fast)
    this.methods.set('semi-empirical', {
      name: 'semi-empirical',
      accuracy: 'semi-empirical',
      computationalCost: 'low',
      applicableElements: Array.from({ length: 118 }, (_, i) => i + 1),
      scalingWithElectrons: 'N^2',
      requiresBasisSet: false,
      handlesElectronCorrelation: false,
    });

    // Density Functional Theory
    this.methods.set('dft', {
      name: 'dft',
      accuracy: 'approximate',
      computationalCost: 'medium',
      applicableElements: Array.from({ length: 118 }, (_, i) => i + 1),
      scalingWithElectrons: 'N^3',
      requiresBasisSet: true,
      handlesElectronCorrelation: true,
      functional: 'B3LYP',
    });

    // Coupled Cluster (high accuracy)
    this.methods.set('coupled-cluster', {
      name: 'coupled-cluster',
      accuracy: 'high',
      computationalCost: 'high',
      applicableElements: Array.from({ length: 20 }, (_, i) => i + 1), // Light elements only
      scalingWithElectrons: 'N^6',
      requiresBasisSet: true,
      handlesElectronCorrelation: true,
    });

    // Relativistic DFT for heavy elements
    this.methods.set('relativistic-dft', {
      name: 'relativistic-dft',
      accuracy: 'approximate',
      computationalCost: 'high',
      applicableElements: Array.from({ length: 118 }, (_, i) => i + 1),
      scalingWithElectrons: 'N^3',
      requiresBasisSet: true,
      handlesElectronCorrelation: true,
      relativisticEffects: true,
      effectiveCoreActivated: true,
      functional: 'PBE',
    });
  }

  /**
   * Select method optimized for low computational cost
   */
  private selectLowCostMethod(atomicNumber: number, accuracy: number): QuantumMethod {
    // Use semi-empirical methods for low-cost calculations
    return this.methods.get('semi-empirical')!;
  }

  /**
   * Escalate to more sophisticated method when previous method failed
   */
  private escalateMethod(failedMethod: string, atomicNumber: number, accuracy: number): QuantumMethod {
    const escalationChain: Record<string, string> = {
      'hartree-fock': 'dft',
      'dft': 'coupled-cluster',
      'coupled-cluster': 'relativistic-dft',
    };

    const nextMethod = escalationChain[failedMethod];
    if (nextMethod && this.methods.has(nextMethod)) {
      const method = this.methods.get(nextMethod)!;
      // Check if method is applicable
      if (method.applicableElements.includes(atomicNumber)) {
        return method;
      }
    }

    // Fallback to DFT if escalation not possible
    return this.methods.get('dft')!;
  }
}
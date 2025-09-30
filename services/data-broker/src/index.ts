import { type AtomicElement } from "@bio-sim/event-schemas";
import { getElementBySymbol, listElements, type ElementRecord } from "@bio-sim/atomic-data";

export interface ElementQueryOptions {
  readonly symbol: string;
}

export interface DataBroker {
  getElement(options: ElementQueryOptions): Promise<AtomicElement | undefined>;
  listSupportedElements(): Promise<ElementRecord[]>;
}

export class InMemoryDataBroker implements DataBroker {
  async getElement(options: ElementQueryOptions): Promise<AtomicElement | undefined> {
    return getElementBySymbol(options.symbol);
  }

  async listSupportedElements(): Promise<ElementRecord[]> {
    return listElements();
  }
}

export function createDataBroker(): DataBroker {
  return new InMemoryDataBroker();
}

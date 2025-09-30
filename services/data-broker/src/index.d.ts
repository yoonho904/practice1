import { type AtomicElement } from "@bio-sim/event-schemas";
import { type ElementRecord } from "@bio-sim/atomic-data";
export interface ElementQueryOptions {
    readonly symbol: string;
}
export interface DataBroker {
    getElement(options: ElementQueryOptions): Promise<AtomicElement | undefined>;
    listSupportedElements(): Promise<ElementRecord[]>;
}
export declare class InMemoryDataBroker implements DataBroker {
    getElement(options: ElementQueryOptions): Promise<AtomicElement | undefined>;
    listSupportedElements(): Promise<ElementRecord[]>;
}
export declare function createDataBroker(): DataBroker;
//# sourceMappingURL=index.d.ts.map
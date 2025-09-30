import { getElementBySymbol, listElements } from "@bio-sim/atomic-data";
export class InMemoryDataBroker {
    async getElement(options) {
        return getElementBySymbol(options.symbol);
    }
    async listSupportedElements() {
        return listElements();
    }
}
export function createDataBroker() {
    return new InMemoryDataBroker();
}

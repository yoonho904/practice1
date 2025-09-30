import { WebSocketServer, WebSocket } from "ws";
import type { SimulationDirector } from "./director.js";
import type { SimulationDirectorConfig } from "./config.js";
import { defaultConfig } from "./config.js";
import type { ServerMessage } from "@bio-sim/contracts";

export class WebSocketGateway {
  private server?: WebSocketServer;
  private listeningPort?: number;
  private listeningHost?: string;

  constructor(
    private readonly director: SimulationDirector,
    private readonly config: SimulationDirectorConfig = defaultConfig,
  ) {}

  async start(): Promise<void> {
    await this.director.start();
    this.server = new WebSocketServer({ port: this.config.port, host: this.config.host });
    this.server.on("connection", (socket) => this.handleConnection(socket));
    this.server.on("listening", () => {
      if (!this.server) {
        return;
      }
      const address = this.server.address();
      if (typeof address === "object" && address) {
        this.listeningPort = address.port;
        this.listeningHost = address.address;
        console.log(`Simulation Director WebSocket listening on ws://${address.address}:${address.port}`);
      } else {
        this.listeningHost = this.config.host;
        this.listeningPort = this.config.port;
        console.log(`Simulation Director WebSocket listening on ws://${this.config.host}:${this.config.port}`);
      }
    });
  }

  async stop(): Promise<void> {
    await this.director.stop();
    await new Promise<void>((resolve) => {
      this.server?.close(() => resolve());
    });
    this.server = undefined;
  }

  getAddress(): { host: string; port: number } | undefined {
    if (!this.server) {
      return undefined;
    }
    if (this.listeningHost && this.listeningPort !== undefined) {
      return { host: this.listeningHost, port: this.listeningPort };
    }
    const address = this.server.address();
    if (typeof address === "object" && address) {
      return { host: address.address, port: address.port };
    }
    return undefined;
  }

  private handleConnection(socket: WebSocket): void {
    const send = (message: ServerMessage) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    };

    const unregister = this.director.registerClient(send);

    socket.on("message", async (raw) => {
      try {
        const decoded = JSON.parse(raw.toString());
        await this.director.handleRawCommand(decoded, send);
      } catch (error) {
        send({
          type: "error",
          payload: {
            message: error instanceof Error ? error.message : "Failed to process command",
          },
        });
      }
    });

    socket.on("close", () => {
      unregister();
    });
  }
}

export async function launchWebSocketGateway(
  director: SimulationDirector,
  config: SimulationDirectorConfig = defaultConfig,
): Promise<WebSocketGateway> {
  const gateway = new WebSocketGateway(director, config);
  await gateway.start();
  return gateway;
}

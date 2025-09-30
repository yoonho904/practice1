export interface EnvironmentConfig {
  readonly temperature: number;
  readonly pressureAtm: number;
  readonly ph: number;
}

export interface SimulationDirectorConfig {
  readonly port: number;
  readonly host: string;
  readonly initialEnvironment?: EnvironmentConfig;
}

const defaultEnvironment: EnvironmentConfig = {
  temperature: 310,
  pressureAtm: 1,
  ph: 7.4,
};

export const defaultConfig: SimulationDirectorConfig = {
  port: Number(process.env.SIM_DIRECTOR_PORT ?? 8080),
  host: process.env.SIM_DIRECTOR_HOST ?? "0.0.0.0",
  initialEnvironment: defaultEnvironment,
};

export function resolvedEnvironment(config: SimulationDirectorConfig): EnvironmentConfig {
  return config.initialEnvironment ?? defaultEnvironment;
}

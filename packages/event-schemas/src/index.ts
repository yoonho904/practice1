import { z } from "zod";

export const IsoDateString = z.string().datetime({ message: "timestamp must be ISO8601" });

export const AtomicElementSchema = z.object({
  element: z.string(),
  symbol: z.string().min(1).max(2),
  atomicNumber: z.number().int().positive(),
  atomicMass: z.number().positive(),
  electronConfiguration: z.string(),
  electronegativity: z.number().nullable(),
  oxidationStates: z.array(z.number().int()).min(1),
  reductionPotential: z.number().nullable(),
});

export type AtomicElement = z.infer<typeof AtomicElementSchema>;

export const ActiveElementChangedSchema = z.object({
  type: z.literal("atomic-selection/active-element-changed"),
  payload: z.object({
    element: AtomicElementSchema,
    triggeredBy: z.enum(["user", "system"]),
    correlationId: z.string().uuid(),
    timestamp: IsoDateString,
  }),
});

export type ActiveElementChanged = z.infer<typeof ActiveElementChangedSchema>;

export const EnvironmentControlSchema = z.object({
  temperature: z.number().min(200).max(400),
  pressureAtm: z.number().min(0.1).max(5.0),
  ph: z.number().min(0).max(14),
});

export const EnvironmentAdjustedSchema = z.object({
  type: z.literal("environment/adjusted"),
  payload: EnvironmentControlSchema.merge(
    z.object({
      correlationId: z.string().uuid(),
      timestamp: IsoDateString,
    }),
  ),
});

export type EnvironmentAdjusted = z.infer<typeof EnvironmentAdjustedSchema>;

export const EngineKinds = z.enum(["chemistry", "physics", "biology"]);
export type EngineKind = z.infer<typeof EngineKinds>;

export const EngineStateUpdateSchema = z.object({
  type: z.literal("engine/state-update"),
  payload: z.object({
    engine: EngineKinds,
    timestep: z.number().int().nonnegative(),
    correlationId: z.string().uuid(),
    timestamp: IsoDateString,
    summary: z.string(),
    metrics: z.record(z.string(), z.number()),
  }),
});

export type EngineStateUpdate = z.infer<typeof EngineStateUpdateSchema>;

export const OrbitalSampleSchema = z.object({
  position: z.tuple([z.number(), z.number(), z.number()]),
  density: z.number(),
  quantum: z.object({
    n: z.number().int().positive(),
    l: z.number().int().nonnegative(),
    m: z.number().int(),
    spin: z.number().refine((value) => value === 1 || value === -1),
  }),
});

export type OrbitalSample = z.infer<typeof OrbitalSampleSchema>;

export const OrbitalSamplesSchema = z.object({
  type: z.literal("visualization/orbital-samples"),
  payload: z.object({
    elementSymbol: z.string().min(1).max(2),
    samples: z.array(OrbitalSampleSchema).max(8000),
    computedOn: z.string(),
  }),
});

export type OrbitalSamples = z.infer<typeof OrbitalSamplesSchema>;

export const ClientCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("command/select-element"),
    payload: z.object({
      elementSymbol: z.string().min(1).max(2),
      correlationId: z.string().uuid(),
    }),
  }),
  z.object({
    type: z.literal("command/update-environment"),
    payload: EnvironmentControlSchema.merge(
      z.object({
        correlationId: z.string().uuid(),
      }),
    ),
  }),
  z.object({
    type: z.literal("command/request-status"),
    payload: z.object({
      correlationId: z.string().uuid(),
    }),
  }),
]);

export type ClientCommand = z.infer<typeof ClientCommandSchema>;

export const EventEnvelopeSchema = z.discriminatedUnion("type", [
  ActiveElementChangedSchema,
  EnvironmentAdjustedSchema,
  EngineStateUpdateSchema,
  OrbitalSamplesSchema,
]);

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export function parseClientCommand(json: unknown): ClientCommand {
  return ClientCommandSchema.parse(json);
}

export function parseEventEnvelope(json: unknown): EventEnvelope {
  return EventEnvelopeSchema.parse(json);
}

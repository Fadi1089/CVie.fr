import { z, type ZodTypeAny } from "zod";

export type ControlDescriptor =
  | { key: string; kind: "radio"; choices: readonly string[] }
  | { key: string; kind: "unknown" };

export function introspectCustomizationSchema(
  schema: ZodTypeAny,
): ControlDescriptor[] {
  if (!(schema instanceof z.ZodObject)) return [];
  const shape = (schema as z.ZodObject<Record<string, ZodTypeAny>>).shape;
  return Object.entries(shape).map(([key, field]) => {
    if (field instanceof z.ZodEnum) {
      return { key, kind: "radio", choices: field.options as readonly string[] };
    }
    return { key, kind: "unknown" };
  });
}

import { z } from "zod";
export function readConfig(env: NodeJS.ProcessEnv) {
  const c = z
    .object({
      DATABASE_URL: z.string().min(1),
      PORT: z.coerce.number().int().min(1).max(65535).default(3000),
      HOST_PORT: z.coerce.number().int().min(1).max(65535).default(8155),
      PUBLIC_DOMAIN: z.string().url().default("http://localhost"),
    })
    .parse(env);
  const origin = new URL(c.PUBLIC_DOMAIN);
  if (
    origin.port ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    origin.username ||
    origin.password
  )
    throw new Error("PUBLIC_DOMAIN must be an origin without port");
  return {
    ...c,
    PUBLIC_BASE_URL: ["localhost", "127.0.0.1", "[::1]"].includes(
      origin.hostname,
    )
      ? origin.origin + ":" + c.HOST_PORT
      : origin.origin,
  };
}

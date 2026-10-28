import { registerPreviewRoute } from "./preview-route.js";
import { ZodError } from "zod";
import { GeneticsError } from "@botanica/genetics";
import { registerGeneticsRoutes } from "./genetics-routes.js";
import Fastify from "fastify";
export function createApp(
  checkDatabase: () => Promise<unknown>,
  logger = false,
) {
  const app = Fastify({ logger, bodyLimit: 65536 });
  app.get("/health", async (_request, reply) => {
    try {
      await checkDatabase();
      return { status: "ok", database: "connected" };
    } catch {
      return reply.code(503).send({
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Database is unavailable.",
        },
      });
    }
  });
  registerGeneticsRoutes(app);
  registerPreviewRoute(app);
  app.setNotFoundHandler((_request, reply) =>
    reply
      .code(404)
      .send({ error: { code: "NOT_FOUND", message: "Route not found." } }),
  );
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError)
      return reply.code(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Request validation failed.",
          details: error.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
        },
      });
    if (error instanceof GeneticsError)
      return reply
        .code(error.code === "INCOMPATIBLE_SPECIES" ? 409 : 400)
        .send({ error: { code: error.code, message: error.message } });
    request.log.error(error);
    const code =
      typeof error === "object" && error !== null && "statusCode" in error
        ? error.statusCode
        : undefined;
    const status =
      typeof code === "number" && code >= 400 && code < 500 ? code : 500;
    reply.code(status).send({
      error: {
        code: status === 500 ? "INTERNAL_ERROR" : "INVALID_REQUEST",
        message:
          status === 500
            ? "An unexpected error occurred."
            : "Request could not be processed.",
      },
    });
  });
  return app;
}

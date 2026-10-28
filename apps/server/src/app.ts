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
      return reply
        .code(503)
        .send({
          error: {
            code: "DATABASE_UNAVAILABLE",
            message: "Database is unavailable.",
          },
        });
    }
  });
  app.setNotFoundHandler((_request, reply) =>
    reply
      .code(404)
      .send({ error: { code: "NOT_FOUND", message: "Route not found." } }),
  );
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const code =
      typeof error === "object" && error !== null && "statusCode" in error
        ? error.statusCode
        : undefined;
    const status =
      typeof code === "number" && code >= 400 && code < 500 ? code : 500;
    reply
      .code(status)
      .send({
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

import { GameService } from "./game-service.js";
import { DEMO_PLAYER_ID } from "./constants.js";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import {
  createPlantSchema,
  breedingRequestSchema,
  pageQuerySchema,
  plantListQuerySchema,
} from "@botanica/shared";
import { PlantRepository } from "./plants.js";
export function registerPlantRoutes(app: FastifyInstance, pool: Pool) {
  const repository = (request: import("fastify").FastifyRequest) =>
    new PlantRepository(pool, request.identity!.id);
  app.get("/api/v1/plants", (request) =>
    repository(request).listPlants(plantListQuerySchema.parse(request.query)),
  );
  app.get("/api/v1/collection/stats", (request) => repository(request).stats());
  app.get("/api/v1/plants/:id/birth", (request) =>
    repository(request).birthEvent(
      z.object({ id: z.uuid() }).parse(request.params).id,
    ),
  );
  app.get("/api/v1/plants/:id", (request) =>
    repository(request).getPlant(
      z.object({ id: z.uuid() }).parse(request.params).id,
    ),
  );
  app.post("/api/v1/plants", async (request, reply) =>
    reply
      .code(201)
      .send(
        await repository(request).createPlant(
          createPlantSchema.parse(request.body),
        ),
      ),
  );
  app.post("/api/v1/breeding", (request) =>
    request.identity!.id === DEMO_PLAYER_ID
      ? repository(request).cross(breedingRequestSchema.parse(request.body))
      : new GameService(pool).cross(
          request.identity!.id,
          breedingRequestSchema.parse(request.body),
        ),
  );
  app.get("/api/v1/breeding", (request) =>
    repository(request).listEvents(pageQuerySchema.parse(request.query)),
  );
}

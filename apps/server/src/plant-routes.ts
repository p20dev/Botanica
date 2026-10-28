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
  const repository = new PlantRepository(pool);
  app.get("/api/v1/plants", (request) =>
    repository.listPlants(plantListQuerySchema.parse(request.query)),
  );
  app.get("/api/v1/collection/stats", () => repository.stats());
  app.get("/api/v1/plants/:id/birth", (request) =>
    repository.birthEvent(z.object({ id: z.uuid() }).parse(request.params).id),
  );
  app.get("/api/v1/plants/:id", (request) =>
    repository.getPlant(z.object({ id: z.uuid() }).parse(request.params).id),
  );
  app.post("/api/v1/plants", async (request, reply) =>
    reply
      .code(201)
      .send(
        await repository.createPlant(createPlantSchema.parse(request.body)),
      ),
  );
  app.post("/api/v1/breeding", (request) =>
    repository.cross(breedingRequestSchema.parse(request.body)),
  );
  app.get("/api/v1/breeding", (request) =>
    repository.listEvents(pageQuerySchema.parse(request.query)),
  );
}

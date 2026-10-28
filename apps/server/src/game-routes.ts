import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { gameActionSchema, plantListQuerySchema } from "@botanica/shared";
import { z } from "zod";
import { GameService } from "./game-service.js";
import { PlantRepository } from "./plants.js";
import { DEMO_PLAYER_ID } from "./constants.js";
export function registerGameRoutes(app: FastifyInstance, pool: Pool) {
  const game = new GameService(pool);
  app.get("/api/v1/game/state", (request) => game.state(request.identity!));
  app.post("/api/v1/game/action", (request) =>
    game.action(request.identity!.id, gameActionSchema.parse(request.body)),
  );
  app.get("/api/v1/demo/plants", (request) =>
    new PlantRepository(pool, DEMO_PLAYER_ID).listPlants(
      plantListQuerySchema.parse(request.query),
    ),
  );
  app.get("/api/v1/demo/collection/stats", () =>
    new PlantRepository(pool, DEMO_PLAYER_ID).stats(),
  );
  app.get("/api/v1/demo/plants/:id/birth", (request) =>
    new PlantRepository(pool, DEMO_PLAYER_ID).birthEvent(
      z.object({ id: z.uuid() }).parse(request.params).id,
    ),
  );
  app.get("/api/v1/demo/plants/:id", (request) =>
    new PlantRepository(pool, DEMO_PLAYER_ID).getPlant(
      z.object({ id: z.uuid() }).parse(request.params).id,
    ),
  );
}

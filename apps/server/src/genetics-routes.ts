import type { FastifyInstance } from "fastify";
import { catalog, resolvePhenotype, classifyRarity } from "@botanica/genetics";
import {
  resolveRequestSchema,
  type CatalogResponse,
  type ResolveResponse,
} from "@botanica/shared";
export function registerGeneticsRoutes(app: FastifyInstance) {
  app.get("/api/v1/catalog/species", async (): Promise<CatalogResponse> => ({
    catalogVersion: 1,
    species: catalog,
  }));
  app.post(
    "/api/v1/phenotype/resolve",
    async (request): Promise<ResolveResponse> => {
      const input = resolveRequestSchema.parse(request.body);
      const phenotype = resolvePhenotype(
        input.speciesId,
        input.genome,
        input.mutations,
        input.catalogVersion,
      );
      return { phenotype, rarity: classifyRarity(phenotype) };
    },
  );
}

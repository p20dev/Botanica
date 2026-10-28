import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { resolvePhenotype } from "@botanica/genetics";
import { resolveRequestSchema } from "@botanica/shared";
import { layoutPlant, renderSvg, stages } from "@botanica/renderer";
const previewSchema = resolveRequestSchema.extend({
  visualSeed: z.number().int().min(-2147483648).max(2147483647),
  growthStage: z.enum(stages).default("mature"),
  rendererVersion: z.literal(1).default(1),
  background: z.enum(["transparent", "warm"]).default("transparent"),
});
export function registerPreviewRoute(app: FastifyInstance) {
  app.post("/api/v1/preview", async (request) => {
    const input = previewSchema.parse(request.body),
      phenotype = resolvePhenotype(
        input.speciesId,
        input.genome,
        input.mutations,
        input.catalogVersion,
      );
    return {
      rendererVersion: 1,
      svg: renderSvg(
        layoutPlant(
          input.speciesId,
          phenotype,
          input.visualSeed,
          input.growthStage,
          input.rendererVersion,
        ),
        { namespace: "preview", background: input.background },
      ),
    };
  });
}

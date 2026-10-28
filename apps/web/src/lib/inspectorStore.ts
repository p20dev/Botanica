import { create } from "zustand";
import type { GrowthStage, Background } from "@botanica/renderer";
export const useInspectorOptions = create<{
  stage: GrowthStage;
  background: Background;
  set: (
    options: Partial<{ stage: GrowthStage; background: Background }>,
  ) => void;
}>((set) => ({ stage: "flowering", background: "warm", set }));

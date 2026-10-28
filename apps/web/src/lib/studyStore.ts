import { create } from "zustand";
import type { Background, GrowthStage } from "@botanica/renderer";
interface StudyState {
  studyId: string;
  stage: GrowthStage;
  visualSeed: number;
  goldenVeins: boolean;
  background: Background;
  set: (value: Partial<Omit<StudyState, "set">>) => void;
}
export const useStudy = create<StudyState>((set) => ({
  studyId: "LGS",
  stage: "flowering",
  visualSeed: 8155,
  goldenVeins: false,
  background: "warm",
  set: (value) => set(value),
}));

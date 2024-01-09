import { Deletable } from "src/types";

export type Brand = Deletable<{
  id: string;
  name: string;
  models: Set<string>;
  updatedAt: number;
}>;

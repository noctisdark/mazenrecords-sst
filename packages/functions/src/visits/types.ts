import { Deletable } from "src/types";

export type Visit = Deletable<{
  id: string;
  date: number;
  client: string;
  contact: string;
  brand: string;
  model: string;
  problem: string;
  fix: string;
  amount: number;
  updatedAt: number;
}>;

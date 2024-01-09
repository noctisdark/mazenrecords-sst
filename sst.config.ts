import { SSTConfig } from "sst";

import { VisitsStack } from "./stacks/VisitsStack";

export default {
  config(input) {
    return {
      name: "visits-app",
      // apparently doesn't apply to dev
      region: process.env.REGION,
      // ideally depending on stage
      profile: "learnaws-dev",
    };
  },
  stacks(app) {
    app.stack(VisitsStack)
  },
} satisfies SSTConfig;

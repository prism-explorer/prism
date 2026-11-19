import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // src/index.ts reads SOROBAN_RPC_URL while the module is loading. The suite
    // never calls the network; the missing-variable case is spawned separately.
    env: {
      SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
    },
  },
});

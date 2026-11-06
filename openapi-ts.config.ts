import { defineConfig } from "@hey-api/openapi-ts";

// Defaults to the checked-in snapshot so builds work without a running backend.
// Point at the live spec with OPENAPI_INPUT=http://localhost:8080/v3/api-docs
export default defineConfig({
  input: process.env.OPENAPI_INPUT ?? "./openapi/inatrace-api.json",
  output: "src/client",
  plugins: [
    "@hey-api/typescript",
  ],
});

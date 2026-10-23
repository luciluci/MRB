import type { NextConfig } from "next";
import { netlifyStoreName } from "./src/lib/netlify-store-name";

const config: NextConfig = {
  // CONTEXT is build-only on Netlify. Bake this non-secret name into the app
  // so a preview function can never fall back to the production data store.
  env: { MRB_STORE: netlifyStoreName(process.env.CONTEXT) },
};

export default config;

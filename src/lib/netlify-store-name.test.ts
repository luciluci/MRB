import assert from "node:assert/strict";
import test from "node:test";
import { netlifyStoreName } from "./netlify-store-name";

test("only a production build selects the production demo store", () => {
  assert.equal(netlifyStoreName("production"), "mrb-demo");
  assert.equal(netlifyStoreName("deploy-preview"), "mrb-demo-deploy-preview");
  assert.equal(netlifyStoreName("branch-deploy"), "mrb-demo-branch-deploy");
  assert.equal(netlifyStoreName(undefined), "mrb-demo-dev");
});

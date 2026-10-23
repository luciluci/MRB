import assert from "node:assert/strict";
import test from "node:test";
import { schematicPosition } from "./map";

test("schematic map places Iași and Bucharest pins separately", () => {
  const bucharest = { lat: 44.44, lng: 26.10 };
  const iasi = { lat: 47.16, lng: 27.59 };
  const left = schematicPosition(bucharest, [bucharest, iasi]);
  const right = schematicPosition(iasi, [bucharest, iasi]);
  assert.ok(right.left > left.left);
  assert.ok(right.top < left.top);
  assert.ok(right.left - left.left > 40);
});

test("a single GPS pin remains visible in the middle of the schematic map", () => {
  assert.deepEqual(schematicPosition({ lat: 47.1603, lng: 27.5957 }, [{ lat: 47.1603, lng: 27.5957 }]), { left: 50, top: 50 });
});

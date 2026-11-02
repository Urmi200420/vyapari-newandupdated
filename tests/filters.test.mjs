import test from "node:test";
import assert from "node:assert/strict";
import { products } from "../src/customer/data.js";
import { filterProducts } from "../src/customer/filters.js";
const run = (filters) => filterProducts(products, filters);
const ids = (filters) => run(filters).list.map((p) => p.id);
test("empty bounds restore all 24 products, with inclusive minimum and maximum", () => {
  assert.equal(run({}).list.length, 24);
  assert.deepEqual(ids({ min: "499", max: "499" }), [9]);
  assert.deepEqual(ids({ min: "40", max: "79" }), [1, 2, 4]);
  assert.deepEqual(ids({ max: "55" }), [2, 4]);
  assert.deepEqual(ids({ min: "17999" }), [5, 6]);
});
test("zero is a bound, not an empty value; valid no-match ranges remain valid", () => {
  assert.equal(run({ min: "0" }).list.length, 24);
  for (const filters of [
    { max: "0" },
    { min: "0", max: "0" },
    { min: "80", max: "100" },
    { min: "50000" },
  ]) {
    assert.equal(run(filters).valid, true);
    assert.equal(run(filters).list.length, 0);
  }
});
test("search, category, both bounds and sorting combine on the final list", () => {
  assert.deepEqual(
    ids({
      query: "  COTTON ",
      category: "clothing",
      min: "400",
      max: "1400",
      sort: "desc",
    }),
    [12, 9],
  );
  assert.deepEqual(
    ids({ category: "veggies", min: "40", max: "189", sort: "asc" }),
    [4, 2, 1, 3],
  );
  assert.deepEqual(
    ids({ category: "electronics", min: "2000", max: "18000", sort: "desc" }),
    [5, 8, 7],
  );
  assert.deepEqual(ids({ min: "55.01", max: "79.99" }), [1]);
  assert.equal(run({ query: "cotton", category: "books" }).list.length, 0);
});
test("invalid bounds and reversed ranges report validation rather than no matches", () => {
  for (const filters of [
    { min: "-1" },
    { max: "-1" },
    { min: "NaN" },
    { max: "Infinity" },
    { min: "500", max: "100" },
    { minBadInput: true },
    { maxBadInput: true },
  ]) {
    const result = run(filters);
    assert.equal(result.valid, false);
    assert.ok(Object.keys(result.errors).length);
  }
  assert.equal(run({ min: "", max: "0" }).valid, true);
  assert.equal(run({ min: "0", max: "" }).valid, true);
});
test("filtering and sorting never mutate the original catalogue", () => {
  const before = products.map((p) => p.id);
  run({ sort: "desc", min: "500" });
  assert.deepEqual(
    products.map((p) => p.id),
    before,
  );
});

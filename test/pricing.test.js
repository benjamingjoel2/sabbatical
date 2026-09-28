import test from "node:test";
import assert from "node:assert/strict";

import {
  quote,
  discountRateFor,
  fromPrice,
  formatPrice,
  EXTRA_TRAVELLER_RATE,
  MAX_TRAVELLERS,
} from "../src/pricing.js";
import { PACKAGES, ADDONS, getPackage } from "../src/data/packages.js";

const lisbon = getPackage("lisbon-atlantic-quarter");
const coworking = ADDONS.find((a) => a.id === "coworking");

test("discount tiers step up with stay length", () => {
  assert.equal(discountRateFor(1), 0);
  assert.equal(discountRateFor(2), 0.05);
  assert.equal(discountRateFor(3), 0.1);
  assert.equal(discountRateFor(5), 0.1);
  assert.equal(discountRateFor(6), 0.18);
  assert.equal(discountRateFor(12), 0.18);
});

test("one traveller, one month, no add-ons is the base price", () => {
  const q = quote(lisbon, { months: 1 });
  assert.equal(q.accommodation, 2450);
  assert.equal(q.discount, 0);
  assert.equal(q.addons, 0);
  assert.equal(q.total, 2450);
  assert.equal(q.perMonth, 2450);
  assert.equal(q.perPersonPerMonth, 2450);
});

test("three months applies the ten percent tier to accommodation only", () => {
  const q = quote(lisbon, { months: 3, addons: [coworking] });
  assert.equal(q.accommodation, 7350);
  assert.equal(q.discount, 735);
  assert.equal(q.addons, 540);
  assert.equal(q.total, 7350 - 735 + 540);
});

test("extra travellers pay a reduced share of accommodation but full add-ons", () => {
  const q = quote(lisbon, { months: 1, travellers: 2, addons: [coworking] });
  assert.equal(q.accommodation, 2450 * (1 + EXTRA_TRAVELLER_RATE));
  assert.equal(q.addons, coworking.pricePerMonth * 2);
  assert.equal(q.perPersonPerMonth, q.total / 2);
});

test("six months earns the top tier", () => {
  const q = quote(lisbon, { months: 6 });
  assert.equal(q.discountRate, 0.18);
  assert.equal(q.total, 12054);
});

test("rejects stays outside the package range", () => {
  const kyoto = getPackage("kyoto-machiya");
  assert.throws(() => quote(kyoto, { months: 6 }), RangeError);
  const hobart = getPackage("tasmania-hobart");
  assert.throws(() => quote(hobart, { months: 1 }), RangeError);
});

test("rejects invalid months and traveller counts", () => {
  assert.throws(() => quote(lisbon, { months: 0 }), RangeError);
  assert.throws(() => quote(lisbon, { months: 1.5 }), RangeError);
  assert.throws(() => quote(lisbon, { months: 1, travellers: 0 }), RangeError);
  assert.throws(() => quote(lisbon, { months: 1, travellers: MAX_TRAVELLERS + 1 }), RangeError);
});

test("fromPrice is the best per-person monthly rate the package can reach", () => {
  assert.equal(fromPrice(lisbon), 2009);
  const oaxaca = getPackage("oaxaca-courtyard-house");
  assert.equal(fromPrice(oaxaca), 1710);
});

test("formatPrice renders whole euros", () => {
  assert.equal(formatPrice(2450), "€2,450");
  assert.equal(formatPrice(1234.56), "€1,235");
});

test("catalog is well formed", () => {
  const ids = new Set();
  for (const pkg of PACKAGES) {
    assert.ok(!ids.has(pkg.id), `duplicate id ${pkg.id}`);
    ids.add(pkg.id);
    assert.ok(pkg.pricePerMonth > 0);
    assert.ok(pkg.minMonths >= 1);
    assert.ok(pkg.maxMonths >= pkg.minMonths);
    assert.ok(pkg.vibes.length > 0);
    assert.equal(pkg.palette.length, 2);
    assert.ok(pkg.phases.length >= 3);
    assert.ok(pkg.bestMonths.every((m) => m >= 1 && m <= 12));
  }
});

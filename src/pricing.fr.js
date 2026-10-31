/**
 * Pure pricing functions for Sabbatical long-stay packages.
 *
 * Kept free of DOM access so the same code runs in the browser and in tests.
 */

/** Long-stay discount tiers, applied to accommodation only. */
export const DISCOUNT_TIERS = [
  { minMonths: 6, rate: 0.18 },
  { minMonths: 3, rate: 0.1 },
  { minMonths: 2, rate: 0.05 },
];

/** Second and further travellers pay this share of the base monthly price. */
export const EXTRA_TRAVELLER_RATE = 0.35;

export const MAX_TRAVELLERS = 8;

export function discountRateFor(months) {
  for (const tier of DISCOUNT_TIERS) {
    if (months >= tier.minMonths) return tier.rate;
  }
  return 0;
}

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer, got ${value}`);
  }
}

/**
 * Calculate the cost of a stay.
 *
 * @param {object} pkg          A package from the catalog (needs pricePerMonth, minMonths, maxMonths).
 * @param {object} options
 * @param {number} options.months      Length of stay in whole months.
 * @param {number} [options.travellers=1]
 * @param {Array<{id:string,pricePerMonth:number}>} [options.addons=[]]  Selected add-ons, priced per traveller per month.
 * @returns {{months:number,travellers:number,discountRate:number,accommodation:number,discount:number,addons:number,total:number,perMonth:number,perPersonPerMonth:number}}
 */
export function quote(pkg, { months, travellers = 1, addons = [] } = {}) {
  assertPositiveInteger(months, "months");
  assertPositiveInteger(travellers, "travellers");
  if (months < pkg.minMonths || months > pkg.maxMonths) {
    throw new RangeError(
      `${pkg.name} is available for ${pkg.minMonths} to ${pkg.maxMonths} months, got ${months}`,
    );
  }
  if (travellers > MAX_TRAVELLERS) {
    throw new RangeError(`travellers must be at most ${MAX_TRAVELLERS}, got ${travellers}`);
  }

  const travellerMultiplier = 1 + (travellers - 1) * EXTRA_TRAVELLER_RATE;
  const accommodation = pkg.pricePerMonth * months * travellerMultiplier;
  const discountRate = discountRateFor(months);
  const discount = accommodation * discountRate;

  const addonsTotal = addons.reduce(
    (sum, addon) => sum + addon.pricePerMonth * months * travellers,
    0,
  );

  const total = accommodation - discount + addonsTotal;

  return {
    months,
    travellers,
    discountRate,
    accommodation: round(accommodation),
    discount: round(discount),
    addons: round(addonsTotal),
    total: round(total),
    perMonth: round(total / months),
    perPersonPerMonth: round(total / months / travellers),
  };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatPrice(value) {
  return eur.format(value);
}

/** Lowest per-person monthly rate a package can reach, used on catalog cards. */
export function fromPrice(pkg) {
  const months = pkg.maxMonths;
  return round(pkg.pricePerMonth * (1 - discountRateFor(months)));
}

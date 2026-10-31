import { PACKAGES, REGIONS, VIBES, DURATIONS } from "./data/packages.de.js";
import { fromPrice, formatPrice } from "./pricing.de.js";
import { el, fill, loadSaved, saveButton, updateSavedBadge, vibeLabel } from "./ui.de.js";

const form = document.getElementById("filters");
const results = document.getElementById("results");
const resultsCount = document.getElementById("results-count");
const vibesGroup = document.getElementById("vibes");
const budgetOut = document.getElementById("budget-out");

const state = {
  q: "",
  region: "",
  months: "",
  budget: Number(form.budget.max),
  sort: "featured",
  vibes: new Set(),
  savedOnly: false,
};

function populateSelects() {
  for (const region of REGIONS) {
    form.region.append(el("option", { value: region.id, text: region.label }));
  }
  for (const d of DURATIONS) {
    form.months.append(el("option", { value: String(d.months), text: d.label }));
  }
  const maxPrice = Math.max(...PACKAGES.map((p) => p.pricePerMonth));
  form.budget.max = String(Math.ceil(maxPrice / 100) * 100);
  form.budget.value = form.budget.max;
  state.budget = Number(form.budget.max);
  budgetOut.value = formatPrice(state.budget);
  document.getElementById("stat-count").textContent = String(PACKAGES.length);
}

function renderVibes() {
  vibesGroup.replaceChildren(
    ...VIBES.map((vibe) =>
      el("button", {
        type: "button",
        class: "chip",
        "aria-pressed": state.vibes.has(vibe.id) ? "true" : "false",
        text: vibe.label,
        onClick: (event) => {
          if (state.vibes.has(vibe.id)) state.vibes.delete(vibe.id);
          else state.vibes.add(vibe.id);
          event.currentTarget.setAttribute("aria-pressed", state.vibes.has(vibe.id) ? "true" : "false");
          render();
        },
      }),
    ),
  );
}

function matches(pkg, saved) {
  if (state.savedOnly && !saved.has(pkg.id)) return false;
  if (state.region && pkg.region !== state.region) return false;
  if (state.months) {
    const m = Number(state.months);
    if (m < pkg.minMonths || m > pkg.maxMonths) return false;
  }
  if (pkg.pricePerMonth > state.budget) return false;
  if (state.vibes.size && ![...state.vibes].every((v) => pkg.vibes.includes(v))) return false;
  if (state.q) {
    const hay = [pkg.name, pkg.destination, pkg.country, pkg.tagline, pkg.summary, ...pkg.vibes]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(state.q)) return false;
  }
  return true;
}

function sortPackages(list) {
  const copy = [...list];
  switch (state.sort) {
    case "price-asc":
      return copy.sort((a, b) => a.pricePerMonth - b.pricePerMonth);
    case "price-desc":
      return copy.sort((a, b) => b.pricePerMonth - a.pricePerMonth);
    case "name":
      return copy.sort((a, b) => a.destination.localeCompare(b.destination));
    default:
      return copy;
  }
}

function card(pkg, saved) {
  const region = REGIONS.find((r) => r.id === pkg.region)?.label ?? pkg.region;
  const href = `package.html?id=${encodeURIComponent(pkg.id)}`;
  return el("article", { class: "card" }, [
    el("div", { class: "card-art", style: { "--c1": pkg.palette[0], "--c2": pkg.palette[1] } }, [
      el("span", { class: "badge", text: region }),
      saveButton(pkg.id, saved, () => {
        if (state.savedOnly) render();
      }),
    ]),
    el("div", { class: "card-body" }, [
      el("span", { class: "card-place", text: `${pkg.destination}, ${pkg.country}` }),
      el("h3", {}, el("a", { href, text: pkg.name })),
      el("p", { class: "card-tagline", text: pkg.tagline }),
      el("div", { class: "card-foot" }, [
        el("div", { class: "price" }, [
          `Ab ${formatPrice(pkg.pricePerMonth)}`,
          el("small", {
            text:
              pkg.maxMonths > 1
                ? fill("pro Monat, oder ab {price} bei {n} Monaten Aufenthalt", { price: formatPrice(fromPrice(pkg)), n: pkg.maxMonths })
                : "pro Monat",
          }),
        ]),
        el(
          "div",
          { class: "tags" },
          pkg.vibes.slice(0, 2).map((v) => el("span", { class: "tag", text: vibeLabel(VIBES, v) })),
        ),
      ]),
    ]),
  ]);
}

function render() {
  const saved = loadSaved();
  const list = sortPackages(PACKAGES.filter((pkg) => matches(pkg, saved)));
  results.replaceChildren(
    ...(list.length
      ? list.map((pkg) => card(pkg, saved))
      : [
          el("div", { class: "empty" }, [
            el("p", { text: state.savedOnly ? "Sie haben sich noch keine Angebote gemerkt." : "Keine Angebote passen zu diesen Filtern." }),
            el("button", { type: "button", class: "btn btn-ghost btn-small", text: "Filter zurücksetzen", onClick: clearFilters }),
          ]),
        ]),
  );
  const one = list.length === 1;
  resultsCount.textContent = state.savedOnly
    ? fill(one ? "{n} gemerktes Angebot" : "{n} gemerkte Angebote", { n: list.length })
    : fill(one ? "{n} von {total} Angeboten" : "{n} von {total} Angeboten", { n: list.length, total: PACKAGES.length });
}

function readForm() {
  state.q = form.q.value.trim().toLowerCase();
  state.region = form.region.value;
  state.months = form.months.value;
  state.budget = Number(form.budget.value);
  state.sort = form.sort.value;
  budgetOut.value = formatPrice(state.budget);
}

function clearFilters() {
  form.reset();
  form.budget.value = form.budget.max;
  state.vibes.clear();
  state.savedOnly = false;
  document.getElementById("saved-link").setAttribute("aria-pressed", "false");
  renderVibes();
  readForm();
  render();
}

function applyQueryString() {
  const params = new URLSearchParams(location.search);
  if (params.get("region")) form.region.value = params.get("region");
  if (params.get("months")) form.months.value = params.get("months");
  if (params.get("q")) form.q.value = params.get("q");
  for (const v of params.getAll("vibe")) if (VIBES.some((x) => x.id === v)) state.vibes.add(v);
  if (params.get("saved") === "1") state.savedOnly = true;
}

populateSelects();
applyQueryString();
renderVibes();
readForm();
render();
updateSavedBadge();

form.addEventListener("input", () => {
  readForm();
  render();
});
form.addEventListener("submit", (event) => event.preventDefault());
document.getElementById("clear-filters").addEventListener("click", clearFilters);
document.getElementById("saved-link").addEventListener("click", (event) => {
  event.preventDefault();
  state.savedOnly = !state.savedOnly;
  event.currentTarget.setAttribute("aria-pressed", state.savedOnly ? "true" : "false");
  render();
  document.getElementById("packages").scrollIntoView({ behavior: "smooth" });
});
window.addEventListener("storage", () => {
  updateSavedBadge();
  render();
});

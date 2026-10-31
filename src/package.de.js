import { getPackage, REGIONS, VIBES, ADDONS } from "./data/packages.de.js";
import { quote, formatPrice, fromPrice, discountRateFor, MAX_TRAVELLERS } from "./pricing.de.js";
import { el, fill, loadSaved, saveButton, updateSavedBadge, vibeLabel } from "./ui.de.js";

const MONTH_NAMES = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
const INQUIRY_KEY = "sabbatical.inquiries";

const main = document.getElementById("detail");
const params = new URLSearchParams(location.search);
const pkg = getPackage(params.get("id") ?? "");

if (!pkg) {
  renderNotFound();
} else {
  renderPackage(pkg);
}
updateSavedBadge();

function renderNotFound() {
  document.title = "Angebot nicht gefunden | Sabbatical";
  main.replaceChildren(
    el("section", { class: "wrap", style: { padding: "64px var(--gutter)" } }, [
      el("h1", { text: "Dieses Angebot haben wir nicht gefunden." }),
      el("p", { class: "summary", text: "Vielleicht wurde es eingestellt, oder der Link ist unvollständig. Hier ist alles, was wir derzeit anbieten." }),
      el("a", { class: "btn btn-accent", href: "index.html#packages", text: "Angebote ansehen" }),
    ]),
  );
}

function renderPackage(pkg) {
  document.title = `${pkg.name}, ${pkg.destination} | Sabbatical`;
  const region = REGIONS.find((r) => r.id === pkg.region)?.label ?? pkg.region;
  const saved = loadSaved();

  const hero = el("section", { class: "detail-hero", style: { "--c1": pkg.palette[0], "--c2": pkg.palette[1] } }, [
    el("div", { class: "wrap" }, [
      el("a", { class: "back", href: "index.html#packages", text: "← Alle Angebote" }),
      el("span", { class: "eyebrow", text: `${pkg.destination}, ${pkg.country} · ${region}` }),
      el("h1", { text: pkg.name }),
      el("p", { class: "tagline", text: pkg.tagline }),
    ]),
  ]);

  const panel = bookingPanel(pkg, saved);

  const layout = el("div", { class: "wrap detail-layout" }, [
    el("div", { class: "detail-main" }, [
      el("section", {}, [
        el("p", { class: "summary", text: pkg.summary }),
        el("ul", { class: "facts" }, [
          fact("Unterkunft", pkg.accommodation),
          fact("Aufenthaltsdauer", pkg.minMonths === pkg.maxMonths ? fill("{n} Monate", { n: pkg.minMonths }) : fill("{a} bis {b} Monate", { a: pkg.minMonths, b: pkg.maxMonths })),
          fact("Ab", `${formatPrice(fromPrice(pkg))} pro Person und Monat`),
          fact("Ideal für", pkg.vibes.map((v) => vibeLabel(VIBES, v)).join(", ")),
        ]),
      ]),
      el("section", {}, [
        el("h2", { text: "Höhepunkte" }),
        el("ul", { class: "check-list" }, pkg.highlights.map((h) => el("li", { text: h }))),
      ]),
      el("section", {}, [
        el("h2", { text: "Inklusive" }),
        el("ul", { class: "check-list two-col" }, pkg.includes.map((h) => el("li", { text: h }))),
      ]),
      el("section", {}, [
        el("h2", { text: "So verläuft der Aufenthalt" }),
        el("ol", { class: "timeline" }, pkg.phases.map((phase) =>
          el("li", {}, [
            el("span", { class: "when", text: phase.weeks }),
            el("h3", { text: phase.title }),
            el("p", { text: phase.text }),
          ]),
        )),
      ]),
      el("section", {}, [
        el("h2", { text: "Beste Reisezeit" }),
        el("p", { class: "summary", text: "In den hervorgehobenen Monaten ist dieser Aufenthalt am schönsten. Andere Monate sind meist ebenfalls verfügbar; fragen Sie Ihren Gastgeber." }),
        el("div", { class: "months", role: "list", "aria-label": "Monate" }, MONTH_NAMES.map((name, i) =>
          el("span", { class: `month${pkg.bestMonths.includes(i + 1) ? " best" : ""}`, role: "listitem", text: name }),
        )),
      ]),
      inquirySection(pkg, panel.getSelection),
    ]),
    panel.node,
  ]);

  main.replaceChildren(hero, layout);
}

function fact(label, value) {
  return el("li", {}, [el("span", { text: label }), value]);
}

function bookingPanel(pkg, saved) {
  const monthChoices = [];
  for (let m = pkg.minMonths; m <= pkg.maxMonths; m += 1) monthChoices.push(m);

  const monthsSelect = el("select", { id: "months", name: "months" }, monthChoices.map((m) => {
    const rate = discountRateFor(m);
    const label = rate ? fill("{n} Monate ({pct} % Rabatt)", { n: m, pct: Math.round(rate * 100) }) : fill(m === 1 ? "{n} Monat" : "{n} Monate", { n: m });
    return el("option", { value: String(m), text: label });
  }));
  const defaultMonths = monthChoices.includes(3) ? 3 : monthChoices[0];
  monthsSelect.value = String(defaultMonths);

  const travellersSelect = el("select", { id: "travellers", name: "travellers" },
    Array.from({ length: MAX_TRAVELLERS }, (_, i) => i + 1).map((n) =>
      el("option", { value: String(n), text: fill(n === 1 ? "{n} Person" : "{n} Personen", { n }) }),
    ),
  );

  const addonInputs = ADDONS.filter((a) => !(pkg.includedAddons ?? []).includes(a.id))
    .map((addon) =>
      el("label", { class: "option" }, [
        el("input", { type: "checkbox", name: "addon", value: addon.id }),
        el("span", { class: "option-text" }, [addon.label, el("small", { text: addon.description })]),
        el("span", { class: "option-price", text: `${formatPrice(addon.pricePerMonth)}/mo` }),
      ]),
    );

  const quoteBox = el("div", { class: "quote", "aria-live": "polite" });
  const savedToggle = saveButton(pkg.id, saved);
  savedToggle.classList.add("btn-small");
  savedToggle.style.position = "static";

  const node = el("aside", { class: "panel", "aria-label": "Aufenthalt planen" }, [
    el("div", { style: { display: "flex", "justify-content": "space-between", "align-items": "center", gap: "12px" } }, [
      el("div", {}, [
        el("h2", { text: "Aufenthalt planen" }),
        el("p", { class: "from", text: `Ab ${formatPrice(pkg.pricePerMonth)} pro Person und Monat` }),
      ]),
      savedToggle,
    ]),
    el("div", { class: "field" }, [el("label", { for: "months", text: "Aufenthaltsdauer" }), monthsSelect]),
    el("div", { class: "field" }, [el("label", { for: "travellers", text: "Personen" }), travellersSelect]),
    addonInputs.length
      ? el("div", { class: "field" }, [el("span", { class: "label", text: "Extras" }), el("div", { class: "options" }, addonInputs)])
      : null,
    quoteBox,
    el("a", { class: "btn btn-accent", href: "#inquiry", text: "Anfrage senden" }),
    el("p", { class: "panel-note", text: "Jetzt keine Zahlung. Ein Gastgeber bestätigt die Verfügbarkeit innerhalb von zwei Werktagen." }),
  ]);

  function getSelection() {
    const months = Number(monthsSelect.value);
    const travellers = Number(travellersSelect.value);
    const addons = ADDONS.filter((a) =>
      node.querySelector(`input[name="addon"][value="${a.id}"]`)?.checked,
    );
    return { months, travellers, addons };
  }

  function refresh() {
    const selection = getSelection();
    const q = quote(pkg, selection);
    const rows = [
      row("Unterkunft", formatPrice(q.accommodation)),
      q.discount > 0
        ? row(`Langzeitrabatt (${Math.round(q.discountRate * 100)}%)`, `−${formatPrice(q.discount)}`, "discount")
        : null,
      q.addons > 0 ? row("Extras", formatPrice(q.addons)) : null,
      row("Gesamt", formatPrice(q.total), "total"),
      row(
        `Das sind ${formatPrice(q.perPersonPerMonth)} pro Person und Monat`,
        "",
        "per",
      ),
    ];
    quoteBox.replaceChildren(...rows.filter(Boolean));
    document.dispatchEvent(new CustomEvent("sabbatical:quote", { detail: { selection, quote: q } }));
  }

  node.addEventListener("change", refresh);
  refresh();

  return { node, getSelection };
}

function row(label, value, cls) {
  return el("div", { class: cls ?? null }, [el("span", { text: label }), el("span", { text: value })]);
}

function inquirySection(pkg, getSelection) {
  const startOptions = [];
  const now = new Date();
  for (let i = 1; i <= 18; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const best = pkg.bestMonths.includes(d.getMonth() + 1);
    startOptions.push(
      el("option", { value, text: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}${best ? " · beste Reisezeit" : ""}` }),
    );
  }

  const notice = el("div", { class: "notice", role: "status", hidden: true });
  const summary = el("p", { class: "summary", id: "inquiry-summary" });

  const form = el("form", { id: "inquiry-form", novalidate: true }, [
    el("div", { class: "row" }, [
      el("div", { class: "field" }, [
        el("label", { for: "name", text: "Ihr Name" }),
        el("input", { id: "name", name: "name", type: "text", required: true, autocomplete: "name" }),
      ]),
      el("div", { class: "field" }, [
        el("label", { for: "email", text: "E-Mail" }),
        el("input", { id: "email", name: "email", type: "email", required: true, autocomplete: "email" }),
      ]),
    ]),
    el("div", { class: "field" }, [
      el("label", { for: "start", text: "Gewünschter Ankunftsmonat" }),
      el("select", { id: "start", name: "start" }, startOptions),
    ]),
    el("div", { class: "field" }, [
      el("label", { for: "message", text: "Sollten wir noch etwas wissen?" }),
      el("textarea", { id: "message", name: "message", placeholder: "Arbeitszeiten, Kinder, Haustiere, Barrierefreiheit, feste Termine…" }),
    ]),
    el("p", { class: "error", id: "inquiry-error", "aria-live": "polite" }),
    el("button", { type: "submit", class: "btn btn-accent", text: "Anfrage senden" }),
  ]);

  function updateSummary() {
    const sel = getSelection();
    const q = quote(pkg, sel);
    const values = {
      months: fill(sel.months === 1 ? "{n} Monat" : "{n} Monate", { n: sel.months }),
      place: pkg.destination,
      travellers: fill(sel.travellers === 1 ? "{n} Person" : "{n} Personen", { n: sel.travellers }),
      addons: sel.addons.map((a) => a.label.toLowerCase()).join(", "),
      total: formatPrice(q.total),
    };
    summary.textContent = fill(sel.addons.length ? "{months} in {place} für {travellers} mit {addons}: insgesamt {total}." : "{months} in {place} für {travellers}: insgesamt {total}.", values);
  }
  document.addEventListener("sabbatical:quote", updateSummary);
  updateSummary();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const error = form.querySelector("#inquiry-error");
    error.textContent = "";
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    if (!name) {
      error.textContent = "Bitte nennen Sie uns Ihren Namen.";
      form.name.focus();
      return;
    }
    if (!email || !form.email.checkValidity()) {
      error.textContent = "Bitte geben Sie eine gültige E-Mail-Adresse an, damit ein Gastgeber antworten kann.";
      form.email.focus();
      return;
    }
    const sel = getSelection();
    const q = quote(pkg, sel);
    const inquiry = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      packageId: pkg.id,
      name,
      email,
      start: form.start.value,
      message: form.message.value.trim(),
      months: sel.months,
      travellers: sel.travellers,
      addons: sel.addons.map((a) => a.id),
      total: q.total,
      createdAt: new Date().toISOString(),
    };
    try {
      const existing = JSON.parse(localStorage.getItem(INQUIRY_KEY) ?? "[]");
      localStorage.setItem(INQUIRY_KEY, JSON.stringify([...(Array.isArray(existing) ? existing : []), inquiry]));
    } catch {
      /* storage unavailable; the confirmation still shows */
    }
    notice.textContent = fill("Danke, {name}. Ihre Anfrage für {package} ist eingegangen (Referenz {ref}). Ein Gastgeber antwortet innerhalb von zwei Werktagen an {email}.", { name, package: pkg.name, ref: inquiry.id, email });
    notice.hidden = false;
    form.hidden = true;
    notice.scrollIntoView({ behavior: "smooth", block: "center" });
  });


  return el("section", { class: "inquiry", id: "inquiry" }, [
    el("h2", { text: "Anfrage senden" }),
    summary,
    notice,
    form,
  ]);
}


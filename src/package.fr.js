import { getPackage, REGIONS, VIBES, ADDONS } from "./data/packages.fr.js";
import { quote, formatPrice, fromPrice, discountRateFor, MAX_TRAVELLERS } from "./pricing.fr.js";
import { el, fill, loadSaved, saveButton, updateSavedBadge, vibeLabel } from "./ui.fr.js";

const MONTH_NAMES = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
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
  document.title = "Séjour introuvable | Sabbatical";
  main.replaceChildren(
    el("section", { class: "wrap", style: { padding: "64px var(--gutter)" } }, [
      el("h1", { text: "Nous n’avons pas trouvé ce séjour." }),
      el("p", { class: "summary", text: "Il a peut-être été retiré, ou le lien est incomplet. Voici tout ce que nous proposons actuellement." }),
      el("a", { class: "btn btn-accent", href: "index.html#packages", text: "Voir les séjours" }),
    ]),
  );
}

function renderPackage(pkg) {
  document.title = `${pkg.name}, ${pkg.destination} | Sabbatical`;
  const region = REGIONS.find((r) => r.id === pkg.region)?.label ?? pkg.region;
  const saved = loadSaved();

  const hero = el("section", { class: "detail-hero", style: { "--c1": pkg.palette[0], "--c2": pkg.palette[1] } }, [
    el("div", { class: "wrap" }, [
      el("a", { class: "back", href: "index.html#packages", text: "← Tous les séjours" }),
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
          fact("Logement", pkg.accommodation),
          fact("Durée du séjour", pkg.minMonths === pkg.maxMonths ? fill("{n} mois", { n: pkg.minMonths }) : fill("{a} à {b} mois", { a: pkg.minMonths, b: pkg.maxMonths })),
          fact("À partir de", `${formatPrice(fromPrice(pkg))} par personne et par mois`),
          fact("Idéal pour", pkg.vibes.map((v) => vibeLabel(VIBES, v)).join(", ")),
        ]),
      ]),
      el("section", {}, [
        el("h2", { text: "Points forts" }),
        el("ul", { class: "check-list" }, pkg.highlights.map((h) => el("li", { text: h }))),
      ]),
      el("section", {}, [
        el("h2", { text: "Ce qui est inclus" }),
        el("ul", { class: "check-list two-col" }, pkg.includes.map((h) => el("li", { text: h }))),
      ]),
      el("section", {}, [
        el("h2", { text: "Le déroulé du séjour" }),
        el("ol", { class: "timeline" }, pkg.phases.map((phase) =>
          el("li", {}, [
            el("span", { class: "when", text: phase.weeks }),
            el("h3", { text: phase.title }),
            el("p", { text: phase.text }),
          ]),
        )),
      ]),
      el("section", {}, [
        el("h2", { text: "Meilleure période" }),
        el("p", { class: "summary", text: "Les mois en surbrillance sont ceux où ce séjour est à son meilleur. Les autres mois sont généralement disponibles ; renseignez-vous auprès de votre hôte." }),
        el("div", { class: "months", role: "list", "aria-label": "Mois" }, MONTH_NAMES.map((name, i) =>
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
    const label = rate ? fill("{n} mois ({pct} % de remise)", { n: m, pct: Math.round(rate * 100) }) : fill(m === 1 ? "{n} mois" : "{n} mois", { n: m });
    return el("option", { value: String(m), text: label });
  }));
  const defaultMonths = monthChoices.includes(3) ? 3 : monthChoices[0];
  monthsSelect.value = String(defaultMonths);

  const travellersSelect = el("select", { id: "travellers", name: "travellers" },
    Array.from({ length: MAX_TRAVELLERS }, (_, i) => i + 1).map((n) =>
      el("option", { value: String(n), text: fill(n === 1 ? "{n} voyageur" : "{n} voyageurs", { n }) }),
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

  const node = el("aside", { class: "panel", "aria-label": "Préparez votre séjour" }, [
    el("div", { style: { display: "flex", "justify-content": "space-between", "align-items": "center", gap: "12px" } }, [
      el("div", {}, [
        el("h2", { text: "Préparez votre séjour" }),
        el("p", { class: "from", text: `À partir de ${formatPrice(pkg.pricePerMonth)} par personne et par mois` }),
      ]),
      savedToggle,
    ]),
    el("div", { class: "field" }, [el("label", { for: "months", text: "Durée du séjour" }), monthsSelect]),
    el("div", { class: "field" }, [el("label", { for: "travellers", text: "Voyageurs" }), travellersSelect]),
    addonInputs.length
      ? el("div", { class: "field" }, [el("span", { class: "label", text: "Options" }), el("div", { class: "options" }, addonInputs)])
      : null,
    quoteBox,
    el("a", { class: "btn btn-accent", href: "#inquiry", text: "Envoyer une demande" }),
    el("p", { class: "panel-note", text: "Aucun paiement maintenant. Un hôte confirme les disponibilités sous deux jours ouvrés." }),
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
      row("Hébergement", formatPrice(q.accommodation)),
      q.discount > 0
        ? row(`Remise longue durée (${Math.round(q.discountRate * 100)}%)`, `−${formatPrice(q.discount)}`, "discount")
        : null,
      q.addons > 0 ? row("Options", formatPrice(q.addons)) : null,
      row("Total", formatPrice(q.total), "total"),
      row(
        `Soit ${formatPrice(q.perPersonPerMonth)} par personne et par mois`,
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
      el("option", { value, text: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}${best ? " · meilleure saison" : ""}` }),
    );
  }

  const notice = el("div", { class: "notice", role: "status", hidden: true });
  const summary = el("p", { class: "summary", id: "inquiry-summary" });

  const form = el("form", { id: "inquiry-form", novalidate: true }, [
    el("div", { class: "row" }, [
      el("div", { class: "field" }, [
        el("label", { for: "name", text: "Votre nom" }),
        el("input", { id: "name", name: "name", type: "text", required: true, autocomplete: "name" }),
      ]),
      el("div", { class: "field" }, [
        el("label", { for: "email", text: "E-mail" }),
        el("input", { id: "email", name: "email", type: "email", required: true, autocomplete: "email" }),
      ]),
    ]),
    el("div", { class: "field" }, [
      el("label", { for: "start", text: "Mois d’arrivée souhaité" }),
      el("select", { id: "start", name: "start" }, startOptions),
    ]),
    el("div", { class: "field" }, [
      el("label", { for: "message", text: "Quelque chose à nous signaler ?" }),
      el("textarea", { id: "message", name: "message", placeholder: "Horaires de travail, enfants, animaux, besoins d’accessibilité, dates impératives…" }),
    ]),
    el("p", { class: "error", id: "inquiry-error", "aria-live": "polite" }),
    el("button", { type: "submit", class: "btn btn-accent", text: "Envoyer la demande" }),
  ]);

  function updateSummary() {
    const sel = getSelection();
    const q = quote(pkg, sel);
    const values = {
      months: fill(sel.months === 1 ? "{n} mois" : "{n} mois", { n: sel.months }),
      place: pkg.destination,
      travellers: fill(sel.travellers === 1 ? "{n} voyageur" : "{n} voyageurs", { n: sel.travellers }),
      addons: sel.addons.map((a) => a.label.toLowerCase()).join(", "),
      total: formatPrice(q.total),
    };
    summary.textContent = fill(sel.addons.length ? "{months} à {place} pour {travellers}, avec {addons} : {total} au total." : "{months} à {place} pour {travellers} : {total} au total.", values);
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
      error.textContent = "Merci d’indiquer votre nom.";
      form.name.focus();
      return;
    }
    if (!email || !form.email.checkValidity()) {
      error.textContent = "Merci d’indiquer une adresse e-mail valide pour qu’un hôte puisse vous répondre.";
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
    notice.textContent = fill("Merci, {name}. Votre demande pour {package} a bien été reçue (référence {ref}). Un hôte répondra à {email} sous deux jours ouvrés.", { name, package: pkg.name, ref: inquiry.id, email });
    notice.hidden = false;
    form.hidden = true;
    notice.scrollIntoView({ behavior: "smooth", block: "center" });
  });


  return el("section", { class: "inquiry", id: "inquiry" }, [
    el("h2", { text: "Envoyer une demande" }),
    summary,
    notice,
    form,
  ]);
}


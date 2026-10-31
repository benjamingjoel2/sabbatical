import { getPackage, REGIONS, VIBES, ADDONS } from "./data/packages.es.js";
import { quote, formatPrice, fromPrice, discountRateFor, MAX_TRAVELLERS } from "./pricing.es.js";
import { el, fill, loadSaved, saveButton, updateSavedBadge, vibeLabel } from "./ui.es.js";

const MONTH_NAMES = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];
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
  document.title = "Estancia no encontrada | Sabbatical";
  main.replaceChildren(
    el("section", { class: "wrap", style: { padding: "64px var(--gutter)" } }, [
      el("h1", { text: "No hemos encontrado esa estancia." }),
      el("p", { class: "summary", text: "Puede que se haya retirado o que el enlace esté incompleto. Aquí tienes todo lo que ofrecemos ahora." }),
      el("a", { class: "btn btn-accent", href: "index.html#packages", text: "Ver estancias" }),
    ]),
  );
}

function renderPackage(pkg) {
  document.title = `${pkg.name}, ${pkg.destination} | Sabbatical`;
  const region = REGIONS.find((r) => r.id === pkg.region)?.label ?? pkg.region;
  const saved = loadSaved();

  const hero = el("section", { class: "detail-hero", style: { "--c1": pkg.palette[0], "--c2": pkg.palette[1] } }, [
    el("div", { class: "wrap" }, [
      el("a", { class: "back", href: "index.html#packages", text: "← Todas las estancias" }),
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
          fact("Alojamiento", pkg.accommodation),
          fact("Duración de la estancia", pkg.minMonths === pkg.maxMonths ? fill("{n} meses", { n: pkg.minMonths }) : fill("De {a} a {b} meses", { a: pkg.minMonths, b: pkg.maxMonths })),
          fact("Desde", `${formatPrice(fromPrice(pkg))} por persona y mes`),
          fact("Ideal para", pkg.vibes.map((v) => vibeLabel(VIBES, v)).join(", ")),
        ]),
      ]),
      el("section", {}, [
        el("h2", { text: "Lo más destacado" }),
        el("ul", { class: "check-list" }, pkg.highlights.map((h) => el("li", { text: h }))),
      ]),
      el("section", {}, [
        el("h2", { text: "Qué incluye" }),
        el("ul", { class: "check-list two-col" }, pkg.includes.map((h) => el("li", { text: h }))),
      ]),
      el("section", {}, [
        el("h2", { text: "Cómo se desarrolla la estancia" }),
        el("ol", { class: "timeline" }, pkg.phases.map((phase) =>
          el("li", {}, [
            el("span", { class: "when", text: phase.weeks }),
            el("h3", { text: phase.title }),
            el("p", { text: phase.text }),
          ]),
        )),
      ]),
      el("section", {}, [
        el("h2", { text: "Mejor época" }),
        el("p", { class: "summary", text: "Los meses resaltados son los mejores para esta estancia. Los demás suelen estar disponibles; pregunta a tu anfitrión." }),
        el("div", { class: "months", role: "list", "aria-label": "Meses" }, MONTH_NAMES.map((name, i) =>
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
    const label = rate ? fill("{n} meses ({pct} % de descuento)", { n: m, pct: Math.round(rate * 100) }) : fill(m === 1 ? "{n} mes" : "{n} meses", { n: m });
    return el("option", { value: String(m), text: label });
  }));
  const defaultMonths = monthChoices.includes(3) ? 3 : monthChoices[0];
  monthsSelect.value = String(defaultMonths);

  const travellersSelect = el("select", { id: "travellers", name: "travellers" },
    Array.from({ length: MAX_TRAVELLERS }, (_, i) => i + 1).map((n) =>
      el("option", { value: String(n), text: fill(n === 1 ? "{n} viajero" : "{n} viajeros", { n }) }),
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

  const node = el("aside", { class: "panel", "aria-label": "Planifica tu estancia" }, [
    el("div", { style: { display: "flex", "justify-content": "space-between", "align-items": "center", gap: "12px" } }, [
      el("div", {}, [
        el("h2", { text: "Planifica tu estancia" }),
        el("p", { class: "from", text: `Desde ${formatPrice(pkg.pricePerMonth)} por persona y mes` }),
      ]),
      savedToggle,
    ]),
    el("div", { class: "field" }, [el("label", { for: "months", text: "Duración de la estancia" }), monthsSelect]),
    el("div", { class: "field" }, [el("label", { for: "travellers", text: "Viajeros" }), travellersSelect]),
    addonInputs.length
      ? el("div", { class: "field" }, [el("span", { class: "label", text: "Extras" }), el("div", { class: "options" }, addonInputs)])
      : null,
    quoteBox,
    el("a", { class: "btn btn-accent", href: "#inquiry", text: "Enviar una consulta" }),
    el("p", { class: "panel-note", text: "Sin pago ahora. Un anfitrión confirma la disponibilidad en dos días laborables." }),
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
      row("Alojamiento", formatPrice(q.accommodation)),
      q.discount > 0
        ? row(`Descuento por estancia larga (${Math.round(q.discountRate * 100)}%)`, `−${formatPrice(q.discount)}`, "discount")
        : null,
      q.addons > 0 ? row("Extras", formatPrice(q.addons)) : null,
      row("Total", formatPrice(q.total), "total"),
      row(
        `Son ${formatPrice(q.perPersonPerMonth)} por persona y mes`,
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
      el("option", { value, text: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}${best ? " · mejor temporada" : ""}` }),
    );
  }

  const notice = el("div", { class: "notice", role: "status", hidden: true });
  const summary = el("p", { class: "summary", id: "inquiry-summary" });

  const form = el("form", { id: "inquiry-form", novalidate: true }, [
    el("div", { class: "row" }, [
      el("div", { class: "field" }, [
        el("label", { for: "name", text: "Tu nombre" }),
        el("input", { id: "name", name: "name", type: "text", required: true, autocomplete: "name" }),
      ]),
      el("div", { class: "field" }, [
        el("label", { for: "email", text: "Correo electrónico" }),
        el("input", { id: "email", name: "email", type: "email", required: true, autocomplete: "email" }),
      ]),
    ]),
    el("div", { class: "field" }, [
      el("label", { for: "start", text: "Mes de llegada preferido" }),
      el("select", { id: "start", name: "start" }, startOptions),
    ]),
    el("div", { class: "field" }, [
      el("label", { for: "message", text: "¿Algo que debamos saber?" }),
      el("textarea", { id: "message", name: "message", placeholder: "Horario de trabajo, niños, mascotas, necesidades de accesibilidad, fechas que no se pueden mover…" }),
    ]),
    el("p", { class: "error", id: "inquiry-error", "aria-live": "polite" }),
    el("button", { type: "submit", class: "btn btn-accent", text: "Enviar consulta" }),
  ]);

  function updateSummary() {
    const sel = getSelection();
    const q = quote(pkg, sel);
    const values = {
      months: fill(sel.months === 1 ? "{n} mes" : "{n} meses", { n: sel.months }),
      place: pkg.destination,
      travellers: fill(sel.travellers === 1 ? "{n} viajero" : "{n} viajeros", { n: sel.travellers }),
      addons: sel.addons.map((a) => a.label.toLowerCase()).join(", "),
      total: formatPrice(q.total),
    };
    summary.textContent = fill(sel.addons.length ? "{months} en {place} para {travellers} con {addons}: {total} en total." : "{months} en {place} para {travellers}: {total} en total.", values);
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
      error.textContent = "Indícanos tu nombre, por favor.";
      form.name.focus();
      return;
    }
    if (!email || !form.email.checkValidity()) {
      error.textContent = "Introduce un correo electrónico válido para que un anfitrión pueda responderte.";
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
    notice.textContent = fill("Gracias, {name}. Hemos recibido tu consulta sobre {package} (referencia {ref}). Un anfitrión responderá a {email} en dos días laborables.", { name, package: pkg.name, ref: inquiry.id, email });
    notice.hidden = false;
    form.hidden = true;
    notice.scrollIntoView({ behavior: "smooth", block: "center" });
  });


  return el("section", { class: "inquiry", id: "inquiry" }, [
    el("h2", { text: "Enviar una consulta" }),
    summary,
    notice,
    form,
  ]);
}


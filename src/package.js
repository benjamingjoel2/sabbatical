import { getPackage, REGIONS, VIBES, ADDONS } from "./data/packages.js";
import { quote, formatPrice, fromPrice, discountRateFor, MAX_TRAVELLERS } from "./pricing.js";
import { el, loadSaved, saveButton, updateSavedBadge, vibeLabel } from "./ui.js";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
  document.title = "Package not found | Sabbatical";
  main.replaceChildren(
    el("section", { class: "wrap", style: { padding: "64px var(--gutter)" } }, [
      el("h1", { text: "We couldn't find that package." }),
      el("p", { class: "summary", text: "It may have been retired, or the link is incomplete. Here's everything currently on offer." }),
      el("a", { class: "btn btn-accent", href: "index.html#packages", text: "Browse packages" }),
    ]),
  );
}

function renderPackage(pkg) {
  document.title = `${pkg.name}, ${pkg.destination} | Sabbatical`;
  const region = REGIONS.find((r) => r.id === pkg.region)?.label ?? pkg.region;
  const saved = loadSaved();

  const hero = el("section", { class: "detail-hero", style: { "--c1": pkg.palette[0], "--c2": pkg.palette[1] } }, [
    el("div", { class: "wrap" }, [
      el("a", { class: "back", href: "index.html#packages", text: "← All packages" }),
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
          fact("Home", pkg.accommodation),
          fact("Stay length", pkg.minMonths === pkg.maxMonths ? `${pkg.minMonths} months` : `${pkg.minMonths} to ${pkg.maxMonths} months`),
          fact("From", `${formatPrice(fromPrice(pkg))} per person per month`),
          fact("Good for", pkg.vibes.map((v) => vibeLabel(VIBES, v)).join(", ")),
        ]),
      ]),
      el("section", {}, [
        el("h2", { text: "Highlights" }),
        el("ul", { class: "check-list" }, pkg.highlights.map((h) => el("li", { text: h }))),
      ]),
      el("section", {}, [
        el("h2", { text: "What's included" }),
        el("ul", { class: "check-list two-col" }, pkg.includes.map((h) => el("li", { text: h }))),
      ]),
      el("section", {}, [
        el("h2", { text: "How the stay unfolds" }),
        el("ol", { class: "timeline" }, pkg.phases.map((phase) =>
          el("li", {}, [
            el("span", { class: "when", text: phase.weeks }),
            el("h3", { text: phase.title }),
            el("p", { text: phase.text }),
          ]),
        )),
      ]),
      el("section", {}, [
        el("h2", { text: "Best time to go" }),
        el("p", { class: "summary", text: "Highlighted months are when this stay is at its best. Other months are usually available; ask your host." }),
        el("div", { class: "months", role: "list", "aria-label": "Months" }, MONTH_NAMES.map((name, i) =>
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
    const label = `${m} ${m === 1 ? "month" : "months"}${rate ? ` (${Math.round(rate * 100)}% off)` : ""}`;
    return el("option", { value: String(m), text: label });
  }));
  const defaultMonths = monthChoices.includes(3) ? 3 : monthChoices[0];
  monthsSelect.value = String(defaultMonths);

  const travellersSelect = el("select", { id: "travellers", name: "travellers" },
    Array.from({ length: MAX_TRAVELLERS }, (_, i) => i + 1).map((n) =>
      el("option", { value: String(n), text: `${n} ${n === 1 ? "traveller" : "travellers"}` }),
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

  const node = el("aside", { class: "panel", "aria-label": "Plan your stay" }, [
    el("div", { style: { display: "flex", "justify-content": "space-between", "align-items": "center", gap: "12px" } }, [
      el("div", {}, [
        el("h2", { text: "Plan your stay" }),
        el("p", { class: "from", text: `${formatPrice(pkg.pricePerMonth)} per person per month` }),
      ]),
      savedToggle,
    ]),
    el("div", { class: "field" }, [el("label", { for: "months", text: "Length of stay" }), monthsSelect]),
    el("div", { class: "field" }, [el("label", { for: "travellers", text: "Travellers" }), travellersSelect]),
    addonInputs.length
      ? el("div", { class: "field" }, [el("span", { class: "label", text: "Add-ons" }), el("div", { class: "options" }, addonInputs)])
      : null,
    quoteBox,
    el("a", { class: "btn btn-accent", href: "#inquiry", text: "Send an inquiry" }),
    el("p", { class: "panel-note", text: "No payment now. A host confirms availability within two working days." }),
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
      row("Accommodation", formatPrice(q.accommodation)),
      q.discount > 0
        ? row(`Long-stay discount (${Math.round(q.discountRate * 100)}%)`, `−${formatPrice(q.discount)}`, "discount")
        : null,
      q.addons > 0 ? row("Add-ons", formatPrice(q.addons)) : null,
      row("Total", formatPrice(q.total), "total"),
      row(
        `That's ${formatPrice(q.perPersonPerMonth)} per person per month`,
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
      el("option", { value, text: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}${best ? " · best season" : ""}` }),
    );
  }

  const notice = el("div", { class: "notice", role: "status", hidden: true });
  const summary = el("p", { class: "summary", id: "inquiry-summary" });

  const form = el("form", { id: "inquiry-form", novalidate: true }, [
    el("div", { class: "row" }, [
      el("div", { class: "field" }, [
        el("label", { for: "name", text: "Your name" }),
        el("input", { id: "name", name: "name", type: "text", required: true, autocomplete: "name" }),
      ]),
      el("div", { class: "field" }, [
        el("label", { for: "email", text: "Email" }),
        el("input", { id: "email", name: "email", type: "email", required: true, autocomplete: "email" }),
      ]),
    ]),
    el("div", { class: "field" }, [
      el("label", { for: "start", text: "Preferred arrival month" }),
      el("select", { id: "start", name: "start" }, startOptions),
    ]),
    el("div", { class: "field" }, [
      el("label", { for: "message", text: "Anything we should know?" }),
      el("textarea", { id: "message", name: "message", placeholder: "Work hours, kids, pets, accessibility needs, dates that don't move…" }),
    ]),
    el("p", { class: "error", id: "inquiry-error", "aria-live": "polite" }),
    el("button", { type: "submit", class: "btn btn-accent", text: "Send inquiry" }),
  ]);

  function updateSummary() {
    const sel = getSelection();
    const q = quote(pkg, sel);
    const addonText = sel.addons.length ? ` with ${sel.addons.map((a) => a.label.toLowerCase()).join(", ")}` : "";
    summary.textContent = `${sel.months} ${sel.months === 1 ? "month" : "months"} in ${pkg.destination} for ${sel.travellers} ${sel.travellers === 1 ? "traveller" : "travellers"}${addonText}: ${formatPrice(q.total)} in total.`;
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
      error.textContent = "Please tell us your name.";
      form.name.focus();
      return;
    }
    if (!email || !form.email.checkValidity()) {
      error.textContent = "Please enter a valid email address so a host can reply.";
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
    notice.textContent = `Thanks, ${name}. Your inquiry for ${pkg.name} has been received (reference ${inquiry.id}). A host will reply to ${email} within two working days.`;
    notice.hidden = false;
    form.hidden = true;
    notice.scrollIntoView({ behavior: "smooth", block: "center" });
  });


  return el("section", { class: "inquiry", id: "inquiry" }, [
    el("h2", { text: "Send an inquiry" }),
    summary,
    notice,
    form,
  ]);
}


/** Small DOM helpers shared by both pages. */

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "style" && typeof value === "object") {
      for (const [prop, v] of Object.entries(value)) node.style.setProperty(prop, v);
    } else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const SAVED_KEY = "sabbatical.saved";

export function loadSaved() {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function storeSaved(set) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify([...set]));
  } catch {
    /* storage unavailable: saving is a convenience only */
  }
}

export function toggleSaved(id) {
  const saved = loadSaved();
  if (saved.has(id)) saved.delete(id);
  else saved.add(id);
  storeSaved(saved);
  return saved;
}

export function updateSavedBadge() {
  const badge = document.getElementById("saved-count");
  if (!badge) return;
  const count = loadSaved().size;
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

export const heartIcon =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2 0 3.3 1.1 4.1 2.3L12 9l1.5-1.7C14.3 6.1 15.6 5 17.6 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z"/></svg>';

export function saveButton(id, saved, onChange) {
  const pressed = saved.has(id);
  return el("button", {
    type: "button",
    class: "save",
    "aria-pressed": pressed ? "true" : "false",
    "aria-label": pressed ? "Remove from saved" : "Save this package",
    title: pressed ? "Remove from saved" : "Save this package",
    html: heartIcon,
    onClick: (event) => {
      event.preventDefault();
      event.stopPropagation();
      const next = toggleSaved(id);
      const nowPressed = next.has(id);
      event.currentTarget.setAttribute("aria-pressed", nowPressed ? "true" : "false");
      event.currentTarget.setAttribute("aria-label", nowPressed ? "Remove from saved" : "Save this package");
      updateSavedBadge();
      onChange?.(next);
    },
  });
}

export function vibeLabel(vibes, id) {
  return vibes.find((v) => v.id === id)?.label ?? id;
}

/** Fills {name} placeholders, so each sentence is one translatable string. */
export function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}

// Puts the French, German and Spanish legal texts into the translated legal pages.
// Runs after scripts/i18n.mjs (`node scripts/i18n.mjs build && node scripts/legal-i18n.mjs`). The English pages mark the legal text with
// <!--legal:start--> ... <!--legal:end--> inside an <!--i18n:off--> region, so the
// dictionary translator leaves it alone; this script swaps in the text written
// for each language (i18n/legal.json, with language-prefixed links already in place).
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, '.');
const legal = JSON.parse(fs.readFileSync(path.join(root, 'i18n/legal.json'), 'utf8'));
const PAGES = { privacy: 'privacy.html', terms: 'terms.html', cookies: 'cookies.html' };
const WITH_UPDATED = true;
const body = (d) => (WITH_UPDATED ? `<p class="legal__date">${d.updated}</p>\n` : '') + d.html;

let n = 0;
for (const lang of Object.keys(legal)) {
  for (const [key, rel] of Object.entries(PAGES)) {
    const file = path.join(dist, lang === 'en' ? '' : lang, rel);
    if (!fs.existsSync(file)) throw new Error(`legal-i18n: missing ${file}`);
    const html = fs.readFileSync(file, 'utf8');
    const re = /<!--legal:start-->[\s\S]*?<!--legal:end-->/;
    if (!re.test(html)) throw new Error(`legal-i18n: no legal markers in ${file}`);
    fs.writeFileSync(file, html.replace(re, () => `<!--legal:start-->${body(legal[lang][key])}<!--legal:end-->`));
    n++;
  }
}
console.log(`legal-i18n: wrote ${n} legal pages`);

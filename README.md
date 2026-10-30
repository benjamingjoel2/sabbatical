# Sabbatical

Long-stay travel packages for people taking one to six months away.

Sabbatical is a small, dependency-free web app: a catalog of nine long-stay
packages, each with a furnished home, a local host and a fixed set of
inclusions. Visitors can filter the catalog, save packages, price a stay with
a live calculator and send an inquiry.

## Running it

The site is plain HTML, CSS and ES modules. Because it uses modules it needs
to be served over HTTP rather than opened from the filesystem.

```sh
npm start        # serves on http://127.0.0.1:4173
npm test         # runs the pricing and catalog tests with node:test
```

Any static file server works; there is nothing to build and no `npm install`.
Node 20 or newer is needed for the tests.

## What's in it

| Path | Purpose |
| --- | --- |
| `index.html`, `src/app.js` | Landing page: hero, how it works, and the catalog with search, region, stay length, budget, vibe and sort filters, plus a saved-packages view. |
| `package.html`, `src/package.js` | Package detail: highlights, inclusions, itinerary phases, best months, a booking panel with a live quote and an inquiry form. |
| `src/data/packages.js` | The catalog: packages, regions, vibes, stay lengths and add-ons. Edit this to add or change packages. |
| `src/pricing.js` | Pure pricing functions shared by the browser and the tests. |
| `src/ui.js` | Small DOM helper and localStorage helpers for saved packages. |
| `src/styles.css` | Shared styles with light and dark themes. |
| `privacy.html`, `terms.html`, `cookies.html` | Privacy policy, booking terms and cookie policy (complete; have a lawyer review them before launch). |
| `src/fonts/` | Self-hosted Fraunces and Inter (SIL OFL). |
| `test/pricing.test.js` | Unit tests for pricing rules and catalog integrity. |

## Pricing rules

Prices are per person per month in EUR.

- **Long-stay discount** on accommodation: 5% from two months, 10% from three
  months, 18% from six months.
- **Extra travellers** pay 35% of the base monthly price each, sharing the
  same home.
- **Add-ons** (coworking, insurance, language lessons, a car or scooter) are
  priced per traveller per month and are not discounted. A package that
  already includes an add-on does not offer it again.
- Each package has its own minimum and maximum stay length.

## Data and persistence

There is no backend. Saved packages and submitted inquiries are stored in the
visitor's browser with localStorage under the `sabbatical.saved` and
`sabbatical.inquiries` keys. An inquiry shows a confirmation with a reference
code; wiring that to a real inbox or CRM is the natural next step.

## Adding a package

Add an object to `PACKAGES` in `src/data/packages.js`. The tests check that
every package has a unique id, a positive price, a valid stay range, at least
one vibe, a two-colour palette, three or more itinerary phases and valid best
months. Set `includedAddons` to the ids of any add-ons the base price already
covers.

## Contact and business details

Email: `sabbatical@tourground.com`. Business address (owner-approved coworking arrangement): Second Home Lisboa, Mercado da Ribeira, Avenida 24 de Julho 49, 1200-479 Lisboa, Portugal. Both appear in the footer, the legal pages and the JSON-LD on the home page. By owner decision the site shows no phone, WhatsApp, social links, licence numbers or testimonials.

## Before launch

- Wire the inquiry form to a real inbox or CRM (it only stores inquiries in the visitor's browser today).
- Have a lawyer review the privacy policy, booking terms and cookie policy.
- Confirm the Second Home Lisboa street number (OpenStreetMap gives 49; some listings use 50).

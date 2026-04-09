# shopify-ga4-gtm-analytics

Full analytics tracking layer on a Shopify Dawn theme fork: GA4 event tracking via GTM dataLayer, Facebook Pixel browser-side events with server-side CAPI dual-firing for deduplication, and Product JSON-LD structured data for SEO and AI discoverability.

---

## What's included

| Feature | File(s) | Description |
|---------|---------|-------------|
| **GTM initialization** | `snippets/gtm-head.liquid`, `snippets/gtm-body.liquid` | Head + noscript GTM snippets wired into theme.liquid |
| **Facebook Pixel base** | `snippets/facebook-pixel.liquid` | Pixel init + PageView on every page |
| **view_item** | `snippets/datalayer-product.liquid` | Server-rendered dataLayer push — fires before JS hydrates |
| **purchase** | `snippets/datalayer-purchase.liquid` | One-time purchase event guarded by `first_time_accessed` |
| **add_to_cart / remove / view_cart / begin_checkout / select_item** | `assets/analytics.js` | Client-side events via DOM event listeners on Shopify cart API events |
| **CAPI dual-firing** | `assets/capi.js` | Browser Pixel + server-side CAPI share same `event_id` for deduplication |
| **Product JSON-LD** | `snippets/product-jsonld.liquid` | Per-variant `Offer` schema, aggregate rating, brand, image array |
| **Theme settings UI** | `config/settings_schema.json` | GTM container ID + Pixel ID configurable from Shopify Customizer |
| **llms.txt** | `llms.txt` | AI discoverability metadata |

---

## Event coverage

| GA4 Event | Facebook Pixel Event | Trigger |
|-----------|---------------------|---------|
| `view_item` | `ViewContent` (via CAPI) | Product page load |
| `add_to_cart` | `AddToCart` (Pixel + CAPI) | ATC button |
| `remove_from_cart` | — | Cart remove |
| `view_cart` | — | Cart drawer open / `/cart` |
| `begin_checkout` | `InitiateCheckout` | Checkout button |
| `purchase` | `Purchase` (via CAPI) | Order status page |
| `select_item` | — | Product card click |

---

## Setup

```bash
# 1. Clone and install Shopify CLI
npm install

# 2. Push theme to your dev store
shopify theme push --store your-store.myshopify.com

# 3. In Shopify Customizer → Theme settings → Analytics:
#    - Set GTM Container ID (GTM-XXXXXXX)
#    - Set Facebook Pixel ID

# 4. Local development
shopify theme dev --store your-store.myshopify.com
```

### GTM container

Import the container export from `config/gtm-container.json` into your GTM workspace
to get all tags, triggers, and variables pre-configured for GA4.

See [docs/gtm-setup.md](docs/gtm-setup.md) for full GTM architecture and debugging guide.

### Facebook CAPI

The server-side CAPI endpoint requires a separate worker deployment.
See [docs/capi-setup.md](docs/capi-setup.md) for architecture and setup.

---

## Debugging

### GTM Preview mode
Open GTM → Preview → enter your store URL. Walk product → ATC → checkout and
verify each event fires with the correct ecommerce payload.

### GA4 DebugView
Install the GA4 Debugger Chrome extension, then navigate your store.
Events appear in real time at GA4 Admin → DebugView.

### Console debugging
```js
// Enable verbose logging for analytics.js and capi.js
localStorage.setItem('analytics_debug', '1');
```

### Cross-browser
Test in Chrome, Firefox, and Safari (Private mode to avoid cached state).
Safari ITP blocks some third-party cookies — CAPI is the primary signal in Safari.

---

## Tech stack

- Shopify Dawn (theme base)
- Shopify Liquid
- Vanilla JavaScript (ES5-compatible for broad browser support)
- Google Tag Manager
- GA4
- Facebook Pixel + Conversions API
- JSON-LD / schema.org
- Shopify CLI 3.x

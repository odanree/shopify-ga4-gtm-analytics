# GTM Setup Guide

## Container structure

This implementation uses a single GTM container with the following tag/trigger architecture.

### Tags

| Tag name | Type | Trigger |
|----------|------|---------|
| GA4 Configuration | GA4 Configuration | All pages |
| GA4 - view_item | GA4 Event | Custom event: `view_item` |
| GA4 - add_to_cart | GA4 Event | Custom event: `add_to_cart` |
| GA4 - remove_from_cart | GA4 Event | Custom event: `remove_from_cart` |
| GA4 - view_cart | GA4 Event | Custom event: `view_cart` |
| GA4 - begin_checkout | GA4 Event | Custom event: `begin_checkout` |
| GA4 - purchase | GA4 Event | Custom event: `purchase` |
| GA4 - select_item | GA4 Event | Custom event: `select_item` |

### Variables

All GA4 event tags read ecommerce data from the `ecommerce` dataLayer variable.

| Variable name | Type | Value |
|---------------|------|-------|
| `DL - ecommerce.items` | Data Layer Variable | `ecommerce.items` |
| `DL - ecommerce.value` | Data Layer Variable | `ecommerce.value` |
| `DL - ecommerce.currency` | Data Layer Variable | `ecommerce.currency` |
| `DL - ecommerce.transaction_id` | Data Layer Variable | `ecommerce.transaction_id` |

### GA4 Configuration tag

Set the Measurement ID in the GA4 Configuration tag. Do not hardcode it in the theme.
Use a GTM constant variable `GA4 Measurement ID` pointing to `G-XXXXXXXXXX`.

---

## Enabling enhanced ecommerce in GA4

1. GA4 Admin → Data Streams → your stream → Enhanced measurement
2. Toggle **off** the built-in ecommerce events (the theme fires them manually)
3. This prevents double-counting from Shopify's native GA4 integration

---

## Debugging

### GTM Preview mode

1. Open GTM → Preview
2. Enter your store URL (use `https://`, not the ngrok tunnel if using CLI)
3. Walk through product → ATC → checkout → confirm events fire in the correct order

### GA4 DebugView

1. Install the [GA4 Debugger Chrome extension](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)
2. GA4 Admin → DebugView
3. Navigate your store — events appear in real time with parameter breakdowns
4. Verify `item_id`, `item_name`, `currency`, `value` are populated on every ecommerce event

### Browser console debugging

```js
// Enable verbose logging for analytics.js and capi.js
localStorage.setItem('analytics_debug', '1');
// Disable
localStorage.removeItem('analytics_debug');
```

### Common issues

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `view_item` fires twice | GA4 enhanced measurement not disabled | Turn off built-in ecommerce in GA4 data stream settings |
| `purchase` fires on refresh | Missing `first_time_accessed` guard | Verify `datalayer-purchase.liquid` wraps the push in `{% if first_time_accessed %}` |
| `add_to_cart` missing item_id | Variant SKU not set in Shopify admin | Fallback to `variant_id` is already in place in `analytics.js` |
| Facebook Pixel events duplicated | CAPI and Pixel both fire without dedup | Ensure `event_id` is shared between `fbq('track', ..., { eventID })` and the CAPI payload |

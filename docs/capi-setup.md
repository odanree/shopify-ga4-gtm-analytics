# Facebook Conversions API (CAPI) Setup

## Architecture

```
Browser                          Server (Shopify App Proxy → Worker)
──────────────────────────────   ────────────────────────────────────
fbq('track', 'AddToCart', data,  POST /apps/capi/events
  { eventID: 'evt_abc123' })     {
                                   event_name: 'AddToCart',
                                   event_id: 'evt_abc123',   ← same ID
                                   custom_data: { ... },
                                   user_data: {              ← hashed server-side
                                     em: sha256(email),
                                     ph: sha256(phone),
                                     client_ip_address: req.ip,
                                     client_user_agent: req.ua
                                   }
                                 }
```

Facebook deduplicates events that share `event_id` — only one conversion
is counted regardless of which signal arrives first.

## Worker endpoint

The `/apps/capi/events` endpoint is a Shopify App Proxy pointing to a
serverless worker that:

1. Reads the Shopify customer session to resolve hashed PII
2. Appends `client_ip_address` and `client_user_agent` from the request
3. Forwards the payload to the Facebook Graph API:
   `POST https://graph.facebook.com/v19.0/{PIXEL_ID}/events`

### Required environment variables

```
FB_PIXEL_ID=your_pixel_id
FB_ACCESS_TOKEN=your_system_user_access_token
SHOPIFY_SHOP=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxx
```

## Testing CAPI events

Use the Facebook Events Manager Test Events tool:

1. Events Manager → your Pixel → Test Events
2. Set the `test_event_code` query param on your CAPI calls
3. Walk through ATC and checkout flows
4. Verify deduplication: each event should appear once in Test Events,
   not twice (once from Pixel, once from CAPI)

## Hashing PII server-side

Never hash or send raw PII from the browser. The worker handles this:

```js
import crypto from 'crypto';

function hashSha256(value) {
  return crypto
    .createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex');
}

const userData = {
  em: customer.email ? hashSha256(customer.email) : undefined,
  ph: customer.phone ? hashSha256(customer.phone) : undefined,
  client_ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
  client_user_agent: req.headers['user-agent'],
};
```

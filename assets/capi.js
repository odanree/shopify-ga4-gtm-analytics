/**
 * capi.js — Facebook Conversions API (CAPI) client-side mirror helper
 *
 * Sends server-side CAPI events in parallel with browser Pixel events
 * to maximize signal deduplication. The server-side endpoint lives at
 * /apps/capi (a Shopify App Proxy pointing to the worker function).
 *
 * Deduplication:
 *   Both browser Pixel and CAPI calls share the same `event_id`.
 *   Facebook uses this to deduplicate when both signals arrive.
 *
 * User data hashing:
 *   PII (email, phone) is hashed SHA-256 server-side, never in the browser.
 *   This module sends only non-PII signals. The server reads the Shopify
 *   customer session to append hashed PII before calling the Graph API.
 *
 * See: https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events
 */

(function () {
  'use strict';

  const CAPI_ENDPOINT = '/apps/capi/events';
  const DEBUG = localStorage.getItem('analytics_debug') === '1';

  function log(...args) {
    if (DEBUG) console.log('[capi]', ...args);
  }

  /**
   * generateEventId — creates a stable ID shared between browser Pixel and CAPI
   * so Facebook can deduplicate the dual-fired event.
   */
  function generateEventId(eventName) {
    return eventName + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  /**
   * sendCapiEvent — posts an event to the server-side proxy.
   * @param {string} eventName  Facebook standard event name (e.g. 'AddToCart')
   * @param {object} eventData  Custom data payload
   * @param {string} eventId    Shared deduplication ID
   */
  function sendCapiEvent(eventName, eventData, eventId) {
    const payload = {
      event_name: eventName,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: window.location.href,
      action_source: 'website',
      custom_data: eventData,
      // user_data is appended server-side (hashed email, phone, IP, user-agent)
    };

    log('sendCapiEvent', payload);

    fetch(CAPI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true, // ensures request completes even if page navigates away
    }).catch(function (err) {
      log('CAPI send error', err);
    });
  }

  // ---------------------------------------------------------------------------
  // Dual-fire: hook into the same cart:item-added event as analytics.js
  // Both calls share a common event_id for deduplication.
  // ---------------------------------------------------------------------------

  document.addEventListener('cart:item-added', function (e) {
    const item = e.detail && e.detail.item;
    if (!item) return;

    const eventId = generateEventId('AddToCart');

    // Mirror the browser Pixel call with the same event_id
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'AddToCart', {
        content_ids: [String(item.variant_id)],
        content_type: 'product',
        value: (item.price / 100).toFixed(2),
        currency: window.Shopify && window.Shopify.currency && window.Shopify.currency.active || 'USD',
      }, { eventID: eventId });
    }

    sendCapiEvent('AddToCart', {
      content_ids: [String(item.variant_id)],
      content_type: 'product',
      value: (item.price / 100).toFixed(2),
      currency: window.Shopify && window.Shopify.currency && window.Shopify.currency.active || 'USD',
    }, eventId);
  });

  // ---------------------------------------------------------------------------
  // ViewContent — fires server-side on product pages
  // The server-rendered datalayer-product.liquid already sets the Pixel event;
  // this sends the CAPI mirror with the same event_id stored in a meta tag.
  // ---------------------------------------------------------------------------

  const viewEventIdMeta = document.querySelector('meta[name="fb-view-event-id"]');
  if (viewEventIdMeta) {
    const eventId = viewEventIdMeta.content;
    const productId = document.querySelector('meta[name="product-variant-id"]');

    sendCapiEvent('ViewContent', {
      content_ids: productId ? [productId.content] : [],
      content_type: 'product',
    }, eventId);
  }

  log('capi.js initialized');
})();

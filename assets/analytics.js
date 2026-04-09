/**
 * analytics.js
 *
 * Handles client-side GA4 / GTM dataLayer events and Facebook Pixel
 * browser-side firing. CAPI (server-side) events are mirrored separately
 * via the /apps/capi proxy — see docs/capi-setup.md.
 *
 * Events covered:
 *   - add_to_cart       (ATC button, quick-add)
 *   - remove_from_cart  (cart remove link)
 *   - view_cart         (cart drawer open / cart page load)
 *   - begin_checkout    (checkout button)
 *   - select_item       (collection product click)
 *
 * Debugging:
 *   Set localStorage.setItem('analytics_debug', '1') in DevTools console
 *   to enable verbose console logging without affecting production data.
 */

(function () {
  'use strict';

  const DEBUG = localStorage.getItem('analytics_debug') === '1';

  function log(...args) {
    if (DEBUG) console.log('[analytics]', ...args);
  }

  function push(event) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ecommerce: null }); // prevent bleed from previous event
    window.dataLayer.push(event);
    log('dataLayer.push', event);
  }

  function fbTrack(event, data) {
    if (typeof window.fbq === 'function') {
      window.fbq('track', event, data);
      log('fbq.track', event, data);
    }
  }

  // ---------------------------------------------------------------------------
  // add_to_cart
  // Fired when the ATC form submits successfully via the Shopify AJAX cart API.
  // ---------------------------------------------------------------------------

  document.addEventListener('cart:item-added', function (e) {
    const item = e.detail && e.detail.item;
    if (!item) return;

    const value = (item.price / 100).toFixed(2);

    push({
      event: 'add_to_cart',
      ecommerce: {
        currency: window.Shopify && window.Shopify.currency && window.Shopify.currency.active || 'USD',
        value: parseFloat(value),
        items: [
          {
            item_id: item.sku || String(item.variant_id),
            item_name: item.product_title,
            item_brand: item.vendor,
            item_category: item.product_type,
            item_variant: item.variant_title,
            price: parseFloat(value),
            quantity: item.quantity,
          },
        ],
      },
    });

    fbTrack('AddToCart', {
      content_ids: [String(item.variant_id)],
      content_name: item.product_title,
      content_type: 'product',
      value: parseFloat(value),
      currency: window.Shopify && window.Shopify.currency && window.Shopify.currency.active || 'USD',
    });
  });

  // ---------------------------------------------------------------------------
  // remove_from_cart
  // Dawn fires a custom event when the cart API removes an item.
  // ---------------------------------------------------------------------------

  document.addEventListener('cart:item-removed', function (e) {
    const item = e.detail && e.detail.item;
    if (!item) return;

    push({
      event: 'remove_from_cart',
      ecommerce: {
        currency: window.Shopify && window.Shopify.currency && window.Shopify.currency.active || 'USD',
        items: [
          {
            item_id: item.sku || String(item.variant_id),
            item_name: item.product_title,
            item_variant: item.variant_title,
            price: (item.price / 100).toFixed(2),
            quantity: item.quantity,
          },
        ],
      },
    });
  });

  // ---------------------------------------------------------------------------
  // view_cart
  // Fires when the cart drawer opens or the /cart page loads.
  // ---------------------------------------------------------------------------

  function pushViewCart(cartData) {
    if (!cartData || !cartData.items) return;

    push({
      event: 'view_cart',
      ecommerce: {
        currency: window.Shopify && window.Shopify.currency && window.Shopify.currency.active || 'USD',
        value: (cartData.total_price / 100).toFixed(2),
        items: cartData.items.map(function (item) {
          return {
            item_id: item.sku || String(item.variant_id),
            item_name: item.product_title,
            item_variant: item.variant_title,
            price: (item.price / 100).toFixed(2),
            quantity: item.quantity,
          };
        }),
      },
    });
  }

  document.addEventListener('cart:open', function (e) {
    const cart = e.detail && e.detail.cart;
    if (cart) {
      pushViewCart(cart);
    } else {
      fetch('/cart.js')
        .then(function (r) { return r.json(); })
        .then(pushViewCart)
        .catch(function (err) { log('cart fetch error', err); });
    }
  });

  // Cart page — fire once on load
  if (window.location.pathname === '/cart') {
    fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(pushViewCart)
      .catch(function (err) { log('cart fetch error', err); });
  }

  // ---------------------------------------------------------------------------
  // begin_checkout
  // ---------------------------------------------------------------------------

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[name="checkout"], [data-checkout-btn]');
    if (!btn) return;

    fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        push({
          event: 'begin_checkout',
          ecommerce: {
            currency: window.Shopify && window.Shopify.currency && window.Shopify.currency.active || 'USD',
            value: (cart.total_price / 100).toFixed(2),
            items: cart.items.map(function (item) {
              return {
                item_id: item.sku || String(item.variant_id),
                item_name: item.product_title,
                item_variant: item.variant_title,
                price: (item.price / 100).toFixed(2),
                quantity: item.quantity,
              };
            }),
          },
        });

        fbTrack('InitiateCheckout', {
          value: (cart.total_price / 100).toFixed(2),
          currency: window.Shopify && window.Shopify.currency && window.Shopify.currency.active || 'USD',
          num_items: cart.item_count,
        });
      })
      .catch(function (err) { log('begin_checkout cart fetch error', err); });
  });

  // ---------------------------------------------------------------------------
  // select_item — collection grid product click
  // ---------------------------------------------------------------------------

  document.addEventListener('click', function (e) {
    const card = e.target.closest('[data-product-card]');
    if (!card) return;

    const index = Array.from(
      document.querySelectorAll('[data-product-card]')
    ).indexOf(card);

    push({
      event: 'select_item',
      ecommerce: {
        item_list_name: document.title,
        items: [
          {
            item_id: card.dataset.variantId || card.dataset.productId,
            item_name: card.dataset.productTitle,
            item_brand: card.dataset.vendor,
            item_category: card.dataset.productType,
            price: parseFloat(card.dataset.price || 0),
            index: index,
          },
        ],
      },
    });
  });

  log('analytics.js initialized');
})();

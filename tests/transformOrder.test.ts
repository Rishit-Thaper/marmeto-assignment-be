import assert from 'node:assert/strict';
import test from 'node:test';
import samplePayload from '../examples/samplePayload.json';
import { transformOrder } from '../src/transformOrder';

test('transforms the sample order and folds a component into its parent', () => {
  assert.deepEqual(transformOrder(samplePayload), {
    order_id: '5612345678901',
    customer_email: 'asha.v@example.com',
    lines: [
      { sku: 'TEE-BLK-M', qty: 2, net_paise: 107820, bundled_skus: [] },
      { sku: 'HAMPER-DIWALI', qty: 1, net_paise: 131780, bundled_skus: ['GIFTBOX-STD'] },
      { sku: null, qty: 3, net_paise: 30, bundled_skus: [] },
      { sku: 'SOCK-3PK', qty: 3, net_paise: 59855, bundled_skus: [] },
    ],
    total_discount_paise: 25115,
    shipping_total_paise: 7900,
    gift_note: 'Happy Diwali, Maa!',
    warnings: [
      'line 14004 discounts missing; treated as none',
      'shipping line 3 price missing; used ₹0',
    ],
  });
});

test('is defensive about missing data and reports its assumptions', () => {
  const result = transformOrder(null);
  assert.equal(result.order_id, '');
  assert.equal(result.customer_email, null);
  assert.deepEqual(result.lines, []);
  assert.equal(result.total_discount_paise, 0);
  assert.equal(result.shipping_total_paise, 0);
  assert.equal(result.gift_note, null);
  assert.ok(result.warnings.includes('line_items missing; used an empty list'));
  assert.ok(result.warnings.includes('order id missing; used an empty string'));
});

test('keeps an orphan bundle component so its amount is not silently lost', () => {
  const result = transformOrder({
    id: 1,
    total_discounts: '0.00',
    line_items: [{
      id: 2,
      sku: 'PART',
      quantity: 1,
      price: '10.00',
      properties: [{ name: '_bundle_parent', value: 'does-not-exist' }],
      discount_allocations: [],
    }],
    shipping_lines: [],
  });

  assert.deepEqual(result.lines, [
    { sku: 'PART', qty: 1, net_paise: 1000, bundled_skus: [] },
  ]);
  assert.ok(result.warnings.includes('bundle parent does-not-exist not found; kept component as a line'));
});

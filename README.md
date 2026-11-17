# Shopify Order Transformer

Run `npm install`, then `npm test` and `npm run typecheck` (Node.js 18+).

`transformOrder(payload)` uses integer paise internally rather than floating-point rupees. It calculates discounts from the line allocations, then checks that calculation against Shopify's order-level discount.

Bundle components are resolved after every line is read, so their parent can appear either before or after them. A missing parent is retained as a normal line with a warning; this avoids silently losing merchandise value.

The parser is deliberately defensive: nullable or malformed inputs fall back to safe values and leave a short explanation in `warnings`. Types are explicit at the public boundary (`unknown` input and `TransformedOrder` output), while email and gift-note fields are normalized before returning.

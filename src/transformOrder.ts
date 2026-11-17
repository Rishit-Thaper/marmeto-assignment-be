import { bundleParentId, customerEmail, discountAllocations, giftNote, isObject, nonEmptyString, toPaise, toQuantity } from "./utils/helperFunctions";
import { CalculatedLine, TransformedOrder, Warn } from "./utils/types";

/**
 * Convert a Shopify order webhook into the smaller accounting-friendly shape.
 * All currency arithmetic stays in paise, avoiding floating point rounding.
 */
export function transformOrder(payload: unknown): TransformedOrder {
  const order = isObject(payload) ? payload : {};
  const warnings: string[] = [];
  const warn: Warn = (message) => warnings.push(message);

  const lineItems = Array.isArray(order.line_items)
    ? order.line_items
    : (warn('line_items missing; used an empty list'), []);

  const linesById = new Map<string, CalculatedLine>();
  const calculatedLines = lineItems.map((line, index): CalculatedLine => {
    const item = isObject(line) ? line : {};
    if (!isObject(line)) warn(`line ${index + 1} was invalid; used empty values`);

    const id = item.id == null ? null : String(item.id);
    if (id === null) warn(`line ${index + 1} id missing`);

    const lineLabel = id ?? String(index + 1);
    const qty = toQuantity(item.quantity, `line ${lineLabel} quantity`, warn);
    const pricePaise = toPaise(item.price, `line ${lineLabel} price`, warn);
    const allocations = discountAllocations(item.discount_allocations, lineLabel, warn);
    const discountPaise = allocations.reduce<number>((sum, allocation, allocationIndex) => {
      if (!isObject(allocation)) {
        warn(`line ${lineLabel} discount ${allocationIndex + 1} invalid; used ₹0`);
      }
      const amount = isObject(allocation) ? allocation.amount : null;
      return sum + toPaise(amount, `line ${lineLabel} discount ${allocationIndex + 1}`, warn);
    }, 0);

    const calculated: CalculatedLine = {
      id,
      sku: nonEmptyString(item.sku),
      qty,
      netPaise: pricePaise * qty - discountPaise,
      discountPaise,
      parentId: bundleParentId(item.properties, lineLabel, warn),
      bundledSkus: [],
    };

    // Keep the first id if malformed data contains duplicates.
    if (id !== null && !linesById.has(id)) linesById.set(id, calculated);
    else if (id !== null) warn(`duplicate line id ${id}; bundle matching uses the first line`);

    return calculated;
  });

  const outputLines: CalculatedLine[] = [];
  for (const line of calculatedLines) {
    if (line.parentId === null) {
      outputLines.push(line);
      continue;
    }

    const parent = linesById.get(line.parentId);
    if (!parent || parent === line) {
      // Never drop merchandise value merely because its parent is malformed.
      warn(`bundle parent ${line.parentId} not found; kept component as a line`);
      outputLines.push(line);
      continue;
    }

    parent.netPaise += line.netPaise;
    if (line.sku === null) warn(`bundle component ${line.id ?? 'unknown'} sku missing`);
    else parent.bundledSkus.push(line.sku);
  }

  const totalDiscountPaise = calculatedLines.reduce((sum, line) => sum + line.discountPaise, 0);
  const declaredDiscountPaise = toPaise(order.total_discounts, 'total_discounts', warn);
  if (declaredDiscountPaise !== totalDiscountPaise) {
    warn('line discounts do not match total_discounts');
  }

  const shippingLines = Array.isArray(order.shipping_lines)
    ? order.shipping_lines
    : (warn('shipping_lines missing; used an empty list'), []);
  const shippingTotalPaise = shippingLines.reduce((sum, shippingLine, index) => {
    const shipping = isObject(shippingLine) ? shippingLine : {};
    if (!isObject(shippingLine)) warn(`shipping line ${index + 1} invalid; used ₹0`);
    const useDiscountedPrice = shipping.discounted_price != null;
    return sum + toPaise(
      useDiscountedPrice ? shipping.discounted_price : shipping.price,
      `shipping line ${index + 1} ${useDiscountedPrice ? 'discounted_price' : 'price'}`,
      warn,
    );
  }, 0);

  return {
    order_id: order.id == null
      ? (warn('order id missing; used an empty string'), '')
      : String(order.id),
    customer_email: customerEmail(order),
    lines: outputLines.map((line) => ({
      sku: line.sku,
      qty: line.qty,
      net_paise: line.netPaise,
      bundled_skus: line.bundledSkus,
    })),
    total_discount_paise: totalDiscountPaise,
    shipping_total_paise: shippingTotalPaise,
    gift_note: giftNote(order.note_attributes, warn),
    warnings,
  };
}


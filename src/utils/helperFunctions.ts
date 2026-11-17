import { JsonObject, Warn } from "./types";

export function discountAllocations(value: unknown, lineId: string, warn: Warn): unknown[] {
    if (Array.isArray(value)) return value;
    if (value == null) warn(`line ${lineId} discounts missing; treated as none`);
    else warn(`line ${lineId} discounts invalid; treated as none`);
    return [];
}

export function toPaise(value: unknown, label: string, warn: Warn): number {
    if (value === null || value === undefined || String(value).trim() === '') {
        warn(`${label} missing; used ₹0`);
        return 0;
    }

    const match = String(value).trim().match(/^(-?)(\d+)(?:\.(\d+))?$/);
    if (!match) {
        warn(`${label} invalid; used ₹0`);
        return 0;
    }

    const [, sign, whole, fraction = ''] = match;
    let paise = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
    if (!Number.isSafeInteger(paise)) {
        warn(`${label} is too large; used ₹0`);
        return 0;
    }
    if (fraction.length > 2) warn(`${label} had extra decimals; truncated to paise`);
    if (sign === '-') paise *= -1;
    return paise;
}

export function toQuantity(value: unknown, label: string, warn: Warn): number {
    if (value === null || value === undefined || String(value).trim() === '') {
        warn(`${label} missing; used 0`);
        return 0;
    }
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 0) {
        warn(`${label} invalid; used 0`);
        return 0;
    }
    return quantity;
}

export function bundleParentId(properties: unknown, lineId: string, warn: Warn): string | null {
    if (properties == null) return null;
    if (!Array.isArray(properties)) {
        warn(`line ${lineId} properties invalid; ignored`);
        return null;
    }
    const parent = properties.find((property) => (
        isObject(property) && String(property.name ?? '').trim() === '_bundle_parent'
    ));
    if (!isObject(parent)) return null;

    const parentId = nonEmptyString(parent.value);
    if (parentId === null) warn(`line ${lineId} bundle parent missing; kept as a line`);
    return parentId;
}

export function customerEmail(order: JsonObject): string | null {
    const customer = isObject(order.customer) ? order.customer : {};
    for (const value of [customer.email, order.email, order.contact_email]) {
        const email = nonEmptyString(value);
        if (email !== null) return email.toLowerCase();
    }
    return null;
}

export function giftNote(attributes: unknown, warn: Warn): string | null {
    if (attributes == null) return null;
    if (!Array.isArray(attributes)) {
        warn('note_attributes invalid; gift note ignored');
        return null;
    }
    const attribute = attributes.find((item) => (
        isObject(item) && String(item.name ?? '').trim().toLowerCase() === 'gift_note'
    ));
    return isObject(attribute) ? nonEmptyString(attribute.value) : null;
}

export function nonEmptyString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const result = String(value).trim();
    return result === '' ? null : result;
}

export function isObject(value: unknown): value is JsonObject {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

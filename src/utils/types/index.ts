export type TransformedLine = {
    sku: string | null;
    qty: number;
    net_paise: number;
    bundled_skus: string[];
};

export type TransformedOrder = {
    order_id: string;
    customer_email: string | null;
    lines: TransformedLine[];
    total_discount_paise: number;
    shipping_total_paise: number;
    gift_note: string | null;
    warnings: string[];
};

export type JsonObject = Record<string, unknown>;
export type Warn = (message: string) => void;

export type CalculatedLine = {
    id: string | null;
    sku: string | null;
    qty: number;
    netPaise: number;
    discountPaise: number;
    parentId: string | null;
    bundledSkus: string[];
};

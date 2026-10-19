type PriceSource = {
  price?: number | string | null;
  sale_price?: number | string | null;
  salePrice?: number | string | null;
};

export function effectivePrice(item: PriceSource | null | undefined): number {
  const price = Number(item?.price);
  if (!Number.isFinite(price) || price <= 0) throw new Error("This item has no valid price.");
  const rawSale = item?.sale_price ?? item?.salePrice;
  const sale = rawSale == null || rawSale === "" ? NaN : Number(rawSale);
  const effective = Number.isFinite(sale) && sale > 0 && sale < price ? sale : price;
  const rounded = Math.round((effective + Number.EPSILON) * 100) / 100;
  if (rounded <= 0) throw new Error("This item has no valid price.");
  return rounded;
}

export function cartTotal(items: { quantity: number; furniture: PriceSource | null }[]): number {
  const cents = items.reduce((sum, item) => {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new Error("Invalid item quantity.");
    return sum + Math.round(effectivePrice(item.furniture) * 100) * item.quantity;
  }, 0);
  return cents / 100;
}

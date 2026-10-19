type DeliveryInput = { fullName?: unknown; mobile?: unknown; city?: unknown; address?: unknown; notes?: unknown };

// Keep the existing stored address format compatible with admin order details.
export function formatDelivery(input: DeliveryInput): string {
  const required = [input.fullName, input.mobile, input.city, input.address];
  if (required.some(value => typeof value !== "string" || !value.trim() || value.includes(" | "))
      || (input.notes !== undefined && typeof input.notes !== "string")) {
    throw new Error("Add your name, mobile number, city and address. Do not use ' | ' in these fields.");
  }
  const [name, mobile, city, address] = required.map(value => (value as string).trim());
  return `Name: ${name} | Mobile: ${mobile} | City: ${city} | Address: ${address} | Notes: ${(input.notes as string | undefined)?.trim() || ""}`;
}

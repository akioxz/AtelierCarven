// Request exact counts so a server cap smaller than the requested page size
// cannot silently truncate the result. Advance by rows received, not page size.
export async function fetchAllRows<T>(
  buildPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown; count: number | null }>,
  pageSize = 200,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error("Invalid page size");
  const rows: T[] = [];
  for (;;) {
    const { data, error, count } = await buildPage(rows.length, rows.length + pageSize - 1);
    if (error) throw error;
    if (!Array.isArray(data) || count === null || !Number.isInteger(count) || count < 0) {
      throw new Error("The list could not be loaded completely.");
    }
    rows.push(...data);
    if (rows.length >= count) return rows;
    if (data.length === 0) throw new Error("The list changed while loading. Please refresh.");
  }
}

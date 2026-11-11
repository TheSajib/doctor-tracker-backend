export function toPage(items, total, page, pageSize) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), pages);
  const start = (safePage - 1) * pageSize;
  return {
    items,
    total,
    page: safePage,
    pageSize,
    pages,
    from: total === 0 ? 0 : start + 1,
    to: total === 0 ? 0 : start + items.length,
  };
}

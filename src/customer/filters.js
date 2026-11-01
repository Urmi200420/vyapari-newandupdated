// Empty bounds are unbounded; zero is an explicit inclusive price limit.
export function filterProducts(products, filters = {}) {
  const {
    query = "",
    category = "all",
    min = "",
    max = "",
    sort = "featured",
    minBadInput = false,
    maxBadInput = false,
  } = filters;
  const errors = {};
  function bound(value, name, badInput) {
    const text = String(value).trim();
    if (badInput) {
      errors[name] = "Enter a valid non-negative price.";
      return null;
    }
    if (text === "") return null;
    const number = Number(text);
    if (!Number.isFinite(number) || number < 0) {
      errors[name] = "Enter a valid non-negative price.";
      return null;
    }
    return number;
  }
  const minimum = bound(min, "min", minBadInput);
  const maximum = bound(max, "max", maxBadInput);
  if (
    !errors.min &&
    !errors.max &&
    minimum !== null &&
    maximum !== null &&
    minimum > maximum
  ) {
    errors.range = "Minimum price must not exceed maximum price.";
  }
  if (Object.keys(errors).length) return { list: [], errors, valid: false };
  const search = query.trim().toLowerCase();
  const list = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search) &&
      (category === "all" || p.category === category) &&
      (minimum === null || p.price >= minimum) &&
      (maximum === null || p.price <= maximum),
  );
  if (sort === "asc") list.sort((a, b) => a.price - b.price);
  if (sort === "desc") list.sort((a, b) => b.price - a.price);
  return { list, errors, valid: true };
}

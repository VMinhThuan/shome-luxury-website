async function mapWithConcurrency(items, concurrency, mapper) {
  const values = Array.isArray(items) ? items : [];
  const workerCount = Math.max(1, Math.min(Number(concurrency) || 1, values.length || 1));
  const results = new Array(values.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= values.length) return;
      results[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

module.exports = { mapWithConcurrency };

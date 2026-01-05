
const Database = require('better-sqlite3');
const db = new Database('laboratorio.db');

try {
  const nulls = db.prepare(`
    SELECT count(*) as count
    FROM work_orders 
    WHERE type IS NULL OR product IS NULL OR date IS NULL
  `).get();

  console.log("Rows with NULL type, product, or date:", nulls.count);

  const sample = db.prepare(`
    SELECT id, type, product, date, created_at FROM work_orders LIMIT 5
  `).all();
  console.log("Sample Data:");
  console.table(sample);

} catch (error) {
  console.error("Error:", error.message);
}

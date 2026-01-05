
const Database = require('better-sqlite3');
const db = new Database('laboratorio.db');

try {
  // Find a user with assignments
  const assignment = db.prepare('SELECT user_id FROM work_order_activity_assignments LIMIT 1').get();
  
  if (assignment) {
      console.log("Testing getMisOts for user_id:", assignment.user_id);
      const ots = db.prepare(`
        SELECT DISTINCT wo.*, c.name as client_name 
        FROM work_orders wo
        JOIN clients c ON wo.client_id = c.id
        JOIN work_order_activities wa ON wo.id = wa.work_order_id
        JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        WHERE waa.user_id = ?
      `).all(assignment.user_id);

      console.log("Mis OTs found:", ots.length);
      if (ots.length > 0) {
        console.log("First Mis OT:", JSON.stringify(ots[0], null, 2));
      }
  } else {
      console.log("No assignments found to test getMisOts");
  }

} catch (error) {
  console.error("Error:", error.message);
}

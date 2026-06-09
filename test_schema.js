const supabaseUrl = "https://hghsiwgxzawivwgsqdvd.supabase.co/rest/v1/";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnaHNpd2d4emF3aXZ3Z3NxZHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTc1NDQsImV4cCI6MjA5NDkzMzU0NH0.PsEvD4DI4l8YVrDzEim9e1VivIbC8iqoat56t4POxz4";

async function testTable(tableName) {
  const res = await fetch(`${supabaseUrl}${tableName}?limit=1`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Accept': 'text/csv'
    }
  });
  const csv = await res.text();
  console.log(`\nColumns for table "${tableName}":`);
  console.log(csv.split('\n')[0]);
}

async function run() {
  await testTable('cart');
  await testTable('orders');
  await testTable('order_items');
  await testTable('furniture');
  await testTable('profiles');
}

run();

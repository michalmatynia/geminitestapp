import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgresuser@localhost:5432/stardb?schema=public',
});

async function checkTables() {
  try {
    await client.connect();
    const res = await client.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\''
    );
    console.log('Tables in public schema:');
    res.rows.forEach((row) => console.log(` - ${row.table_name}`));
  } catch (err) {
    console.error('Error connecting to DB:', err);
  } finally {
    await client.end();
  }
}

checkTables();

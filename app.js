const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const app = express();
const dbPath = path.join(__dirname, 'ipLocations.db');

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        route_no INTEGER NOT NULL,
        name TEXT NOT NULL,
        lng REAL NOT NULL,
        lat REAL NOT NULL,
        direction TEXT NOT NULL,
        stopPresent BOOLEAN DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await db.exec(createTableQuery);

    app.listen(5252, () => {
      console.log('Server Running at http://localhost:5252/');
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.use(express.json());

app.post('/add', async (request, response) => {
  try {
    const { route_no, name, lng, lat, direction, stopPresent = 0 } = request.body;
    const query = `
      INSERT INTO routes (route_no, name, lng, lat, direction, stopPresent)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    await db.run(query, [route_no, name, lng, lat, direction, stopPresent]);
    
    response.status(201).send('Location added successfully');
  } catch (error) {
    response.status(500).send(`Error adding location: ${error.message}`);
  }
});

// MODIFIED GET ROUTE
app.get('/get', async (request, response) => {
  try {
    const queryParams = request.query;
    const paramKeys = Object.keys(queryParams);

    // Base query
    let query = 'SELECT * FROM routes';
    const values = [];

    // If query parameters exist, build a WHERE clause
    if (paramKeys.length > 0) {
      const conditions = paramKeys.map(key => {
        // Check if the key is a valid column to prevent SQL injection
        const validColumns = ['route_no', 'name', 'direction', 'stopPresent', 'id'];
        if (!validColumns.includes(key)) {
            // This check is an extra layer of security
            throw new Error(`Invalid query parameter: ${key}`);
        }
        values.push(queryParams[key]);
        return `${key} = ?`;
      });

      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ';';

    // Execute the dynamically built query
    const locations = await db.all(query, values);
    response.status(200).json(locations);
  } catch (error) {
    response.status(500).send(`Error fetching locations: ${error.message}`);
  }
});
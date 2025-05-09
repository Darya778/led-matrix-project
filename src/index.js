const express = require('express');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const mqtt = require('mqtt');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const SECRET_KEY = "your_secret_key";
const db = new sqlite3.Database('./db.sqlite');
const mqttClient = mqtt.connect('mqtt://broker.emqx.io');

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Новый эндпоинт для проверки привязанных матриц
app.get('/api/user/status', authenticateToken, (req, res) => {
  db.get("SELECT COUNT(*) as count FROM matrices WHERE user_id = ?", [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ hasMatrix: row.count > 0 });
  });
});

app.get('/api/matrices', authenticateToken, (req, res) => {
  db.all("SELECT * FROM matrices WHERE user_id = ?", [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/matrices/bind', authenticateToken, (req, res) => {
  const { serial_number } = req.body;
  const userId = req.user.id;

  db.get("SELECT * FROM matrices WHERE serial_number = ?", [serial_number], (err, matrix) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!matrix) return res.status(404).json({ error: "Matrix not found" });
    if (matrix.user_id) return res.status(400).json({ error: "Matrix already bound" });

    db.run("UPDATE matrices SET user_id = ? WHERE serial_number = ?", [userId, serial_number], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Matrix bound successfully" });
    });
  });
});

app.post('/api/send', authenticateToken, (req, res) => {
  const { matrix_id, payload } = req.body;

  db.get("SELECT * FROM matrices WHERE id = ? AND user_id = ?", [matrix_id, req.user.id], (err, matrix) => {
    if (err || !matrix) return res.status(404).json({ error: "Matrix not found or access denied" });

    // Формируем полное сообщение с mode и payload
    const message = JSON.stringify({
      mode: req.body.mode || "text", // Добавляем поле mode
      payload: payload
    });

    mqttClient.publish(matrix.topic, message, {}, (err) => {
      if (err) return res.status(500).json({ error: "MQTT error" });
      res.json({ message: "Sent successfully" });
    });
  });
});
// app.post('/api/send', authenticateToken, (req, res) => {
//   const { matrix_id, payload } = req.body;

//   db.get("SELECT * FROM matrices WHERE id = ? AND user_id = ?", [matrix_id, req.user.id], (err, matrix) => {
//     if (err || !matrix) return res.status(404).json({ error: "Matrix not found or access denied" });

//     mqttClient.publish(matrix.topic, payload, {}, (err) => {
//       if (err) return res.status(500).json({ error: "MQTT error" });
//       res.json({ message: "Sent successfully" });
//     });
//   });
// });

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (row) return res.status(400).json({ error: "User already exists" });

    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], function (err) {
      if (err) return res.status(500).json({ error: err.message });

      const user = { id: this.lastID, username };
      const token = jwt.sign(user, SECRET_KEY);
      res.json({ token, username });
    });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });

  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
    if (err || !user) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY);
    res.json({ token, username });
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
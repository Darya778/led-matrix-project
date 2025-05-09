
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matrices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  serial_number TEXT UNIQUE NOT NULL,
  topic TEXT NOT NULL,
  user_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO matrices (serial_number, topic) VALUES ('12345678', 'led/matrix');
UPDATE matrices SET topic = 'led/matrix' WHERE serial_number = '12345678';


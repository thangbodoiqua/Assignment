// dbsetup.js
const mysql = require('mysql2/promise');

async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'wpr',
    password: 'fit2024',
    port: 3306
  });

  const dbName = 'wpr2201040168';

  // Tạo database nếu chưa tồn tại
  await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
  await connection.query(`USE ${dbName}`);

  // Tạo bảng người dùng
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fullname VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(100) NOT NULL
    )
  `);

  // Tạo bảng email
  await connection.query(`
    CREATE TABLE IF NOT EXISTS emails (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      subject VARCHAR(255),
      body TEXT,
      attachment VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    )
  `);

  // Khởi tạo dữ liệu người dùng mẫu
  await connection.query(`
    INSERT IGNORE INTO users (fullname, email, password) VALUES 
    ('User One', 'a@a.com', '123'),
    ('User Two', 'b@b.com', '123'),
    ('User Three', 'c@c.com', '123')
  `);

  // Khởi tạo dữ liệu email mẫu
  await connection.query(`
    INSERT IGNORE INTO emails (sender_id, receiver_id, subject, body) VALUES
    (1, 2, 'Hello', 'This is a test email from User One to User Two.'),
    (2, 1, 'Reply', 'Thanks for the email, User One!'),
    (1, 3, 'Greetings', 'Hello User Three! How are you?'),
    (3, 1, 'Re: Greetings', 'I am fine, thank you, User One!')
  `);

  console.log("Database setup complete.");
  await connection.end();
}

// Thêm hàm tạo người dùng mới
async function addUser(fullname, email, password) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'wpr',
    password: 'fit2024',
    database: 'wpr2201040168',
    port: 3306
  });

  try {
    await connection.query(`INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)`, [fullname, email, password]);
    console.log('User added successfully!');
  } catch (error) {
    console.error('Error adding user:', error.message);
  } finally {
    await connection.end();
  }
}

// Thiết lập cơ sở dữ liệu trước khi thêm người dùng mới
setupDatabase().then(() => {
  return addUser('User Four', 'd@d.com', '123');
}).catch((error) => console.error(error));
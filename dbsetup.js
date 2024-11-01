async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST, // Sử dụng biến môi trường
    user: process.env.DB_USER, // Sử dụng biến môi trường
    password: process.env.DB_PASSWORD, // Sử dụng biến môi trường
    port: process.env.DB_PORT // Sử dụng biến môi trường
  });

  const dbName = process.env.DB_NAME; // Sử dụng biến môi trường

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
    ('Thangbodoiqua', 'dluy2406@gmail.com', '123'),
    ('Nguyen Dinh Thang', 'dinhthang2k04@gmail.com', '123')
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

// Chỉ chạy hàm setupDatabase và in ra thông báo
setupDatabase().then(() => {
  console.log("Setup completed successfully!");
}).catch((error) => console.error("Error setting up database:", error));
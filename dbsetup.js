const mysql = require('mysql2/promise');
require('dotenv').config(); // Sử dụng dotenv

async function setupDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST, 
        user: process.env.DB_USER, 
        password: process.env.DB_PASSWORD, 
        port: process.env.DB_PORT 
    });

    const dbName = process.env.DB_NAME;

    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    await connection.query(`USE ${dbName}`);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fullname VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(100) NOT NULL
        )
    `);

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

    await connection.query(`
        INSERT IGNORE INTO users (fullname, email, password) VALUES 
        ('User One', 'a@a.com', '123'),
        ('Thangbodoiqua', 'dluy2406@gmail.com', '123'),
        ('Nguyen Dinh Thang', 'dinhthang2k04@gmail.com', '123')
    `);

    // Lấy ID và fullname của người dùng vừa chèn
    const [users] = await connection.query('SELECT id, fullname FROM users');

    // Khởi tạo dữ liệu email mẫu với định dạng mới
    const emails = [
        { sender_id: users[0].id, receiver_id: users[1].id, subject: `from ${users[0].fullname}`, body: `to ${users[1].fullname}` },
        { sender_id: users[1].id, receiver_id: users[0].id, subject: `reply from ${users[1].fullname}`, body: `to answer ${users[0].fullname}` },
        { sender_id: users[0].id, receiver_id: users[2].id, subject: `from ${users[0].fullname}`, body: `to ${users[2].fullname}` },
        { sender_id: users[2].id, receiver_id: users[0].id, subject: `reply from ${users[2].fullname}`, body: `to answer ${users[0].fullname}` },
        { sender_id: users[1].id, receiver_id: users[2].id, subject: `from ${users[1].fullname}`, body: `to ${users[2].fullname}` },
        { sender_id: users[2].id, receiver_id: users[1].id, subject: `reply from ${users[2].fullname}`, body: `to answer ${users[1].fullname}` },
        { sender_id: users[0].id, receiver_id: users[1].id, subject: `from ${users[0].fullname}`, body: `to ${users[1].fullname}` },
        { sender_id: users[1].id, receiver_id: users[0].id, subject: `reply from ${users[1].fullname}`, body: `to answer ${users[0].fullname}` }
    ];

    for (const email of emails) {
        await connection.query(`INSERT INTO emails (sender_id, receiver_id, subject, body) VALUES (?, ?, ?, ?)`, 
            [email.sender_id, email.receiver_id, email.subject, email.body]);
    }

    await connection.end();
}

setupDatabase()
    .then(() => {
        console.log("Setup completed successfully!");
    })
    .catch((error) => console.error("Error setting up database:", error));
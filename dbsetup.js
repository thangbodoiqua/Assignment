const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

async function setup() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fullname VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(100) NOT NULL
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        subject VARCHAR(255),    
        body TEXT,
        attachment VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        isDeletedBySender INT DEFAULT 0,
        isDeletedByReceiver INT DEFAULT 0,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id)
        )
    `);

    await pool.query(`
        INSERT IGNORE INTO users (fullname, email, password) VALUES 
        ('🐷 <3', 'a@a.com', '123'),
        ('Thangbodoiqua', 'dluy2406@gmail.com', '123'),
        ('Nguyen Dinh Thang', 'dinhthang2k04@gmail.com', '123'),
        ('Hoang Tu Ech 🐸', 'HoangTuEch@gmail.com', '123')`
    );

    const [users] = await pool.query('SELECT id, fullname FROM users');

    const emails = [
        { sender_id: users[0].id, receiver_id: users[1].id, subject: `from ${users[0].fullname}`, body: `to ${users[1].fullname}` },
        { sender_id: users[1].id, receiver_id: users[0].id, subject: `reply from ${users[1].fullname}`, body: `to answer ${users[0].fullname}` },
        { sender_id: users[0].id, receiver_id: users[2].id, subject: `from ${users[0].fullname}`, body: `to ${users[2].fullname}` },
        { sender_id: users[2].id, receiver_id: users[0].id, subject: `reply from ${users[2].fullname}`, body: `to answer ${users[0].fullname}` },
        { sender_id: users[1].id, receiver_id: users[2].id, subject: `from ${users[1].fullname}`, body: `to ${users[2].fullname}` },
        { sender_id: users[2].id, receiver_id: users[1].id, subject: `reply from ${users[2].fullname}`, body: `to answer ${users[1].fullname}` },
        { sender_id: users[0].id, receiver_id: users[1].id, subject: `from ${users[0].fullname}`, body: `to ${users[1].fullname}` },
        { sender_id: users[1].id, receiver_id: users[0].id, subject: `reply from ${users[1].fullname}`, body: `to answer ${users[0].fullname}`},
        { sender_id: users[0].id, receiver_id: users[1].id, subject: `Bài thơ Yêu đời`, body:
            `Đêm qua mưa thật là to\nTrăng sao ướt hết tối mò buồn ghê\nSáng nay trời vội trở về\nChiếu muôn tia nắng trên đê trong làng\n\n` +
            `Bầy chim mừng rỡ hót vang\nVườn hoa trước ngõ bướm vàng nhởn nhơ\nMẹ em phơi lụa hồng tơ\nNgắm mây em viết bài thơ yêu đời\n` +
            `Nắng hòa mưa thuận khắp nơi\nEm mơ em ước mọi người ấm no.\n\n(Nguyễn Hữu Bào)` 
        },
        { sender_id: users[1].id, receiver_id: users[0].id, subject:"Bài thơ Sống thật là sống hạnh phúc", body: 
            `Làm người phải sống thẳng ngay\nĐừng như con bướm đậu bay vô tình.\nSống sao thật với lòng mình\n` +
            `Đã hứa hẹn phải đinh ninh giữ lời.\n\n(Nguyễn Thị Thắm)`
        },
        { sender_id: users[0].id, receiver_id: users[3].id, subject: "Bài thơ Con Ếch", body:
            `Ếch ngồi đáy giếng ngắm trời\nKêu ca om sóm suốt đời không thôi\nTrời xanh chỉ một mảnh thôi\n` +
            `Cứ ngỡ tất cả ở đời có thế.\n  \n(Dân gian)`
        },
        { sender_id: users[1].id, receiver_id: users[3].id, subject: "Bài thơ Ao Ếch", body:
            `Ao nhà đầy nước trong veo\nĐàn ếch tấu nhạc inh eo mỗi chiều\nCòn đâu tiếng ếch thân yêu\n` +
            `Khi ao cạn nước, ếch đều ra đi.\n\n(Sưu tầm)`
        },
        { sender_id: users[2].id, receiver_id: users[3].id, subject: "Thơ về Ếch", body:
            `Ếch xanh nhảy nhót bên hồ\nKêu vang ộp ộp làm cho vui nhà\nMưa rơi ếch hát giao hòa\n` +
            `Thiên nhiên tươi đẹp thật là bình yên.\n\n(Sưu tầm)`
        },
        { sender_id: users[3].id, receiver_id: users[0].id, subject: "Thư từ Hoàng Tử Ếch", body:
            `Chào bạn thân mến,\nTôi là Hoàng Tử Ếch đây. Tôi rất vui được làm quen với bạn. Ao của tôi luôn rộng mở đón chào bạn ghé thăm.` 
        },
        { sender_id: users[3].id, receiver_id: users[1].id, subject: "Lời mời từ Hoàng Tử Ếch", body:
            `Thân gửi bạn,\nTối nay tôi tổ chức một buổi hòa nhạc ếch ở ao làng. Rất mong bạn đến tham dự. Sẽ có nhiều bản nhạc hay lắm đấy!`
        },
        { sender_id: users[3].id, receiver_id: users[2].id, subject: "Chia sẻ từ Hoàng Tử Ếch", body:
            `Này bạn ơi,\nCuộc sống ở ao làng thật tuyệt. Mỗi tối chúng tôi lại họp nhau hát những bài ca vui nhộn. Bạn có muốn tham gia không?`
        }
    ];

    for (const email of emails) {
        await pool.query(`INSERT INTO emails (sender_id, receiver_id, subject, body, isDeletedBySender, isDeletedByReceiver) VALUES (?, ?, ?, ?, 0, 0)`, 
            [email.sender_id, email.receiver_id, email.subject, email.body]);
    }
}

if (require.main === module) {// chạy file này thì mới chạy hàm setup
    //nếu ko có điều kiện này thì khi import file này vào file khác, hàm setup sẽ chạy luôn

    setup()
        .then(() => {
            console.log("Setup completed");
        })
        .catch((error) => console.error("Dbsetup failed", error))
        .finally(() => pool.end());// đóng kết nối, đỡ phải ấn ctrl + c để tắt ở cmd
}

module.exports = { pool };
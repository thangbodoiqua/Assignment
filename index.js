
const express = require('express');
const { engine } = require('express-handlebars');
const cookieParser = require('cookie-parser');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 8000;

app.engine('hbs', engine({ 
  extname: '.hbs', 
  defaultLayout: 'main', 
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  helpers: {
      formatDate: (date) => {
          const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
          return new Date(date).toLocaleDateString('en-US', options);
      }
  }
}));
app.set('view engine', 'hbs');
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'resources')));

const pool = mysql.createPool({
  host: 'localhost',
  user: 'wpr',
  password: 'fit2024',
  database: 'wpr2201040168',
  port: 3306
});

// 
app.get('/', (req, res) => {
  if (req.cookies.loggedIn) {
    return res.redirect('/inbox'); // Nếu đã đăng nhập, chuyển hướng đến inbox
  }
  res.render('signin'); // Nếu chưa đăng nhập, hiển thị trang đăng nhập
});


app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      const user = rows[0];
      if (user.password === password) {
        // Thiết lập cookie khi đăng nhập thành công
        res.cookie('loggedIn', true, { httpOnly: true, maxAge: 60 * 1000 }); // Cookie tồn tại trong 1 ngày
        res.cookie('userId', user.id, { httpOnly: true, maxAge: 60 * 1000 }); // Lưu userId trong cookie
        res.redirect('/inbox');
      } else {
        res.render('signin', { errorMessage: 'Sai tài khoản hoặc mật khẩu!' });
      }
    } else {
      res.render('signin', { errorMessage: 'Sai tài khoản hoặc mật khẩu!' });
    }
  } catch (error) {
    console.error(error);
    res.render('signin', { errorMessage: 'Có lỗi xảy ra, vui lòng thử lại!' });
  }
});

// Trang đăng ký
app.get('/signup', (req, res) => {
  res.render('signup');
});

// Xử lý đăng ký
app.post('/register', async (req, res) => {
  const { fullname, email, password, confirmPassword } = req.body;

  // Kiểm tra các điều kiện nhập liệu
  if (!fullname || !email || !password || !confirmPassword) {
      return res.json({ success: false, message: 'Please fill in all fields.' });
  }

  if (password.length < 6) {
      return res.json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  if (password !== confirmPassword) {
      return res.json({ success: false, message: 'Password and confirm password do not match.' });
  }

  try {
      // Kiểm tra xem email đã được sử dụng chưa
      const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (existingUser.length > 0) {
          return res.json({ success: false, message: 'Email is already in use!' });
      }

      // Nếu tất cả điều kiện đều hợp lệ, thực hiện đăng ký
      await pool.query('INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)', [fullname, email, password]);
      return res.json({ success: true, message: 'Registration successful! Please sign in.' });
  } catch (error) {
      console.error(error);
      return res.json({ success: false, message: 'An error occurred, please try again!' });
  }
});
app.get('/signup-success', (req, res) => {
  res.render('signup', { successMessage: 'Registration successful! Please sign in.' });
});

// Xử lý đăng nhập
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      const user = rows[0];
      if (user.password === password) {
        res.cookie('loggedIn', true, { httpOnly: true });
        res.cookie('userId', user.id, { httpOnly: true }); // Lưu userId trong cookie
        res.redirect('/inbox');
      } else {
        res.render('signin', { errorMessage: 'Wrong email or password!' });
      }
    } else {
      res.render('signin', { errorMessage: 'Wrong email or password!' });
    }
  } catch (error) {
    console.error(error);
    res.render('signin', { errorMessage: 'There is an error, please try again' });
  }
});

// Trang hộp thư đến (chỉ khi đã đăng nhập)
app.get('/inbox', async (req, res) => {
  if (!req.cookies.loggedIn) {
    return res.status(403).render('signin', { errorMessage: 'Please login to continue' });
  }

  const page = parseInt(req.query.page) || 1; // Lấy số trang từ query string
  const limit = 5; // Số email hiển thị mỗi trang
  const offset = (page - 1) * limit; // Tính offset

  try {
    const [emails] = await pool.query('SELECT * FROM emails WHERE receiver_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [req.cookies.userId, limit, offset]);
    const [totalEmails] = await pool.query('SELECT COUNT(*) as count FROM emails WHERE receiver_id = ?', [req.cookies.userId]);
    const totalPages = Math.ceil(totalEmails[0].count / limit); // Tính tổng số trang
    const prevPage = page > 1 ? page - 1 : null; // Trang trước
    const nextPage = page < totalPages ? page + 1 : null; // Trang sau

    const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]);

    res.render('inbox', {
      title: 'Inbox',
      emails,
      loggedIn: req.cookies.loggedIn,
      userFullname: user[0].fullname,
      prevPage,
      nextPage
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('There is an error, please try again!');
  }
});
//compose
app.get('/compose', async (req, res) => {
  if (!req.cookies.loggedIn) {
    return res.status(403).render('signin', { errorMessage: 'Please login to continue' });
  }

  // Lấy danh sách người dùng trừ người đang đăng nhập
  const [users] = await pool.query('SELECT id, fullname, email FROM users WHERE id != ?', [req.cookies.userId]);
  const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]); // Lấy tên người dùng đang đăng nhập

  res.render('compose', {
    users,
    loggedIn: req.cookies.loggedIn,
    userFullname: user[0].fullname, // Truyền tên người dùng vào view
  });
});

// Xử lý gửi email
app.post('/compose', async (req, res) => {
  const { recipient, subject, body } = req.body;

  // Kiểm tra xem người nhận đã được chọn chưa
  if (!recipient) {
    return res.render('compose', { errorMessage: 'Please select a recipient.' });
  }

  try {
    // Thêm email vào cơ sở dữ liệu
    await pool.query('INSERT INTO emails (sender_id, receiver_id, subject, body) VALUES (?, ?, ?, ?)', [req.cookies.userId, recipient, subject || null, body || null]);

    // Nếu có file đính kèm, xử lý upload file ở đây (điều này cần sử dụng multer hoặc thư viện khác)

    res.render('compose', { successMessage: 'Email sent successfully!', users: await pool.query('SELECT id, fullname, email FROM users WHERE id != ?', [req.cookies.userId]) });
  } catch (error) {
    console.error(error);
    res.render('compose', { errorMessage: 'An error occurred while sending the email. Please try again.', users: await pool.query('SELECT id, fullname, email FROM users WHERE id != ?', [req.cookies.userId]) });
  }
});
app.get('/emain_detail', (req, res) => {
  res.render('emain_detail', { errorMessage: 'Wrong email or password!' });

});
//outbox 
/// Trang Outbox (chỉ khi đã đăng nhập)
app.get('/outbox', async (req, res) => {
  if (!req.cookies.loggedIn) {
    return res.status(403).render('signin', { errorMessage: 'Please login to continue' });
  }

  const page = parseInt(req.query.page) || 1; // Lấy số trang từ query string
  const limit = 5; // Số email hiển thị mỗi trang
  const offset = (page - 1) * limit; // Tính offset

  try {
    // Lấy danh sách email đã gửi
    const [emails] = await pool.query('SELECT e.*, u.fullname AS recipient FROM emails e JOIN users u ON e.receiver_id = u.id WHERE e.sender_id = ? ORDER BY e.created_at DESC LIMIT ? OFFSET ?', [req.cookies.userId, limit, offset]);
    
    // Lấy tổng số email đã gửi để phân trang
    const [totalEmails] = await pool.query('SELECT COUNT(*) as count FROM emails WHERE sender_id = ?', [req.cookies.userId]);
    const totalPages = Math.ceil(totalEmails[0].count / limit); // Tính tổng số trang
    const prevPage = page > 1 ? page - 1 : null; // Trang trước
    const nextPage = page < totalPages ? page + 1 : null; // Trang sau

    const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]);

    res.render('outbox', {
      title: 'Outbox',
      emails,
      loggedIn: req.cookies.loggedIn,
      userFullname: user[0].fullname,
      prevPage,
      nextPage
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Có lỗi xảy ra, vui lòng thử lại!');
  }
});
// Đăng xuất
app.get('/logout', (req, res) => {
  res.clearCookie('loggedIn');
  res.clearCookie('userId');
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
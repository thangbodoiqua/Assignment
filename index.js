
const express = require('express');
const { engine } = require('express-handlebars');
const cookieParser = require('cookie-parser');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 8000;

// Cấu hình Handlebars
app.engine('hbs', engine({ 
    extname: '.hbs', 
    defaultLayout: 'main', 
    layoutsDir: path.join(__dirname, 'views', 'layouts') 
}));
app.set('view engine', 'hbs');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'resources')));

// Kết nối MySQL
const pool = mysql.createPool({
  host: 'localhost',
  user: 'wpr',
  password: 'fit2024',
  database: 'wpr2201040168',
  port: 3306
});

// Routes
// Trang đăng nhập
app.get('/', (req, res) => {
  if (req.cookies.loggedIn) {
    return res.redirect('/inbox'); // Nếu đã đăng nhập, chuyển hướng đến inbox
  }
  res.render('signin'); // Nếu chưa đăng nhập, hiển thị trang đăng nhập
});

// Xử lý đăng nhập
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      const user = rows[0];
      if (user.password === password) {
        // Thiết lập cookie khi đăng nhập thành công
        res.cookie('loggedIn', true, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }); // Cookie tồn tại trong 1 ngày
        res.cookie('userId', user.id, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }); // Lưu userId trong cookie
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
    return res.redirect('/');
  }

  const [emails] = await pool.query('SELECT * FROM emails WHERE receiver_id = ? ORDER BY created_at DESC', [req.cookies.userId]);
  const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]);

  res.render('inbox', {
    title: 'Inbox', // Thêm tiêu đề cho trang
    emails,
    loggedIn: req.cookies.loggedIn,
    userFullname: user[0].fullname,
  });
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
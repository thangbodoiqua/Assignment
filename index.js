
const express = require('express');
const { engine } = require('express-handlebars');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2/promise');

const app = express();


require('dotenv').config(); 
app.set('view engine', 'hbs');
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('resources'));

app.engine('hbs', engine({ 
  extname: '.hbs', 
  defaultLayout: 'main', 
  layoutsDir: 'views/layouts',
  helpers: {
      formatDate: (date) => {
          const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
          return new Date(date).toLocaleDateString('en-US', options);
      }
  }
}));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME // Thêm dòng này để chỉ định cơ sở dữ liệu
});

 
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


// Trang đăng ký
app.get('/signup', (req, res) => {
  if (req.cookies.loggedIn) {
    return res.redirect('/inbox'); // Nếu đã đăng nhập, chuyển hướng đến inbox
  }
  res.render('signup');
});

// Xử lý đăng ký
app.post('/register', async (req, res) => {
  const { fullname, email, password, confirmPassword } = req.body;

  // Kiểm tra các điều kiện nhập liệu
  if (!fullname || !email || !password || !confirmPassword) {
      return res.render('signup', { error: 'Please fill in all fields.', fullname, email });
  }

  if (password.length < 6) {
      return res.render('signup', { error: 'Password must be at least 6 characters long.', fullname, email });
  }

  if (password !== confirmPassword) {
      return res.render('signup', { error: 'Password and confirm password do not match.', fullname, email });
  }

  try {
      const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (existingUser.length > 0) {
          return res.render('signup', { error: 'Email is already in use!', fullname, email });
      }

      // Nếu tất cả điều kiện đều hợp lệ, thực hiện đăng ký
      await pool.query('INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)', [fullname, email, password]);

      return res.render('signin', { successMessage: 'Registration successful! Please sign in.' });
  } catch (error) {
      console.error(error);
      return res.render('signup', { error: 'An error occurred, please try again!', fullname, email });
  }
});



// Trang hộp thư đến (chỉ khi đã đăng nhập)
app.get('/inbox', async (req, res) => {
  if (!req.cookies.loggedIn) {
    return res.status(403).render('signin', { errorMessage: 'Please login to continue' });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;

  try {
    const [emails] = await pool.query('SELECT * FROM emails WHERE receiver_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [req.cookies.userId, limit, offset]);
    const [totalEmails] = await pool.query('SELECT COUNT(*) as count FROM emails WHERE receiver_id = ?', [req.cookies.userId]);
    const totalPages = Math.ceil(totalEmails[0].count / limit);
    const prevPage = page > 1 ? page - 1 : null;
    const nextPage = page < totalPages ? page + 1 : null;

    const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]);
    
    if (!user || user.length === 0) {
      res.clearCookie('loggedIn');
      res.clearCookie('userId');
      return res.status(404).render('signin', { errorMessage: 'User not found. Please login again.' });
    }

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
    res.clearCookie('loggedIn');
    res.clearCookie('userId');
    res.status(500).render('signin', { errorMessage: 'An error occurred, please login again.' });
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
    return res.render('compose', { errorMessage: 'Please select a recipient.', users: await pool.query('SELECT id, fullname, email FROM users WHERE id != ?', [req.cookies.userId]) });
  }

  try {
    // Thêm email vào cơ sở dữ liệu
    await pool.query('INSERT INTO emails (sender_id, receiver_id, subject, body) VALUES (?, ?, ?, ?)', [req.cookies.userId, recipient, subject || null, body || null]);

    res.render('compose', { successMessage: 'Email sent successfully!', users: await pool.query('SELECT id, fullname, email FROM users WHERE id != ?', [req.cookies.userId]) });
  } catch (error) {
    console.error(error);
    res.render('compose', { errorMessage: 'An error occurred while sending the email. Please try again.', users: await pool.query('SELECT id, fullname, email FROM users WHERE id != ?', [req.cookies.userId]) });
  }
});


//outbox 
app.get('/outbox', async (req, res) => {
  if (!req.cookies.loggedIn) {
    return res.status(403).render('signin', { errorMessage: 'Please login to continue' });
  }

  const page = parseInt(req.query.page) || 1; // Lấy số trang từ query string
  const limit = 5; // Số email hiển thị mỗi trang
  const offset = (page - 1) * limit; // Tính offset

  try {
    const [emails] = await pool.query('SELECT e.*, u.fullname AS recipient FROM emails e JOIN users u ON e.receiver_id = u.id WHERE e.sender_id = ? ORDER BY e.created_at DESC LIMIT ? OFFSET ?', [req.cookies.userId, limit, offset]);
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



app.get('/logout', (req, res) => {
  res.clearCookie('loggedIn');
  res.clearCookie('userId');
  res.redirect('/');
});



const PORT = 8000;
app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
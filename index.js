// <!-- index.js -->// 
//Cấu hình file

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
  database: process.env.DB_NAME
});
/// Kết thúc cấu hình


//Trang đăng nhập
app.get('/', (req, res) => {
  if (req.cookies.loggedIn) {
    return res.redirect('/inbox'); 
  }
  res.render('signin');
});

app.post('/login', async (req, res) => {
  console.log(req.body);
  const { email, password } = req.body;

  try {
    const [[user]] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (user) {
      if (user.password === password) {
        res.cookie('loggedIn', true, { httpOnly: true, maxAge: 10 * 60 * 1000 });
        res.cookie('userId', user.id, { httpOnly: true, maxAge: 10* 60 * 1000 });
        res.redirect('/inbox');
      } else {
        res.render('signin', { errorMessage: 'Wrong email or password!' });
      }
    } else {
      res.render('signin', { errorMessage: 'Wrong email or password!' });
    }
  } catch (error) {
    res.render('signin', { errorMessage: 'There is an error, please try again' });
  }
});
//Kết thúc trang đăng nhập



// Trang đăng ký
app.get('/signup', (req, res) => {
  if (req.cookies.loggedIn) {
    return res.redirect('/inbox');
  }
  res.render('signup');
});

// Xử lý đăng ký
app.post('/register', async (req, res) => {
  const { fullname, email, password, confirmPassword } = req.body;

  if (password.length < 6) {
      return res.render('signup', { error: 'Password must be at least 6 characters long.', fullname, email });
  }

  if (password !== confirmPassword) {
      return res.render('signup', { error: 'Password and confirm password do not match.', fullname, email });
  }

  try {
      const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (existingUser.length > 0) {
          return res.render('signup', { error: 'Email is already in use!', fullname});
      }

      await pool.query('INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)', [fullname, email, password]);

      return res.render('signin', { successMessage: 'Registration successful! Please sign in.' });
  } catch (error) {
      console.error(error);
      return res.render('signup', { error: 'An error occurred, please try again!'});
  }
});

//Kết thúc trang đăng ký và xử lý trang đăng ký

// Trang hộp thư đến 
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
          nextPage,
      });
  } catch (error) {
      console.error(error);
      res.clearCookie('loggedIn');
      res.clearCookie('userId');
      res.status(500).render('signin', { errorMessage: 'An error occurred, please login again.' });
  }
});

// Kết thúc inbox.hbs




//compose và Xử lý gửi email

app.get('/compose', async (req, res) => {
  if (!req.cookies.loggedIn) {
    return res.status(403).render('signin', { errorMessage: 'Please login to continue' });
  }
  const [users] = await pool.query('SELECT id, fullname, email FROM users WHERE id != ?', [req.cookies.userId]);

  const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]);

  res.render('compose', {
    users,
    loggedIn: req.cookies.loggedIn,
    userFullname: user[0].fullname, // Truyền tên người dùng vào view
  });
});

app.post('/compose', async (req, res) => {
  const { recipient, subject, body } = req.body;

  // Kiểm tra xem người nhận đã được chọn chưa
  if (!recipient) {
      // Lấy tên người dùng đang đăng nhập
      const [users] = await pool.query('SELECT id, fullname, email FROM users WHERE id != ?', [req.cookies.userId]);

      const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]);

      return res.render('compose', { 
          errorMessage: 'Please select a recipient.', 
          users,
          loggedIn: req.cookies.loggedIn,
          userFullname: user[0]?.fullname // Lưu lại tên đầy đủ của người dùng
      });
  }

  try {
      // Thêm email vào cơ sở dữ liệu
      const result = await pool.query(
          'INSERT INTO emails (sender_id, receiver_id, subject, body) VALUES (?, ?, ?, ?)', 
          [req.cookies.userId, recipient, subject || null, body || null]
      );

      // Lấy danh sách người dùng trừ người đang đăng nhập
      const [users] = await pool.query('SELECT id, fullname, email FROM users WHERE id != ?', [req.cookies.userId]);
      // Lấy tên người dùng đang đăng nhập
      const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]);

      // Kiểm tra xem email có được thêm thành công không
      if (result[0].affectedRows > 0) {
          res.render('compose', { 
              successMessage: 'Email sent successfully!', 
              users,
              loggedIn: req.cookies.loggedIn,
              userFullname: user[0]?.fullname // Lưu lại tên đầy đủ của người dùng
          });
      } else {
          res.render('compose', { 
              errorMessage: 'Failed to send email. Please try again.', 
              users,
              loggedIn: req.cookies.loggedIn,
              userFullname: user[0]?.fullname // Lưu lại tên đầy đủ của người dùng
          });
      }
  } catch (error) {
      console.error(error);
      // Lấy tên người dùng đang đăng nhập
      const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]);

      res.render('compose', { 
          errorMessage: 'An error occurred while sending the email. Please try again.', 
          users,
          loggedIn: req.cookies.loggedIn,
          userFullname: user[0]?.fullname // Lưu lại tên đầy đủ của người dùng
      });
  }
});
//Kết thúc compose và Xử lý gửi email


//outbox 
app.get('/outbox', async (req, res) => {
  if (!req.cookies.loggedIn) {
      return res.status(403).render('signin', { errorMessage: 'Please login to continue' });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;

  try {
      const [emails] = await pool.query('SELECT * FROM emails WHERE sender_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [req.cookies.userId, limit, offset]);
      const [totalEmails] = await pool.query('SELECT COUNT(*) as count FROM emails WHERE sender_id = ?', [req.cookies.userId]);
      const totalPages = Math.ceil(totalEmails[0].count / limit);
      const prevPage = page > 1 ? page - 1 : null;
      const nextPage = page < totalPages ? page + 1 : null;

      const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
      const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]);

      if (!user || user.length === 0) {
          res.clearCookie('loggedIn');
          res.clearCookie('userId');
          return res.status(404).render('signin', { errorMessage: 'User not found. Please login again.' });
      }

      res.render('outbox', {
          title: 'Outbox',
          emails,
          loggedIn: req.cookies.loggedIn,
          userFullname: user[0].fullname,
          prevPage,
          nextPage,
      });
  } catch (error) {
      console.error(error);
      res.clearCookie('loggedIn');
      res.clearCookie('userId');
      res.status(500).render('signin', { errorMessage: 'An error occurred, please login again.' });
  }
});
//Kết thúc outbox


//Email_detail
app.get('/email/:id', async (req, res) => {
  const emailId = req.params.id;

  // Kiểm tra trạng thái đăng nhập
  if (!req.cookies.loggedIn) {
    return res.redirect('/signin');
  }

  try {
    const [emails] = await pool.query(
      `SELECT emails.*, users.fullname AS sender_name 
       FROM emails 
       JOIN users ON emails.sender_id = users.id 
       WHERE emails.id = ? AND (emails.receiver_id = ? OR emails.sender_id = ?)`,
      [emailId, req.cookies.userId, req.cookies.userId]
    );
    if (emails.length === 0) {
      return res.status(404).render('error', { message: 'Email not found or you do not have permission to view it.' });
    }
    const email = emails[0];
    const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]);

    if (!user || user.length === 0) {
      return res.status(404).render('error', { message: 'User not found. Please login again.' });
    }
    res.render('email_detail', { 
      email,
      userFullname: user[0].fullname,
      loggedIn: req.cookies.loggedIn, 
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'An error occurred, please try again later.' });
  }
});

//KẾt thúc Email_detail

app.get('/logout', (req, res) => {
  res.clearCookie('loggedIn');
  res.clearCookie('userId');
  res.redirect('/');
});
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
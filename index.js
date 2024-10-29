const express = require('express');
const exphbs = require('express-handlebars');
const mysql = require('mysql2');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình Handlebars
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Kết nối cơ sở dữ liệu
const db = mysql.createConnection({
  host: 'localhost',
  user: 'wpr',
  password: 'fit2024',
  database: 'wpr2201040168', // Thay <sid> bằng mã sinh viên của bạn
});

db.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL');
});

// Route trang Sign-in
app.get('/', (req, res) => {
  res.render('signin', { error: null });
});

// Route xử lý đăng nhập
app.post('/signin', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, results) => {
    if (err) throw err;

    if (results.length > 0) {
      res.cookie('session', 'userLoggedIn', { httpOnly: true });
      res.redirect('/inbox');
    } else {
      res.render('signin', { error: 'Invalid email or password' });
    }
  });
});

app.get('/inbox', (req, res) => {
  if (!req.cookies.session) {
    return res.status(403).send('Access Denied');
  }
  res.send('This is the inbox page');
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
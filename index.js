
// const express = require('express');
// const {engine} = require('express-handlebars');
// const cookieParser = require('cookie-parser');
// const path = require('path');

// const app = express();
// const PORT = 8000;

// // Cấu hình Handlebars với đuôi file .hbs
// app.engine('hbs', engine({ 
//     extname: '.hbs', 
//     defaultLayout: 'main', 
//     layoutsDir: path.join(__dirname, 'views', 'layouts') 
// }));
// app.set('view engine', 'hbs');

// // Middleware
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'resources')));

// // Routes
// // Route trang đăng nhập
// app.get('/', (req, res) => {
//   res.render('signin');
// });

// // Route trang đăng ký
// app.get('/signup', (req, res) => {
//   res.render('signup');
// });

// // Route xử lý đăng ký người dùng
// app.post('/register', (req, res) => {
//   // Xử lý đăng ký ở đây (kiểm tra thông tin người dùng, lưu vào DB, v.v.)
//   res.redirect('/'); // Sau khi đăng ký thành công, chuyển về trang đăng nhập
// });

// // Route xử lý đăng nhập
// app.post('/login', (req, res) => {
//   const { username, password } = req.body;

//   // Giả lập kiểm tra đăng nhập
//   if (username === 'user' && password === '123') {
//       res.redirect('/inbox');
//   } else {
//       res.render('signin', { errorMessage: 'Sai tài khoản hoặc mật khẩu!' });
//   }
// });

// // Route trang hộp thư đến (Inbox)
// app.get('/inbox', (req, res) => {
//   res.render('inbox', { emails: [] });  // emails sẽ được thay bằng danh sách email thật từ DB
// });

// app.listen(PORT, () => {
//   console.log(`Server đang chạy tại http://localhost:${PORT}`);
// });


// //Xử lý cn đăng nhập
// // Import mysql2 và các thư viện cần thiết
// const mysql = require('mysql2/promise');

// // Tạo kết nối đến cơ sở dữ liệu
// const pool = mysql.createPool({
//   host: 'localhost',
//   user: 'wpr',
//   password: 'fit2024',
//   database: 'wpr<sid>'
// });

// // Route xử lý đăng nhập
// app.post('/login', async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);

//     if (rows.length > 0) {
//       res.redirect('/inbox');
//     } else {
//       res.render('signin', { errorMessage: 'Sai tài khoản hoặc mật khẩu!' });
//     }
//   } catch (error) {
//     console.error(error);
//     res.render('signin', { errorMessage: 'Có lỗi xảy ra, vui lòng thử lại!' });
//   }
// });

// // Route xử lý đăng ký người dùng
// app.post('/register', async (req, res) => {
//   const { fullname, email, password, confirmPassword } = req.body;

//   // Kiểm tra các điều kiện đăng ký
//   if (!fullname || !email || !password || password.length < 6 || password !== confirmPassword) {
//     return res.render('signup', { errorMessage: 'Vui lòng điền đầy đủ và đúng thông tin.' });
//   }

//   try {
//     await pool.query('INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)', [fullname, email, password]);
//     res.redirect('/');
//   } catch (error) {
//     console.error(error);
//     res.render('signup', { errorMessage: 'Email đã được sử dụng!' });
//   }
// });


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
  database: 'wpr2201040168'
});

// Routes
// Trang đăng nhập
app.get('/', (req, res) => {
  res.render('signin');
});

// Trang đăng ký
app.get('/signup', (req, res) => {
  res.render('signup');
});

// Xử lý đăng ký
app.post('/register', async (req, res) => {
  const { fullname, email, password, confirmPassword } = req.body;
  
  if (!fullname || !email || !password || password !== confirmPassword) {
    return res.render('signup', { errorMessage: 'Thông tin không hợp lệ.' });
  }

  try {
    await pool.query('INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)', [fullname, email, password]);
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.render('signup', { errorMessage: 'Email đã được sử dụng!' });
  }
});

// Xử lý đăng nhập
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (rows.length > 0) {
      res.cookie('loggedIn', true, { httpOnly: true });
      res.redirect('/inbox');
    } else {
      res.render('signin', { errorMessage: 'Sai tài khoản hoặc mật khẩu!' });
    }
  } catch (error) {
    console.error(error);
    res.render('signin', { errorMessage: 'Có lỗi xảy ra, vui lòng thử lại!' });
  }
});

// Trang hộp thư đến (chỉ khi đã đăng nhập)
app.get('/inbox', (req, res) => {
  if (!req.cookies.loggedIn) {
    return res.redirect('/');
  }
  res.render('inbox', { emails: [] });
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});


// Xử lý đăng ký
app.post('/register', async (req, res) => {
  const { fullname, email, password, confirmPassword } = req.body;
  
  if (!fullname || !email || !password || password !== confirmPassword) {
    return res.render('signup', { errorMessage: 'Thông tin không hợp lệ. Vui lòng kiểm tra lại.' });
  }

  try {
    await pool.query('INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)', [fullname, email, password]);
    res.render('signin', { successMessage: 'Đăng ký thành công! Vui lòng đăng nhập.' });
  } catch (error) {
    console.error(error);
    res.render('signup', { errorMessage: 'Email đã được sử dụng!' });
  }
});

// Xử lý đăng nhập
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (rows.length > 0) {
      res.cookie('loggedIn', true, { httpOnly: true });
      res.redirect('/inbox');
    } else {
      res.render('signin', { errorMessage: 'Sai tài khoản hoặc mật khẩu!' });
    }
  } catch (error) {
    console.error(error);
    res.render('signin', { errorMessage: 'Có lỗi xảy ra, vui lòng thử lại!' });
  }
});
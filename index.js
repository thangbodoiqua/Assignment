// const express = require('express');
// const { engine } = require('express-handlebars');  // Sử dụng cú pháp destructuring để import engine
// const cookieParser = require('cookie-parser');
// const path = require('path');
// // const mysql = require('mysql2');


// const app = express();
// const PORT = 8000;

// app.use(cookieParser());
// app.use(express.urlencoded({ extended: true }));

// // Cấu hình Handlebars
// app.engine('hbs', engine({ defaultLayout: 'main', 
//   extname: '.hbs'
// }));
// app.set('view engine', 'hbs');
// app.set('views', path.join(__dirname, 'views'));
// app.use('/resources', express.static(path.join(__dirname, 'resources')));


// // Route trang Sign-in
// app.get('/', (req, res) => {
//   res.render('signin', { title: 'Sign In', error: null });
// });

// // Route trang Sign-up
// app.get('/signup', (req, res) => {
//   res.render('signup', { title: 'Sign Up', error: null });
// });

// app.listen(PORT, () => {
//   console.log(`Server running at http://localhost:${PORT}/`);
// });
// index.js
const express = require('express');
const {engine} = require('express-handlebars');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = 8000;

// Cấu hình Handlebars với đuôi file .hbs
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

// Routes
// Route trang đăng nhập
app.get('/', (req, res) => {
  res.render('signin');
});

// Route trang đăng ký
app.get('/signup', (req, res) => {
  res.render('signup');
});

// Route xử lý đăng ký người dùng
app.post('/register', (req, res) => {
  // Xử lý đăng ký ở đây (kiểm tra thông tin người dùng, lưu vào DB, v.v.)
  res.redirect('/'); // Sau khi đăng ký thành công, chuyển về trang đăng nhập
});

// Route xử lý đăng nhập
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Giả lập kiểm tra đăng nhập
  if (username === 'user' && password === '123') {
      res.redirect('/inbox');
  } else {
      res.render('signin', { errorMessage: 'Sai tài khoản hoặc mật khẩu!' });
  }
});

// Route trang hộp thư đến (Inbox)
app.get('/inbox', (req, res) => {
  res.render('inbox', { emails: [] });  // emails sẽ được thay bằng danh sách email thật từ DB
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
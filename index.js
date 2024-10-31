const express = require('express');
const { engine } = require('express-handlebars');  // Sử dụng cú pháp destructuring để import engine
// const mysql = require('mysql2');
const cookieParser = require('cookie-parser');
const path = require('path');


const app = express();
const PORT = 8000;

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Cấu hình Handlebars
app.engine('hbs', engine({ defaultLayout: 'main', 
  extname: '.hbs'
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use('/resources', express.static(path.join(__dirname, 'resources')));

// // Kết nối cơ sở dữ liệu
// const db = mysql.createConnection({
//   host: 'localhost',
//   user: 'wpr',
//   password: 'fit2024',
//   database: 'wpr<sid>', // Thay <sid> bằng mã sinh viên của bạn
// });

// db.connect(err => {
//   if (err) throw err;
//   console.log('Connected to MySQL');
// });

// Route trang Sign-in
app.get('/', (req, res) => {
  res.render('signin', { title: 'Sign In', error: null });
});

// Route trang Sign-up
app.get('/signup', (req, res) => {
  res.render('signup', { title: 'Sign Up', error: null });
});

// // Route xử lý form đăng ký (Sign-up)
// app.post('/signup', (req, res) => {
//   const { fullName, email, password, repassword } = req.body;

//   if (password !== repassword) {
//     return res.render('signup', { title: 'Sign Up', error: 'Passwords do not match' });
//   }

//   const query = `INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)`;
//   db.query(query, [fullName, email, password], (err, result) => {
//     if (err) {
//       if (err.code === 'ER_DUP_ENTRY') {
//         res.render('signup', { title: 'Sign Up', error: 'Email is already in use' });
//       } else {
//         throw err;
//       }
//     } else {
//       res.redirect('/');
//     }
//   });
// });

app.listen(PORT, () => {
  var a = 1;
  var b = 2;
  var c = a + b;
  console.log(`Server running at http://localhost:${PORT}/`);
});
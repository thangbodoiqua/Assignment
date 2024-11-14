const express = require('express');
const app = express();
const { engine } = require('express-handlebars');
const cookie = require('cookie-parser');
const multer = require('multer');


app.set('view engine', 'hbs');
app.engine('hbs', engine({ 
  extname: '.hbs', 
  defaultLayout: 'home', 
  layoutsDir: 'views/layouts',
  helpers: {
      formatDate: (date) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(date).toLocaleDateString('en-US', options);
      },
      eq: (a, b) => a === b
  }
}));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

module.exports = upload;

app.use(express.static('resources'));
app.use(express.static('controllers'));
app.use(express.json()) // để đọc được json trong request, nếu ko có thì req.body sẽ là undefined
app.use(express.urlencoded({ extended: true }));//có vẻ cx vậy nhưng dùng vs form data trong html còn bên trên xử lý JSON data, và xử lý đc dl phức tạp hơn
//dùng 2 cái có thể xử lý đủ loại request
app.use(cookie());

const routes = require('./routes/route');
app.use('/', routes);

app.listen(8000, () => {
  console.log(`http://localhost:8000`);
});
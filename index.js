// index.js
const express = require('express');
const { engine } = require('express-handlebars');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const routes = require('./routes/route');


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
      },
      eq: (a, b) => a === b
  }
}));

// Sử dụng routes được import từ routes/route.js
app.use('/', routes);

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
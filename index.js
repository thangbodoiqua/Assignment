// <!-- index.js -->// 

const express = require('express');
const { engine } = require('express-handlebars');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2/promise');
require('dotenv').config();
const app = express();
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'uploads'); 
  },
  filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage })

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
      eq: (a, b) => {
          return a === b;
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


app.get('/signup', (req, res) => {
  if (req.cookies.loggedIn) {
    return res.redirect('/inbox');
  }
  res.render('signup');
});

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


app.get('/inbox', async (req, res) => {
  if (!req.cookies.loggedIn) {
      return res.status(403).render('access_denied');
  }

  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;

  try {
      const [emails] = await pool.query(
          'SELECT e.id, u.fullname AS sender, e.subject, e.created_at FROM emails e JOIN users u ON e.sender_id = u.id WHERE e.receiver_id = ? ORDER BY e.created_at DESC LIMIT ? OFFSET ?', 
          [req.cookies.userId, limit, offset]
      );
      const [totalEmails] = await pool.query('SELECT COUNT(*) as count FROM emails WHERE receiver_id = ?', [req.cookies.userId]);
      const totalPages = Math.ceil(totalEmails[0].count / limit);
      const prevPage = page > 1 ? page - 1 : null;
      const nextPage = page < totalPages ? page + 1 : null;

      const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const pageNum = i + 1 + Math.max(0, page - 3);
          return pageNum <= totalPages && pageNum > 0 ? pageNum : null;
      }).filter(num => num); 

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
          pages,
          page 
      });
  } catch (error) {
      console.error(error);
      res.clearCookie('loggedIn');
      res.clearCookie('userId');
      res.status(500).render('signin', { errorMessage: 'An error occurred, please login again.' });
  }
});






app.get('/compose', async (req, res) => {
  if (!req.cookies.loggedIn) {
    return res.status(403).render('access_denied');
  }
  const [users] = await pool.query('SELECT id, fullname, email FROM users WHERE id != ?', [req.cookies.userId]);

  const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]);

  res.render('compose', {
    users,
    loggedIn: req.cookies.loggedIn,
    userFullname: user[0].fullname, 
  });
});



app.get('/outbox', async (req, res) => {
  if (!req.cookies.loggedIn) {
      return res.status(403).render('access_denied');
  }

  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;

  try {
      const [emails] = await pool.query(
          'SELECT e.id, u.fullname AS receiver, e.subject, e.created_at FROM emails e JOIN users u ON e.receiver_id = u.id WHERE e.sender_id = ? ORDER BY e.created_at DESC LIMIT ? OFFSET ?', 
          [req.cookies.userId, limit, offset]
      );
      const [totalEmails] = await pool.query('SELECT COUNT(*) as count FROM emails WHERE sender_id = ?', [req.cookies.userId]);
      const totalPages = Math.ceil(totalEmails[0].count / limit);
      const prevPage = page > 1 ? page - 1 : null;
      const nextPage = page < totalPages ? page + 1 : null;

      const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const pageNum = i + 1 + Math.max(0, page - 3);
          return pageNum <= totalPages && pageNum > 0 ? pageNum : null;
      }).filter(num => num); 

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
          pages,
          page 
      });
  } catch (error) {
      console.error(error);
      res.clearCookie('loggedIn');
      res.clearCookie('userId');
      res.status(500).render('signin', { errorMessage: 'An error occurred, please login again.' });
  }
});


app.get('/email/:id', async (req, res) => {
  const emailId = req.params.id;

  if (!req.cookies.loggedIn) {
    return res.status(403).render('access_denied');
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

app.get('/logout', (req, res) => {
  res.clearCookie('loggedIn');
  res.clearCookie('userId');
  res.redirect('/');
});
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});


app.delete('/delete-emails', async (req, res) => {
  if (!req.cookies.loggedIn) {
      return res.status(403).json({ message: 'Access denied' });
  }

  const emailIds = req.body.ids;

  try {
      const [result] = await pool.query('DELETE FROM emails WHERE id IN (?) AND receiver_id = ?', [emailIds, req.cookies.userId]);

      if (result.affectedRows > 0) {
          return res.status(200).json({ message: 'Emails deleted successfully.' });
      } else {
          return res.status(404).json({ message: 'Emails not found.' });
      }
  } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'An error occurred while deleting emails.' });
  }
});

app.delete('/delete-emails-outbox', async (req, res) => {
  if (!req.cookies.loggedIn) {
      return res.status(403).json({ message: 'Access denied' });
  }

  const emailIds = req.body.ids;

  try {
      const [result] = await pool.query('DELETE FROM emails WHERE id IN (?) AND sender_id = ?', [emailIds, req.cookies.userId]);

      if (result.affectedRows > 0) {
          return res.status(200).json({ message: 'Emails deleted successfully.' });
      } else {
          return res.status(404).json({ message: 'Emails not found.' });
      }
  } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'An error occurred while deleting emails.' });
  }
});

app.post('/compose', upload.single('attachment'), async (req, res) => {
  const { recipient, subject, body } = req.body;
  console.log(req.body)
  console.log('File upload info:', req.file); 

  const attachment = req.file ? req.file.filename : null;
  if (!recipient) {
      const [users] = await pool.query('SELECT id, fullname, email FROM users WHERE id != ?', [req.cookies.userId]);
      const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]);
      return res.render('compose', {
          errorMessage: 'Please select a recipient.',
          users,
          loggedIn: req.cookies.loggedIn,
          userFullname: user[0]?.fullname
      });
  }

  try {
      const [result] = await pool.query(
          'INSERT INTO emails (sender_id, receiver_id, subject, body, attachment) VALUES (?, ?, ?, ?, ?)', 
          [req.cookies.userId, recipient, subject || null, body || null, attachment]
      );

      const [users] = await pool.query('SELECT id, fullname, email FROM users WHERE id != ?', [req.cookies.userId]);
      const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]);

      if (result.affectedRows > 0) {
          return res.render('compose', { 
              successMessage: 'Email sent successfully!', 
              users,
              loggedIn: req.cookies.loggedIn,
              userFullname: user[0]?.fullname 
          });
      } else {
          return res.render('compose', { 
              errorMessage: 'Failed to send email. Please try again.', 
              users,
              loggedIn: req.cookies.loggedIn,
              userFullname: user[0]?.fullname 
          });
      }
  } catch (error) {
      console.error(error);
      const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]);
      return res.render('compose', { 
          errorMessage: 'An error occurred while sending the email. Please try again.', 
          users,
          loggedIn: req.cookies.loggedIn,
          userFullname: user[0]?.fullname
      });
  }
});

app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = 'uploads/' + filename;
  console.log(filepath+filename);

  res.download(filepath, filename, (err) => {
      if (err) {
          res.status(404).send('File not found');
      }
  });
});
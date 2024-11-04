// <!-- route.js -->// 

const express = require('express');
const { pool } = require('../dbsetup');
const router = express.Router();
const multer = require('multer');
module.exports = router;

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  });
  const upload = multer({ storage });
  
router.get('/', (req, res) => {
  if (req.cookies.loggedIn) {
    return res.redirect('/inbox'); 
  }
  res.render('signin');
});

router.post('/login', async (req, res) => {
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


router.get('/signup', (req, res) => {
  if (req.cookies.loggedIn) {
    return res.redirect('/inbox');
  }
  res.render('signup');
});

router.post('/register', async (req, res) => {
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


router.get('/inbox', async (req, res) => {
    if (!req.cookies.loggedIn) {
        return res.status(403).render('access_denied');
    }
  
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;
  
    try {
        // Truy vấn email từ cơ sở dữ liệu, bao gồm cả body và subject với COALESCE
        const [emails] = await pool.query(
            `SELECT e.id, 
                    u.fullname AS sender, 
                    COALESCE(e.subject, 'No subject') AS subject, 
                    COALESCE(e.body, 'No body') AS body,
                    e.created_at 
             FROM emails e 
             JOIN users u ON e.sender_id = u.id 
             WHERE e.receiver_id = ? 
             ORDER BY e.created_at DESC 
             LIMIT ? OFFSET ?`, 
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



router.get('/compose', async (req, res) => {
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



router.get('/outbox', async (req, res) => {
    if (!req.cookies.loggedIn) {
        return res.status(403).render('access_denied');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    try {
        // Truy vấn email từ cơ sở dữ liệu, bao gồm cả body và subject với COALESCE
        const [emails] = await pool.query(
            `SELECT e.id, 
                    u.fullname AS receiver, 
                    COALESCE(e.subject, 'No subject') AS subject, 
                    COALESCE(e.body, 'No body') AS body, 
                    e.created_at 
             FROM emails e 
             JOIN users u ON e.receiver_id = u.id 
             WHERE e.sender_id = ? 
             ORDER BY e.created_at DESC 
             LIMIT ? OFFSET ?`, 
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


router.get('/email/:id', async (req, res) => {
    const emailId = req.params.id;
  
    // Kiểm tra xem người dùng đã đăng nhập chưa
    if (!req.cookies.loggedIn) {
      return res.status(403).render('access_denied');
    }
  
    try {
      // Thực hiện truy vấn để lấy thông tin email
      const [emails] = await pool.query(
        `SELECT emails.*, 
                users.fullname AS sender_name, 
                COALESCE(emails.body, 'no body') AS body, 
                COALESCE(emails.subject, 'no subject') AS subject
         FROM emails 
         JOIN users ON emails.sender_id = users.id 
         WHERE emails.id = ? AND (emails.receiver_id = ? OR emails.sender_id = ?)`,
        [emailId, req.cookies.userId, req.cookies.userId]
      );
  
      // Kiểm tra xem email có tồn tại không
      if (emails.length === 0) {
        return res.status(404).render('error', { message: 'Email not found or you do not have permission to view it.' });
      }
  
      // Lấy email đầu tiên từ kết quả
      const email = emails[0];
  
      // Lấy thông tin người dùng
      const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.cookies.userId]);
  
      // Kiểm tra xem người dùng có tồn tại không
      if (!user || user.length === 0) {
        return res.status(404).render('error', { message: 'User not found. Please login again.' });
      }
  
      // Render trang chi tiết email
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




router.post('/compose', upload.single('attachment'), async (req, res) => {
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

router.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = 'uploads/' + filename;
  console.log(filepath+filename);

  res.download(filepath, filename, (err) => {
      if (err) {
          res.status(404).send('File not found');
      }
  });
});
router.delete('/delete-emails', async (req, res) => {
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
  
  router.delete('/delete-emails-outbox', async (req, res) => {
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

  router.get('/logout', (req, res) => {
    res.clearCookie('loggedIn');
    res.clearCookie('userId');
    res.redirect('/');
  });

  
  
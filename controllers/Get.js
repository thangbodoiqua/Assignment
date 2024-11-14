const { pool } = require('../dbsetup');

 
const down = async (req, res) =>{
    const filename = req.params.filename;
  const filepath = 'uploads/' + filename;

  res.download(filepath, filename, (err) => {
      if (err) {
          res.status(404).send('File not found');
      }
  });
};

const home = async (req, res) =>{
    if (req.cookies.loggedIn) {
      return res.redirect('/inbox'); 
    }
    res.render('signin');
  };
 
  const signup = async (req, res) =>{
        if (req.cookies.loggedIn) {
          return res.redirect('/inbox');
        }
        res.render('signup');
  };

  const signin = async (req, res) =>{
    if (req.cookies.loggedIn) {``
        return res.redirect('/inbox');
      }
      res.render('signin');

  };
  
  const inbox = async (req, res) => {
    if (!req.cookies.loggedIn) {
        return res.status(403).render('access_denied');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    try {
        const [emails] = await pool.query(
            `SELECT e.id, 
                    u.fullname AS sender, 
                    e.subject,
                    e.body,
                    e.created_at 
             FROM emails e 
             JOIN users u ON e.sender_id = u.id 
             WHERE e.receiver_id = ? 
             AND e.isDeletedByReceiver = 0
             ORDER BY e.created_at DESC 
             LIMIT ? OFFSET ?`, 
            [req.cookies.userId, limit, offset]
        );

        const [totalEmails] = await pool.query(
            'SELECT COUNT(*) as count FROM emails WHERE receiver_id = ? AND isDeletedByReceiver = 0', 
            [req.cookies.userId]
        );

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
        res.clearCookie('loggedIn');
        res.clearCookie('userId');
        res.status(500).render('signin', { errorMessage: 'An error occurred, please login again.' });
    }
};
  
  const compose = async (req, res) => {
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
  };

  const outbox = async (req, res) => {
    if (!req.cookies.loggedIn) {
        return res.status(403).render('access_denied');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    try {
  
        const [emails] = await pool.query(
            `SELECT e.id, 
                    u.fullname AS receiver, 
                    e.subject, 
                    e.body, 
                    e.created_at 
             FROM emails e 
             JOIN users u ON e.receiver_id = u.id 
             WHERE e.sender_id = ? 
             AND e.isDeletedBySender = 0
             ORDER BY e.created_at DESC 
             LIMIT ? OFFSET ?`, 
            [req.cookies.userId, limit, offset] 
        );
        const [totalEmails] = await pool.query(
            'SELECT COUNT(*) as count FROM emails WHERE sender_id = ? AND isDeletedBySender = 0', 
            [req.cookies.userId] 
        );

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
        res.clearCookie('loggedIn');
        res.clearCookie('userId');
        res.status(500).render('signin', { errorMessage: 'An error occurred, please login again.' });
    }
};

const email = async (req, res) => {
  if (!req.cookies.loggedIn) {
      return res.status(403).render('access_denied');
  }
  const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [req.cookies.userId]);

  try {
      const [emails] = await pool.query(
          `SELECT e.*, u.fullname AS sender_name
           FROM emails e
           JOIN users u ON e.sender_id = u.id
           WHERE e.id = ? AND (e.receiver_id = ? OR e.sender_id = ?)`,
          [req.params.id, req.cookies.userId, req.cookies.userId]
      );

      res.render('email_detail', { 
          email: emails[0],
          loggedIn: req.cookies.loggedIn,
          userFullname: user[0].fullname
      });

  } catch (error) {
    res.clearCookie('loggedIn');
    res.clearCookie('userId');
    res.status(500).render('signin', { errorMessage: 'An error occurred, please login again.' });
  }
};
  
  const signout = (req, res) => {
    res.clearCookie('loggedIn');
    res.clearCookie('userId');
    res.render('signin', {
      successMessage: 'You have been logged out!'
    });
  };

module.exports = {down, home, signup, signin, inbox, compose, outbox, email, signout}

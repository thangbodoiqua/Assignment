const { pool } = require('../dbsetup');

const signin = async (req, res) =>{
    const { email, password } = req.body;
    try {
        const [[user]] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (user) {
            if (user.password === password) {
                res.cookie('loggedIn', true, { httpOnly: true, maxAge: 100 * 60 * 1000 });
                res.cookie('userId', user.id, { httpOnly: true, maxAge: 100 * 60 * 1000 });
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
};

const signup = async (req, res) =>{
    const { fullname, email, password, confirmPassword } = req.body;
  
    if (password.length < 6) {
        return res.render('signup', { errorMessage: 'Password must more than 6 character', fullname, email });
    }
  
    if (password !== confirmPassword) {
        return res.render('signup', { errorMessage: 'Wrong comfirmed password!', fullname, email });
    }
  
    try {
        const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.render('signup', { errorMessage: 'Existed email', fullname});
        }
  
        await pool.query('INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)', [fullname, email, password]);
  
        return res.render('signin', { successMessage: 'Registration successful!' });
    } catch (error) {
        return res.render('signup', { errorMessage: 'An error occured!'});
    }
  };
  
  const compose = async (req, res) => {
    const { recipient, subject, body } = req.body;
    const attachment = req.file ? req.file.filename : null;
    const userId = req.cookies.userId;

    // Lấy danh sách users
    const [users] = await pool.query('SELECT id, fullname, email FROM users WHERE id != ?', [userId]);
    const [user] = await pool.query('SELECT fullname FROM users WHERE id = ?', [userId]);

    if (!recipient) {
        return res.render('compose', {
            errorMessage: 'You must select a recipient',
            users,
            loggedIn: req.cookies.loggedIn,
            userFullname: user[0]?.fullname
        });
    }
  
    try {
        // Xử lý subject và body rỗng
        const emailSubject = subject?.trim() || 'No subject';
        const emailBody = body?.trim() || 'No body';

        const [result] = await pool.query(
            'INSERT INTO emails (sender_id, receiver_id, subject, body, attachment) VALUES (?, ?, ?, ?, ?)', 
            [userId, recipient, emailSubject, emailBody, attachment]
        );
  
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
        return res.render('compose', { 
            errorMessage: 'An error occurred while sending the email. Please try again.', 
            users,
            loggedIn: req.cookies.loggedIn,
            userFullname: user[0]?.fullname
        });
    }
};


module.exports = {signin, signup, compose};

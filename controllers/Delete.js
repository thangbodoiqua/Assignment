const { pool } = require('../dbsetup');

const inbox = async (req, res) => {
    if (!req.cookies.loggedIn) {
        return res.status(403).render('access_denied');
    }

    const emailIds = req.body.ids; 

    try {
        const [updateResult] = await pool.query(
            'UPDATE emails SET isDeletedByReceiver = 1 WHERE id IN (?) AND receiver_id = ?',
            [emailIds, req.cookies.userId]
        );

        if (updateResult.affectedRows > 0) {
            const [deleteResult] = await pool.query(
                'DELETE FROM emails WHERE id IN (?) AND isDeletedBySender = 1 AND isDeletedByReceiver = 1',
                [emailIds]
            );
            return res.sendStatus(200);
        } else {
            return res.sendStatus(404);
        }
    } catch (error) {
        return res.sendStatus(500);
    }
};
const outbox = async (req, res) => {
    if (!req.cookies.loggedIn) {
        return res.status(403).render('access_denied');
    }

    const emailIds = req.body.ids; 

    try {
        const [updateResult] = await pool.query(
            'UPDATE emails SET isDeletedBySender = 1 WHERE id IN (?) AND sender_id = ?',
            [emailIds, req.cookies.userId]
        );

        if (updateResult.affectedRows > 0) {
            const [deleteResult] = await pool.query(
                'DELETE FROM emails WHERE id IN (?) AND isDeletedBySender = 1 AND isDeletedByReceiver = 1',
                [emailIds]
            );
            return res.sendStatus(200);
        } else {
            return res.sendStatus(404);
        }
    } catch (error) {
        return res.sendStatus(500);
    }
};

module.exports = { inbox, outbox };
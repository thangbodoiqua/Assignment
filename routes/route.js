// <!-- route.js -->// 
const express = require('express');
const router = express.Router();
module.exports = router;
const upload = require('../index.js')

//controllers:
const postFs = require('../controllers/Post.js');
const getFs = require('../controllers/Get.js');
const deleteFs = require('../controllers/Delete.js');

//post
router.post('/login', postFs.signin);
router.post('/signup', postFs.signup);
router.post('/compose', upload.single('attachment'), postFs.compose);
//get
router.get('/', getFs.home);
router.get('/signup', getFs.signup);
router.get('/signin', getFs.signin);
router.get('/inbox', getFs.inbox);
router.get('/compose', getFs.compose);
router.get('/outbox', getFs.outbox);
router.get('/logout', getFs.signout);
router.get('/email/:id', getFs.email);
router.get('/uploads/:filename', getFs.down);
//delete
router.delete('/delete-emails', deleteFs.inbox);
router.delete('/delete-emails-outbox', deleteFs.outbox);









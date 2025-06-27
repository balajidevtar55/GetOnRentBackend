const express = require('express');
const router = express.Router();
const userController = require('../controllers/usercontroller');
const verifyJWT = require('../middleware/verifyJWT');

// Authentication
router.post('/users/login', userController.loginWithPassword);
router.get('/users/userInfo',verifyJWT, userController.userInfo);

// Registration
router.get('/', (req, res) => {
    res.send('Hello World!');
  });



module.exports = router;
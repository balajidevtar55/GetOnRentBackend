const express = require('express');
const itemTypeController = require('../controllers/itemtypes');
const router = express.Router();   

router.post('/itemtypes/create',itemTypeController.addItemType );
router.get('/itemtypes', itemTypeController.getItemType );
module.exports = router;  
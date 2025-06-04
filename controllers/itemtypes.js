const fs = require('fs');
const itemTypes = require('../models/itemtype');


const itemTypeController = {
  addItemType: async (req, res) => {
    try {
      const { name,categoryId, subCategoryId } = req.body;
      const newItemType = new itemTypes({
        name,
        subCategoryId,
        categoryId
      });

      await newItemType.save();

      res.status(201).json({ message: 'Item Type created successfully!', data: newItemType });
    } catch (error) {
      console.error('Error uploading item Type:', error);
      res.status(500).json({ message: 'An error occurred while creating the item Type.' });
    }
  },

  getItemType: async (req, res) => {
    try {
      var subCategoryIdId = req.query.subCategoryIdId||null; 
      const newItemType= await itemTypes.find().where('subCategoryIdId',subCategoryIdId);

      res.status(201).json({ message: 'item Type List!', data: newItemType });
    } catch (error) {
      console.error('Error listing item Type', error);
      res.status(500).json({ message: 'An error occurred while creating the item Type.' });
    }
  },
};



module.exports = itemTypeController;

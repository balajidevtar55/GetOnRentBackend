const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

// Define the schema
const itemTypeSchema = new mongoose.Schema({
  _id: Number, // Auto-incremented ID
  name: {
    type: String,
    required: true,
  },
  subCategoryId: {
    type: Number,
    required: true,
  },
  categoryId:{
    type: Number,
    required: true,
  }
}, { _id: false }); // Disable default _id as we are using our custom ID

// Apply auto-increment plugin to the schema
itemTypeSchema.plugin(AutoIncrement, { id: 'itemType_id_counter', inc_field: '_id' });

// Create the model
const itemTypes = mongoose.model('itemTypes', itemTypeSchema);

module.exports = itemTypes;

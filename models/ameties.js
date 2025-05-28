const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

// Define the schema
const AmetiesSchema = new mongoose.Schema({
  _id: Number, // Auto-incremented ID
  name: {
    type: String,
    required: true,
  }
}, { _id: false }); // Disable default _id as we are using our custom ID

// Apply auto-increment plugin to the schema
AmetiesSchema.plugin(AutoIncrement, { id: 'ameties_id_counter', inc_field: '_id' });

// Create the model
const Ameties = mongoose.model('Ameties', AmetiesSchema);

module.exports = Ameties;

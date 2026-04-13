const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  latitude: { type: Number, default: 0 },
  longitude: { type: Number, default: 0 }
});

module.exports = mongoose.model('College', collegeSchema);

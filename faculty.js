const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  college: String,
  phone: String,
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Faculty', facultySchema);
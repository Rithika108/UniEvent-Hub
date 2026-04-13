const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Student', 'Faculty', 'Admin', 'Member'], default: 'Member' },
  phone: { type: String, default: '' },
  location: { type: String, default: '' },
  followedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  registeredEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  followers: { type: Number, default: 0 },
  connections: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);

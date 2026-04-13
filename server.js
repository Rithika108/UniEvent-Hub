const express = require('express');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const Student = require('./models/student');
const Faculty = require('./models/faculty');
const User = require('./models/user');
const Event = require('./models/event');
const College = require('./models/college');
const seedEvents = require('./events.json');

const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'UniEventHub2026SecretKey';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/unievent';
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'UniEventHub2026Session',
  resave: false,
  saveUninitialized: false
}));
app.use(express.static(__dirname));

// ---------- Authentication Helpers ----------
function createToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

async function syncAppUser({ name, email, password, role, phone = '', location = '' }) {
  if (!email || !name || !password) {
    throw new Error('Missing user fields for sync');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    let updated = false;
    if (existingUser.name !== name) {
      existingUser.name = name;
      updated = true;
    }
    if (existingUser.role !== role) {
      existingUser.role = role;
      updated = true;
    }
    if (existingUser.password !== password) {
      existingUser.password = password;
      updated = true;
    }
    if (existingUser.phone !== phone) {
      existingUser.phone = phone;
      updated = true;
    }
    if (existingUser.location !== location) {
      existingUser.location = location;
      updated = true;
    }
    if (updated) {
      await existingUser.save();
    }
    return existingUser;
  }

  return await User.create({
    name,
    email,
    password,
    role,
    phone,
    location,
    followedEvents: [],
    registeredEvents: [],
    followers: 0,
    connections: 0
  });
}

function getAuthToken(req) {
  const authHeader = req.headers.authorization || req.body.token || req.query.token;
  if (!authHeader) return null;
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
}

async function authenticateUser(req, res, next) {
  if (req.session && req.session.user) {
    const appUser = await User.findOne({ email: req.session.user.email });
    if (!appUser) {
      return res.status(401).json({ error: 'Authorized user not found' });
    }
    req.user = appUser;
    return next();
  }

  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const appUser = await User.findById(decoded.id);
    if (!appUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = appUser;
    next();
  });
}

function buildRegistrationLinkFromTitle(title) {
  const slug = String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `https://unieventhub.com/register/${slug}`;
}

async function seedInitialData() {
  const collegeCount = await College.countDocuments();
  if (collegeCount === 0) {
    await College.create([
      {
        name: 'Stellar University',
        city: 'Bengaluru',
        state: 'Karnataka',
        latitude: 12.9716,
        longitude: 77.5946
      },
      {
        name: 'Horizon Institute',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.5204,
        longitude: 73.8567
      },
      {
        name: 'Unity College',
        city: 'Chennai',
        state: 'Tamil Nadu',
        latitude: 13.0827,
        longitude: 80.2707
      }
    ]);
    console.log('✅ Seeded initial colleges');
  }

  const eventCount = await Event.countDocuments();
  if (eventCount === 0) {
    const normalizedSeedEvents = seedEvents.map(event => ({
      ...event,
      date: new Date(event.date),
      category: event.category || event.type || 'General',
      registrationLink: event.registrationLink || buildRegistrationLinkFromTitle(event.title)
    }));
    await Event.create(normalizedSeedEvents);
    console.log('✅ Seeded initial events from events.json');
  } else {
    for (const seedEvent of seedEvents) {
      const existing = await Event.findOne({ title: seedEvent.title });
      if (existing) {
        const shouldUpdateLink = !existing.registrationLink || existing.registrationLink === null || existing.registrationLink === '' || /example\.com\/register/.test(existing.registrationLink);
        if (shouldUpdateLink) {
          existing.registrationLink = seedEvent.registrationLink || buildRegistrationLinkFromTitle(seedEvent.title);
          await existing.save();
          console.log(`✅ Updated registrationLink for ${existing.title}`);
        }
      } else {
        await Event.create({
          ...seedEvent,
          date: new Date(seedEvent.date),
          category: seedEvent.category || seedEvent.type || 'General',
          registrationLink: seedEvent.registrationLink || buildRegistrationLinkFromTitle(seedEvent.title)
        });
        console.log(`✅ Created missing seeded event ${seedEvent.title}`);
      }
    }
  }
}

// ---------- API Routes ----------
app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 }).lean();
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Unable to fetch events' });
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Unable to fetch event' });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const {
      title,
      description,
      college,
      date,
      location,
      latitude,
      longitude,
      category,
      type,
      registrationLink
    } = req.body;

    if (!title || !college || !date || !location) {
      return res.status(400).json({ error: 'Title, college, date, and location are required.' });
    }

    const event = await Event.create({
      title,
      description: description || '',
      college,
      date,
      location,
      registrationLink: registrationLink || buildRegistrationLinkFromTitle(title),
      latitude: latitude ? Number(latitude) : 0,
      longitude: longitude ? Number(longitude) : 0,
      category: category || type || 'General'
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Unable to create event' });
  }
});

app.get('/api/colleges', async (req, res) => {
  try {
    const colleges = await College.find().sort({ name: 1 });
    res.json(colleges);
  } catch (error) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({ error: 'Unable to fetch colleges' });
  }
});

app.post('/api/follow/:eventId', authenticateUser, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const user = req.user;
    if (!user.followedEvents) user.followedEvents = [];

    const alreadyFollowing = user.followedEvents.some(
      eventId => eventId.toString() === event._id.toString()
    );

    if (alreadyFollowing) {
      return res.json({ success: true, message: 'Already following this event', followedEvents: user.followedEvents });
    }

    user.followedEvents.push(event._id);
    await user.save();

    res.json({ success: true, message: 'Event followed successfully', followedEvents: user.followedEvents });
  } catch (error) {
    console.error('Error following event:', error);
    res.status(500).json({ error: 'Unable to follow event' });
  }
});

app.post('/api/register/:eventId', authenticateUser, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const user = req.user;
    if (!user.registeredEvents) user.registeredEvents = [];

    const alreadyRegistered = user.registeredEvents.some(
      eventId => eventId.toString() === event._id.toString()
    );

    if (alreadyRegistered) {
      return res.json({ success: true, message: 'Already registered for this event', registeredEvents: user.registeredEvents });
    }

    user.registeredEvents.push(event._id);
    await user.save();

    res.json({ success: true, message: 'Registered successfully', registeredEvents: user.registeredEvents, registrationLink: event.registrationLink });
  } catch (error) {
    console.error('Error registering event:', error);
    res.status(500).json({ error: 'Unable to register for event' });
  }
});

app.get('/api/user', authenticateUser, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('registeredEvents')
    .populate('followedEvents')
    .lean();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  delete user.password;

  const eventsAttended = Array.isArray(user.registeredEvents) ? user.registeredEvents.length : 0;
  const followers = user.followers || (Array.isArray(user.followedEvents) ? user.followedEvents.length * 2 : 0);
  const connections = user.connections || Math.max(8, eventsAttended + 3);

  res.json({
    user: {
      ...user,
      eventsAttended,
      followers,
      connections,
      registeredEvents: user.registeredEvents || [],
      followedEvents: user.followedEvents || []
    }
  });
});

app.get('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ============ STUDENT SIGNUP ============
app.post('/api/student-signup', async (req, res) => {
  const { name, college, dob, phone, email, department, yearOfPassout, password, confirmPassword } = req.body;

  try {
    if (!name || !phone || !email || !password) {
      return res.status(400).json({ error: 'Fill all required fields' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (phone.length !== 10 || isNaN(phone)) {
      return res.status(400).json({ error: 'Phone must be 10 digits' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    let existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const student = new Student({
      name,
      college,
      dob: dob || null,
      phone,
      email,
      password: hashedPassword,
      department: department || '',
      yearOfPassout: yearOfPassout || null
    });

    await student.save();
    await syncAppUser({ name, email, password: hashedPassword, role: 'Student', phone, location: college || '' });

    console.log(`✅ Student ${email} registered successfully`);
    res.json({ success: true, message: 'Signup successful! Please login.' });
  } catch (err) {
    console.error('❌ Signup error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ============ STUDENT LOGIN ============
app.post('/api/student-login', async (req, res) => {
  const { email, password } = req.body;

  console.log('🔍 STUDENT LOGIN ATTEMPT:');

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(400).json({ error: 'Email not registered' });
    }

    const isPasswordValid = await bcrypt.compare(password, student.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const appUser = await syncAppUser({ name: student.name, email: student.email, password: student.password, role: 'Student', phone: student.phone, location: student.college || '' });
    const token = createToken(appUser);

    req.session.user = {
      id: student._id,
      name: student.name,
      email: student.email,
      role: 'Student'
    };

    res.json({ success: true, user: req.session.user, token });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============ FACULTY SIGNUP ============
app.post('/api/faculty-signup', async (req, res) => {
  const { name, college, phone, email, password, confirmPassword } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Fill all required fields' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    let existingFaculty = await Faculty.findOne({ email });
    if (existingFaculty) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const faculty = new Faculty({
      name,
      college: college || '',
      phone: phone || '',
      email,
      password: hashedPassword
    });

    await faculty.save();
    await syncAppUser({ name, email, password: hashedPassword, role: 'Faculty', phone: phone || '', location: college || '' });

    console.log(`✅ Faculty ${email} registered successfully`);
    res.json({ success: true, message: 'Signup successful! Please login.' });
  } catch (err) {
    console.error('❌ Signup error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ============ FACULTY LOGIN ============
app.post('/api/faculty-login', async (req, res) => {
  const { email, password } = req.body;

  console.log('🔍 FACULTY LOGIN ATTEMPT:');

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const faculty = await Faculty.findOne({ email });
    if (!faculty) {
      return res.status(400).json({ error: 'Email not registered' });
    }

    const isPasswordValid = await bcrypt.compare(password, faculty.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const appUser = await syncAppUser({ name: faculty.name, email: faculty.email, password: faculty.password, role: 'Faculty', phone: faculty.phone || '', location: faculty.college || '' });
    const token = createToken(appUser);

    req.session.user = {
      id: faculty._id,
      name: faculty.name,
      email: faculty.email,
      role: 'Faculty'
    };

    res.json({ success: true, user: req.session.user, token });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');
    await seedInitialData();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => console.error('❌ MongoDB Connection Error:', err));


// ============ DEBUG ROUTES ============
// Check MongoDB connection
app.get('/api/debug/connection', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    mongodb: isConnected ? 'connected' : 'disconnected',
    readyState: mongoose.connection.readyState
  });
});

// List all users (for debugging only - remove in production)
app.get('/api/debug/users', async (req, res) => {
  try {
    const students = await Student.find({}, 'name email role');
    const faculty = await Faculty.find({}, 'name email role');
    res.json({
      students: students.map(s => ({ ...s.toObject(), role: 'Student' })),
      faculty: faculty.map(f => ({ ...f.toObject(), role: 'Faculty' }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// HOME ROUTE
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});
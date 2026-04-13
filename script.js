const floatingBtn = document.getElementById('add-event-btn');
const modal = document.getElementById('add-event-modal');
const modalClose = document.getElementById('modal-close');
const eventForm = document.getElementById('event-form');
const baseURL = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

let currentUser = null;
let currentEvents = [];
let currentColleges = [];
let mapInstance = null;
let mapMarkers = [];
let googleMapLoaded = false;
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function showNotification(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.padding = '12px 18px';
  toast.style.background = 'rgba(0, 0, 0, 0.85)';
  toast.style.color = '#fff';
  toast.style.borderRadius = '10px';
  toast.style.fontSize = '14px';
  toast.style.zIndex = '9999';
  toast.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.25)';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function normalizeRegistrationLink(link) {
  if (!link || typeof link !== 'string') return '';
  const trimmed = link.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('www.')) {
    return `https://${trimmed}`;
  }
  return '';
}

function handleRegister(link) {
  const normalizedLink = normalizeRegistrationLink(link);
  console.log('handleRegister called with link:', link, 'normalized:', normalizedLink);
  if (normalizedLink) {
    window.open(normalizedLink, '_blank');
  } else {
    alert('Invalid or missing registration link');
  }
}

async function loadUser() {
  try {
    const response = await fetch(`${baseURL}/api/user`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await response.json();
    currentUser = data.user || JSON.parse(localStorage.getItem('user'));

    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }

    updateSidebarStats();
    updateProfileUI();
    renderNotifications();

    const nameEl = document.querySelector('.sidebar-name');
    const roleEl = document.querySelector('.sidebar-role');
    const avatarEl = document.querySelector('.sidebar-avatar');
    if (nameEl) nameEl.textContent = currentUser.name || 'User';
    if (roleEl) roleEl.textContent = currentUser.role || 'Member';
    if (avatarEl) avatarEl.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
  } catch (error) {
    console.error('Error loading user:', error);
    const savedUser = JSON.parse(localStorage.getItem('user'));
    if (savedUser) {
      currentUser = savedUser;
      updateSidebarStats();
      updateProfileUI();
    } else {
      window.location.href = 'login.html';
    }
  }
}

async function refreshCurrentUser() {
  try {
    const response = await fetch(`${baseURL}/api/user`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    if (!response.ok) return;
    const data = await response.json();
    currentUser = data.user || currentUser;
    updateSidebarStats();
    updateProfileUI();
    renderNotifications();
  } catch (error) {
    console.error('Error refreshing user:', error);
  }
}

function updateSidebarStats() {
  const likedCount = document.getElementById('liked-count');
  const registeredCount = document.getElementById('registered-count');
  const messagesCount = document.getElementById('messages-count');

  if (likedCount) likedCount.textContent = currentUser?.followedEvents?.length ? currentUser.followedEvents.length : '0';
  if (registeredCount) registeredCount.textContent = currentUser?.registeredEvents?.length ? currentUser.registeredEvents.length : '0';
  if (messagesCount) messagesCount.textContent = '3';
}

function updateProfileUI() {
  if (!currentUser) return;

  const avatarEl = document.getElementById('profile-avatar');
  const nameEl = document.getElementById('profile-name');
  const headlineEl = document.getElementById('profile-headline');
  const eventsEl = document.getElementById('profile-events');
  const followersEl = document.getElementById('profile-followers');
  const connectionsEl = document.getElementById('profile-connections');
  const emailEl = document.getElementById('profile-email');
  const phoneEl = document.getElementById('profile-phone');
  const locationEl = document.getElementById('profile-location');

  if (avatarEl) avatarEl.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
  if (nameEl) nameEl.textContent = currentUser.name || 'User Name';
  if (headlineEl) headlineEl.textContent = currentUser.location ? `${currentUser.role} at ${currentUser.location}` : currentUser.role || 'Member';
  if (eventsEl) eventsEl.textContent = currentUser.eventsAttended ?? currentUser.registeredEvents?.length ?? '0';
  if (followersEl) followersEl.textContent = currentUser.followers ?? currentUser.followedEvents?.length ?? '0';
  if (connectionsEl) connectionsEl.textContent = currentUser.connections ?? Math.max(8, (currentUser.registeredEvents?.length ?? 0) + 3);
  if (emailEl) emailEl.textContent = currentUser.email || 'email@example.com';
  if (phoneEl) phoneEl.textContent = currentUser.phone || 'Not set';
  if (locationEl) locationEl.textContent = currentUser.location || 'Location not set';
}

function renderNotifications() {
  const notificationsContainer = document.getElementById('notifications-list');
  if (!notificationsContainer) return;

  const notifications = [];
  if (Array.isArray(currentUser?.registeredEvents) && currentUser.registeredEvents.length) {
    currentUser.registeredEvents.forEach(event => {
      notifications.push({
        icon: '✅',
        title: `You registered for ${event.title}`,
        message: `Registration confirmed for ${event.college}.`,
        time: 'Just now'
      });
    });
  }

  const nextEvent = currentEvents.find(event => !currentUser?.registeredEvents?.some(reg => reg._id === event._id));
  if (nextEvent) {
    notifications.push({
      icon: '📢',
      title: 'New event added in your interest',
      message: `${nextEvent.title} is scheduled at ${nextEvent.college}.`,
      time: '1 hour ago'
    });
  }

  if (!notifications.length) {
    notificationsContainer.innerHTML = '<div class="empty-state">You have no notifications yet.</div>';
    const badge = document.getElementById('notification-badge');
    if (badge) badge.textContent = '0';
    return;
  }

  const badge = document.getElementById('notification-badge');
  if (badge) badge.textContent = `${notifications.length}`;
  notificationsContainer.innerHTML = '';
  notifications.forEach(item => {
    const row = document.createElement('article');
    row.className = 'notification-item';
    row.innerHTML = `
      <div class="notification-icon">${item.icon}</div>
      <div>
        <h4>${item.title}</h4>
        <p>${item.message}</p>
        <span class="notification-time">${item.time}</span>
      </div>
    `;
    notificationsContainer.appendChild(row);
  });
}

function renderEventListings(events) {
  const eventsContainer = document.getElementById('event-list');
  if (!eventsContainer) return;

  if (!events.length) {
    eventsContainer.innerHTML = '<div class="empty-state">No events found. Please check back later.</div>';
    return;
  }

  eventsContainer.innerHTML = '';
  events.forEach(event => {
    const card = document.createElement('article');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="event-label">${event.category || 'Event'}</div>
      <div class="event-info">
        <h4>${event.title}</h4>
        <p>${event.college}  ${event.location}</p>
        <p class="event-meta">${formatDate(event.date)}</p>
      </div>
      <button class="register-btn" data-event-id="${event._id}">Register</button>
    `;
    eventsContainer.appendChild(card);
  });

  attachRegisterListeners();
}

function renderAllEvents(events) {
  const allEventsContainer = document.getElementById('all-event-list');
  if (!allEventsContainer) return;

  if (!events.length) {
    allEventsContainer.innerHTML = '<div class="empty-state">No events found.</div>';
    return;
  }

  allEventsContainer.innerHTML = '';
  events.forEach(event => {
    const row = document.createElement('article');
    row.className = 'event-row';
    row.innerHTML = `
      <div>
        <h4>${event.title}</h4>
        <p>${event.college}  ${event.location}  ${formatDate(event.date)}</p>
      </div>
      <button class="register-btn small" data-event-id="${event._id}">Register</button>
    `;
    allEventsContainer.appendChild(row);
  });

  attachRegisterListeners();
}

function renderCollegeList(colleges) {
  const collegeContainer = document.getElementById('college-list');
  if (!collegeContainer) return;

  if (!colleges.length) {
    collegeContainer.innerHTML = '<div class="empty-state">No colleges available.</div>';
    return;
  }

  collegeContainer.innerHTML = '';
  colleges.forEach(college => {
    const card = document.createElement('article');
    card.className = 'college-card blue';
    card.innerHTML = `
      <div class="college-tag">${college.city || 'College'}</div>
      <div>
        <h4>${college.name}</h4>
        <p>${college.city}, ${college.state}</p>
      </div>
    `;
    collegeContainer.appendChild(card);
  });
}

function renderMap() {
  const mapContainer = document.getElementById('college-map');
  const listContainer = document.getElementById('map-list');
  if (!mapContainer || !listContainer) return;

  listContainer.innerHTML = '';
  if (currentColleges.length) {
    currentColleges.forEach(college => {
      const item = document.createElement('article');
      item.className = 'small-card';
      const coords = college.latitude != null && college.longitude != null
        ? `${college.latitude.toFixed(2)}, ${college.longitude.toFixed(2)}`
        : 'Coordinates unavailable';
      item.innerHTML = `
        <div class="pin"></div>
        <div>
          <h4>${college.name}</h4>
          <p>${college.city}, ${college.state}</p>
        </div>
        <div class="meta">${coords}</div>
      `;
      listContainer.appendChild(item);
    });
  } else if (currentEvents.length) {
    currentEvents.forEach(event => {
      const item = document.createElement('article');
      item.className = 'small-card';
      item.innerHTML = `
        <div class="pin"></div>
        <div>
          <h4>${event.title}</h4>
          <p>${event.college} · ${event.location}</p>
        </div>
        <div class="meta">${event.latitude?.toFixed(2) ?? 'N/A'}, ${event.longitude?.toFixed(2) ?? 'N/A'}</div>
      `;
      listContainer.appendChild(item);
    });
  } else {
    listContainer.innerHTML = '<div class="empty-state">No map data available.</div>';
    mapContainer.innerHTML = '';
    return;
  }

  const mapTarget = currentEvents[0] || currentColleges[0];
  if (!mapTarget) {
    mapContainer.innerHTML = '<div class="empty-state">No map data available.</div>';
    return;
  }

  const queryParts = [];
  if (mapTarget.college) queryParts.push(mapTarget.college);
  if (mapTarget.location) queryParts.push(mapTarget.location);
  if (mapTarget.city) queryParts.push(mapTarget.city);
  const query = queryParts.length ? queryParts.join(', ') : `${mapTarget.latitude || 11.0211983},${mapTarget.longitude || 76.9945694}`;

  mapContainer.innerHTML = `
    <iframe
      src="https://www.google.com/maps?q=${encodeURIComponent(query)}&z=11&output=embed"
      width="100%"
      height="100%"
      style="border:0; border-radius:28px;"
      allowfullscreen=""
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade">
    </iframe>
  `;
  return;
}

async function loadEvents() {
  const eventsContainer = document.getElementById('event-list');
  const allEventsContainer = document.getElementById('all-event-list');
  if (eventsContainer) eventsContainer.innerHTML = '<div class="empty-state">Loading events...</div>';
  if (allEventsContainer) allEventsContainer.innerHTML = '<div class="empty-state">Loading all events...</div>';

  try {
    const response = await fetch(`${baseURL}/api/events`);
    if (!response.ok) throw new Error('Failed to fetch events');
    currentEvents = await response.json();
    currentEvents.forEach(event => {
      if (!event.registrationLink) {
        console.warn('Event missing registrationLink:', event.title, event._id);
      }
    });
    console.log('Loaded events:', currentEvents);
    renderEventListings(currentEvents);
    renderAllEvents(currentEvents);
    renderNotifications();
    renderMap();
  } catch (error) {
    console.error('Error loading events:', error);
    if (eventsContainer) eventsContainer.innerHTML = '<div class="empty-state">Unable to load events.</div>';
    if (allEventsContainer) allEventsContainer.innerHTML = '<div class="empty-state">Unable to load events.</div>';
  }
}

async function loadColleges() {
  const collegeContainer = document.getElementById('college-list');
  if (collegeContainer) collegeContainer.innerHTML = '<div class="empty-state">Loading colleges...</div>';
  try {
    const response = await fetch(`${baseURL}/api/colleges`);
    if (!response.ok) throw new Error('Failed to fetch colleges');
    currentColleges = await response.json();
    renderCollegeList(currentColleges);
    renderMap();
  } catch (error) {
    console.error('Error loading colleges:', error);
    if (collegeContainer) collegeContainer.innerHTML = '<div class="empty-state">Unable to load colleges.</div>';
  }
}

async function handleEventRegister(eventId) {
  if (!eventId) return;
  const event = currentEvents.find(item => item._id === eventId);
  if (!event) {
    showNotification('Event not found');
    return;
  }

  console.log('Clicked event:', event);
  console.log('Opening link:', event.registrationLink);
  const registrationLink = normalizeRegistrationLink(event.registrationLink);
  if (!registrationLink) {
    showNotification('Registration link unavailable or invalid for this event.');
    return;
  }

  handleRegister(registrationLink);

  try {
    const response = await fetch(`${baseURL}/api/register/${eventId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) {
      console.warn('Event registration API failed:', data.error || response.statusText);
      showNotification(data.error || 'Event registration failed');
      return;
    }
    showNotification('Successfully registered for this event.');
    await refreshCurrentUser();
  } catch (error) {
    console.error('Register error:', error);
  }
}

function attachRegisterListeners() {
  document.querySelectorAll('.register-btn').forEach(btn => {
    const eventId = btn.getAttribute('data-event-id');
    const handler = () => handleEventRegister(eventId);
    btn.removeEventListener('click', btn._registerHandler);
    btn.addEventListener('click', handler);
    btn._registerHandler = handler;
  });
}

async function logout() {
  try {
    const response = await fetch(`${baseURL}/api/logout`, { credentials: 'include' });
    const data = await response.json();
    if (data.success) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    }
  } catch (error) {
    console.error('Logout error:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  }
}

function initMapCallback() {
  googleMapLoaded = true;
  renderMap();
}

floatingBtn?.addEventListener('click', () => modal?.classList.add('show'));
modalClose?.addEventListener('click', () => modal?.classList.remove('show'));
modal?.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
searchBtn?.addEventListener('click', () => {
  const query = searchInput?.value.trim().toLowerCase() || '';
  if (!query) return renderEventListings(currentEvents);
  const filtered = currentEvents.filter(event => {
    return event.title.toLowerCase().includes(query) || event.college.toLowerCase().includes(query) || event.location.toLowerCase().includes(query);
  });
  renderEventListings(filtered);
});

eventForm?.addEventListener('submit', async e => {
  e.preventDefault();
    const title = document.getElementById('event-title').value.trim();
    const college = document.getElementById('event-college').value.trim();
    const location = document.getElementById('event-location').value.trim();
    const date = document.getElementById('event-date').value;
    const description = document.getElementById('event-description').value.trim();
    const registrationLink = document.getElementById('event-registration-link').value.trim();
    const type = document.getElementById('event-type').value;

    if (!registrationLink || !registrationLink.startsWith('http')) {
      showNotification('Please provide a valid registration link.');
      return;
    }

    const eventData = {
      title,
      college,
      location,
      date,
      description,
      category: type || 'General',
      registrationLink
    };

    try {
      const response = await fetch(`${baseURL}/api/events`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(eventData)
      });
    if (!response.ok) throw new Error('Failed to add event');
    eventForm.reset();
    modal?.classList.remove('show');
    await loadEvents();
    showNotification('Event added successfully!');
  } catch (error) {
    console.error('Error adding event:', error);
    showNotification('Unable to add event.');
  }
});

window.initMap = initMapCallback;

document.addEventListener('DOMContentLoaded', async () => {
  await loadUser();
  await loadEvents();
  await loadColleges();
  document.getElementById('logout-btn')?.addEventListener('click', logout);
});

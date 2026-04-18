const floatingBtn = document.getElementById('add-event-btn');
const modal = document.getElementById('add-event-modal');
const modalClose = document.getElementById('modal-close');
const detailModal = document.getElementById('detail-modal');
const detailModalClose = document.getElementById('detail-modal-close');
const detailTitle = document.getElementById('detail-title');
const detailBody = document.getElementById('detail-body');
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

let followedCollegeIds = JSON.parse(localStorage.getItem('followedColleges') || '[]');

function saveFollowedColleges() {
  localStorage.setItem('followedColleges', JSON.stringify(followedCollegeIds));
}

function isCollegeFollowed(collegeId) {
  return followedCollegeIds.includes(collegeId);
}

function toggleCollegeFollow(collegeId) {
  if (!collegeId) return;
  const existingIndex = followedCollegeIds.indexOf(collegeId);
  if (existingIndex === -1) {
    followedCollegeIds.push(collegeId);
    showNotification('College followed.');
  } else {
    followedCollegeIds.splice(existingIndex, 1);
    showNotification('College unfollowed.');
  }
  saveFollowedColleges();
  updateFollowButtons();
}

function updateFollowButtons() {
  document.querySelectorAll('.follow-btn').forEach(btn => {
    const collegeId = btn.getAttribute('data-college-id');
    if (!collegeId) return;
    const isFollowed = isCollegeFollowed(collegeId);
    btn.textContent = isFollowed ? 'Following' : 'Follow';
    btn.classList.toggle('followed', isFollowed);
  });
}

function attachFollowListeners() {
  document.querySelectorAll('.follow-btn').forEach(btn => {
    btn.onclick = () => toggleCollegeFollow(btn.getAttribute('data-college-id'));
  });
}

function performSearch(query) {
  const normalized = String(query || '').trim().toLowerCase();
  const searchResultsContainer = document.getElementById('search-results');
  const collegesResultsContainer = document.getElementById('colleges-search-results');
  const eventsResultsContainer = document.getElementById('events-search-results');

  if (!normalized) {
    searchResultsContainer.style.display = 'none';
    renderEventListings(currentEvents);
    renderCampusPulse();
    return;
  }

  const filteredEvents = currentEvents.filter(event => {
    const searchable = `${event.title || ''} ${event.college || ''} ${event.description || ''} ${event.location || ''} ${event.category || ''}`.toLowerCase();
    return searchable.includes(normalized);
  });

  const filteredColleges = currentColleges.filter(college => {
    const searchable = `${college.name || ''} ${college.city || ''} ${college.state || ''} ${college.description || ''}`.toLowerCase();
    return searchable.includes(normalized);
  });

  // Show results container
  searchResultsContainer.style.display = 'block';

  // Render colleges results
  if (filteredColleges.length > 0) {
    collegesResultsContainer.innerHTML = '<h4>Colleges</h4>';
    const collegesList = document.createElement('div');
    collegesList.className = 'colleges-list';
    filteredColleges.forEach(college => {
      const card = document.createElement('div');
      card.className = 'search-result-card';
      card.innerHTML = `
        <div class="result-content">
          <h5>${college.name}</h5>
          <p>${college.city}, ${college.state}</p>
          <p class="result-desc">${college.description}</p>
        </div>
        <button class="result-action" data-college-id="${college._id}">Follow</button>
      `;
      collegesList.appendChild(card);
    });
    collegesResultsContainer.appendChild(collegesList);
  } else {
    collegesResultsContainer.innerHTML = '<p class="no-results">No colleges found for "' + query + '"</p>';
  }

  // Render events results
  if (filteredEvents.length > 0) {
    eventsResultsContainer.innerHTML = '<h4>Events</h4>';
    const eventsList = document.createElement('div');
    eventsList.className = 'events-list';
    filteredEvents.forEach(event => {
      const card = document.createElement('div');
      card.className = 'search-result-card';
      card.innerHTML = `
        <div class="result-content">
          <h5>${event.title}</h5>
          <p>${event.college} · ${event.location}</p>
          <p class="result-desc">${event.description}</p>
          <p class="result-date">${formatDate(event.date)}</p>
        </div>
        <button class="result-action" data-event-id="${event._id}">Register</button>
      `;
      eventsList.appendChild(card);
    });
    eventsResultsContainer.appendChild(eventsList);
  } else {
    eventsResultsContainer.innerHTML = '<p class="no-results">No events found for "' + query + '"</p>';
  }

  // Attach event handlers to action buttons
  searchResultsContainer.querySelectorAll('.result-action[data-college-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCollegeFollow(btn.getAttribute('data-college-id'));
      const collegeId = btn.getAttribute('data-college-id');
      const isFollowed = isCollegeFollowed(collegeId);
      btn.textContent = isFollowed ? 'Following' : 'Follow';
      btn.classList.toggle('followed', isFollowed);
    });
  });

  searchResultsContainer.querySelectorAll('.result-action[data-event-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const eventId = btn.getAttribute('data-event-id');
      const event = currentEvents.find(e => e._id === eventId);
      if (event) {
        showDetailModal(event.title, getEventDetailHtml(event));
      }
    });
  });
}


function getLiveStudentEvents() {
  const now = new Date();
  return currentEvents.filter(event => {
    const eventDate = new Date(event.date);
    return !Number.isNaN(eventDate.getTime()) && eventDate >= now;
  });
}

function getNearbyOpportunities() {
  const targetCity = (currentUser?.location || 'Coimbatore').toLowerCase();
  const matches = currentEvents.filter(event => {
    return [event.location, event.college]
      .filter(Boolean)
      .some(value => value.toLowerCase().includes(targetCity));
  });
  if (matches.length) return matches;
  return currentEvents.filter(event => event.location?.toLowerCase().includes('coimbatore') || event.college?.toLowerCase().includes('coimbatore'));
}

function openMessageModal(messageElement) {
  if (!messageElement) return;
  const title = messageElement.querySelector('h4')?.textContent?.trim() || 'Message';
  const description = messageElement.querySelector('p')?.textContent?.trim() || 'No message content available.';
  const time = messageElement.querySelector('.message-time')?.textContent?.trim() || '';
  const bodyHtml = `
    <div class="detail-panel">
      <p>${description}</p>
      <ul class="detail-list">
        ${time ? `<li><strong>Received:</strong> ${time}</li>` : ''}
      </ul>
    </div>
  `;
  showDetailModal(title, bodyHtml);
}

function initializeMessageInteractions() {
  document.querySelectorAll('.message-item').forEach(item => {
    item.addEventListener('click', () => openMessageModal(item));
  });
}

function initializeFeatureActions() {
  document.querySelectorAll('.feature-block').forEach(block => {
    block.addEventListener('click', () => {
      const action = block.getAttribute('data-action');
      if (action === 'top-campuses') {
        renderCollegeList(currentColleges.slice(0, 6));
      } else if (action === 'live-events') {
        renderEventListings(getLiveStudentEvents());
        document.getElementById('colleges')?.scrollIntoView({ behavior: 'smooth' });
      } else if (action === 'nearby-opportunities') {
        renderEventListings(getNearbyOpportunities());
        document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

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

    // Show add event button only for logged in users
    const floatingBtn = document.getElementById('add-event-btn');
    if (floatingBtn) floatingBtn.style.display = 'block';
  } catch (error) {
    console.error('Error loading user:', error);
    const savedUser = JSON.parse(localStorage.getItem('user'));
    if (savedUser) {
      currentUser = savedUser;
      updateSidebarStats();
      updateProfileUI();
      const floatingBtn = document.getElementById('add-event-btn');
      if (floatingBtn) floatingBtn.style.display = 'block';
    } else {
      // Hide add event button for non-logged in users
      const floatingBtn = document.getElementById('add-event-btn');
      if (floatingBtn) floatingBtn.style.display = 'none';
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
      <div class="event-image"></div>
      <div class="event-info">
        <h4>${event.title}</h4>
        <p>${event.college}  ${event.location}</p>
        <p class="event-meta">${formatDate(event.date)}</p>
      </div>
      <button class="register-btn" data-event-id="${event._id}">Register</button>
    `;
    const actions = document.createElement('div');
  actions.className = 'event-actions';
  const detailsBtn = document.createElement('button');
  detailsBtn.className = 'details-btn';
  detailsBtn.setAttribute('type', 'button');
  detailsBtn.setAttribute('data-event-id', event._id);
  detailsBtn.textContent = 'Details';

  const registerBtn = card.querySelector('.register-btn');
  if (registerBtn) {
    actions.appendChild(detailsBtn);
    actions.appendChild(registerBtn);
    card.appendChild(actions);
  }

  eventsContainer.appendChild(card);
  });

  attachRegisterListeners();
  attachDetailListeners();
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
    const actions = document.createElement('div');
    actions.className = 'event-actions';
    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'details-btn small';
    detailsBtn.setAttribute('type', 'button');
    detailsBtn.setAttribute('data-event-id', event._id);
    detailsBtn.textContent = 'Details';
    const registerBtn = row.querySelector('.register-btn');
    if (registerBtn) {
      actions.appendChild(detailsBtn);
      actions.appendChild(registerBtn);
      row.appendChild(actions);
    }

    allEventsContainer.appendChild(row);
  });

  attachRegisterListeners();
  attachDetailListeners();
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
    card.className = 'college-card blue college-card-horizontal';
    card.innerHTML = `
      <div class="college-card-thumb">
        <img src="${getCollegeImageUrl(college)}" alt="${college.name || 'College'} image" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300?text=College+Image'" />
      </div>
      <div class="college-card-main">
        <div class="college-card-top-row">
          <div class="college-tag">${college.city || 'College'}</div>
        </div>
        <div class="college-card-content">
          <h4>${college.name || 'Unnamed College'}</h4>
          <p>${college.city || 'Unknown City'}, ${college.state || 'Unknown State'}</p>
          <p class="college-description">${college.description || 'Follow this college to discover its events and campus activities.'}</p>
        </div>
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'college-actions';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'details-btn';
    detailsBtn.setAttribute('type', 'button');
    detailsBtn.setAttribute('data-college-id', college._id);
    detailsBtn.textContent = 'Details';

    const followBtn = document.createElement('button');
    followBtn.className = `follow-btn ${isCollegeFollowed(college._id) ? 'followed' : ''}`;
    followBtn.setAttribute('type', 'button');
    followBtn.setAttribute('data-college-id', college._id);
    followBtn.textContent = isCollegeFollowed(college._id) ? 'Following' : 'Follow';

    actions.appendChild(detailsBtn);
    actions.appendChild(followBtn);
    card.appendChild(actions);
    collegeContainer.appendChild(card);
  });
  attachDetailListeners();
  attachFollowListeners();
}

function getCollegeImageUrl(college) {
  const query = encodeURIComponent(`${college.name || college.city || 'college'} campus`);
  return `https://source.unsplash.com/featured/400x300/?${query}`;
}

function renderCampusPulse() {
  const pulseGrid = document.getElementById('pulse-grid');
  if (!pulseGrid) return;
  if (!currentColleges.length || !currentEvents.length) {
    pulseGrid.innerHTML = '<div class="pulse-card"><h4>No campus data yet</h4><p>Wait for colleges and events to load.</p></div>';
    return;
  }

  const counts = currentEvents.reduce((acc, event) => {
    const key = event.college || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const pulseItems = currentColleges
    .map(college => ({
      college,
      eventCount: counts[college.name] || 0
    }))
    .sort((a, b) => b.eventCount - a.eventCount || a.college.name.localeCompare(b.college.name))
    .slice(0, 3);

  pulseGrid.innerHTML = '';
  pulseItems.forEach(item => {
    const card = document.createElement('article');
    card.className = 'pulse-card';
    card.innerHTML = `
      <h4>${item.college.name}</h4>
      <p>${item.college.city}, ${item.college.state}</p>
      <p>${item.eventCount > 0 ? item.eventCount + ' active event(s) happening now' : 'No active events currently'}</p>
      <div class="pulse-meta">
        <span class="pulse-badge">${item.eventCount >= 2 ? 'Trending' : 'Discover'}</span>
        <button type="button" class="pulse-btn" data-college-id="${item.college._id}" aria-label="View details for ${item.college.name}">View</button>
      </div>
    `;

    card.querySelector('.pulse-btn')?.addEventListener('click', () => {
      renderCollegeList([item.college]);
    });

    pulseGrid.appendChild(card);
  });
}

function showDetailModal(title, bodyHtml) {
  if (!detailModal || !detailTitle || !detailBody) return;
  detailTitle.textContent = title || 'Details';
  detailBody.innerHTML = bodyHtml || '<p>No details available.</p>';
  detailModal.classList.add('show');
}

function hideDetailModal() {
  detailModal?.classList.remove('show');
}

function getEventDetailHtml(event) {
  return `
    <div class="detail-panel">
      <p>${event.description || 'No detailed description is available for this event.'}</p>
      <ul class="detail-list">
        <li><strong>College:</strong> ${event.college || 'Unknown'}</li>
        <li><strong>Location:</strong> ${event.location || 'Unknown'}</li>
        <li><strong>Date:</strong> ${formatDate(event.date)}</li>
        <li><strong>Category:</strong> ${event.category || 'General'}</li>
        <li><strong>Registration:</strong> ${event.registrationLink ? `<a href="${normalizeRegistrationLink(event.registrationLink)}" target="_blank">Open registration</a>` : 'Not available'}</li>
      </ul>
    </div>
  `;
}

function getCollegeDetailHtml(college) {
  return `
    <div class="detail-panel">
      <p>${college.description || 'Explore this college for events, programs, and campus opportunities.'}</p>
      <ul class="detail-list">
        <li><strong>Name:</strong> ${college.name || 'Unknown'}</li>
        <li><strong>City:</strong> ${college.city || 'Unknown'}</li>
        <li><strong>State:</strong> ${college.state || 'Unknown'}</li>
        <li><strong>Coordinates:</strong> ${college.latitude != null && college.longitude != null ? `${college.latitude.toFixed(4)}, ${college.longitude.toFixed(4)}` : 'Not available'}</li>
      </ul>
    </div>
  `;
}

function attachDetailListeners() {
  document.querySelectorAll('.details-btn[data-event-id]').forEach(btn => {
    const eventId = btn.getAttribute('data-event-id');
    const handler = () => {
      const event = currentEvents.find(item => item._id === eventId);
      if (event) {
        showDetailModal(event.title, getEventDetailHtml(event));
      }
    };
    btn.removeEventListener('click', btn._detailHandler);
    btn.addEventListener('click', handler);
    btn._detailHandler = handler;
  });

  document.querySelectorAll('.details-btn[data-college-id]').forEach(btn => {
    const collegeId = btn.getAttribute('data-college-id');
    const handler = () => {
      const college = currentColleges.find(item => item._id === collegeId);
      if (college) {
        showDetailModal(college.name, getCollegeDetailHtml(college));
      }
    };
    btn.removeEventListener('click', btn._detailHandler);
    btn.addEventListener('click', handler);
    btn._detailHandler = handler;
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
detailModalClose?.addEventListener('click', hideDetailModal);
detailModal?.addEventListener('click', e => { if (e.target === detailModal) hideDetailModal(); });
searchBtn?.addEventListener('click', () => {
  performSearch(searchInput?.value || '');
});
searchInput?.addEventListener('input', e => {
  performSearch(e.target.value);
});
searchInput?.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    performSearch(searchInput?.value || '');
  }
});
document.getElementById('close-results')?.addEventListener('click', () => {
  const resultsContainer = document.getElementById('search-results');
  if (resultsContainer) resultsContainer.style.display = 'none';
  searchInput.value = '';
  renderEventListings(currentEvents);
  renderCampusPulse();
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
  initializeFeatureActions();
  initializeMessageInteractions();
  renderCampusPulse();
  document.getElementById('pulse-refresh-btn')?.addEventListener('click', renderCampusPulse);
  document.getElementById('logout-btn')?.addEventListener('click', logout);
});

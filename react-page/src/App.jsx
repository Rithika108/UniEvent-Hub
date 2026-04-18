import { useEffect, useMemo, useState } from 'react';

const spotlightColleges = [
  {
    id: 'iit-madras',
    tag: 'Top Pick',
    name: 'IIT Madras',
    city: 'Chennai',
    state: 'Tamil Nadu',
    description: 'Engineering excellence, tech fests, and innovation hubs.',
  },
  {
    id: 'avinashilingam',
    tag: 'New',
    name: 'Avinashilingam University',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    description: 'Research symposiums, cultural events, and leadership programs.',
  },
  {
    id: 'nit-trichy',
    tag: 'Popular',
    name: 'NIT Trichy',
    city: 'Trichy',
    state: 'Tamil Nadu',
    description: 'Sports meets, hackathons, and community festivals.',
  },
];

const allColleges = [
  ...spotlightColleges,
  {
    id: 'kpr-cet',
    tag: 'Tech',
    name: 'KPR Institute of Engineering and Technology',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    description: 'Practical workshops and industry-driven tech events.',
  },
  {
    id: 'pa-college',
    tag: 'Innovative',
    name: 'PA College of Engineering and Technology',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    description: 'Dynamic tech symposiums and student-led innovation weeks.',
  },
  {
    id: 'dhaanish',
    tag: 'Startup',
    name: 'Dhaanish Ahmed Institute of Technology',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    description: 'Entrepreneurship and startup showcases with real mentors.',
  },
];

const samplePulseTags = ['Trending', 'Campus Buzz', 'Live Now'];

const recommendedEvents = [
  {
    id: 'campus-hackathon',
    title: 'Campus Hackathon 2026',
    college: 'IIT Madras',
    date: 'May 22, 2026',
    location: 'Chennai',
    description: 'A 24-hour coding challenge with prizes for student teams.',
  },
  {
    id: 'innovation-fest',
    title: 'Innovation Fest',
    college: 'NIT Trichy',
    date: 'June 3, 2026',
    location: 'Trichy',
    description: 'Showcase new product ideas, workshops, and startup mentoring.',
  },
  {
    id: 'culture-carnival',
    title: 'Culture Carnival',
    college: 'Avinashilingam University',
    date: 'June 14, 2026',
    location: 'Coimbatore',
    description: 'Live performances, food stalls, and community networking.',
  },
];

const collegeImageMap = {
  'iit-madras': '../IIT Madras.jpg',
  'avinashilingam': '../Avinashilingam Univesity.jpg',
  'nit-trichy': '../NIT.jpg',
  'kpr-cet': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=700&h=420&q=80',
  'pa-college': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=700&h=420&q=80',
  'dhaanish': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=700&h=420&q=80',
};

const getCollegeImageUrl = (college) => {
  return (
    collegeImageMap[college.id] ||
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="420"><rect width="700" height="420" fill="#2563eb"/><text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Inter, sans-serif" font-size="36">${college.name}</text><text x="50%" y="62%" dominant-baseline="middle" text-anchor="middle" fill="#c7d2fe" font-family="Inter, sans-serif" font-size="22">Campus Image</text></svg>`
    )}`
  );
};

const getFallbackImage = () =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="420"><rect width="700" height="420" fill="#94a3b8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Inter, sans-serif" font-size="32">Image not available</text></svg>`
  )}`;

function App() {
  const [searchValue, setSearchValue] = useState('');
  const [followed, setFollowed] = useState([]);
  const [pulseCards, setPulseCards] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('reactFollowedColleges');
    if (saved) setFollowed(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('reactFollowedColleges', JSON.stringify(followed));
  }, [followed]);

  useEffect(() => {
    refreshPulse();
  }, []);

  const filteredColleges = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return allColleges;
    return allColleges.filter((college) =>
      [college.name, college.city, college.state, college.description]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(query))
    );
  }, [searchValue]);

  const filteredEvents = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return recommendedEvents;
    return recommendedEvents.filter((event) =>
      [event.title, event.college, event.location, event.description]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(query))
    );
  }, [searchValue]);

  const toggleFollow = (id) => {
    setFollowed((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleRegistration = (id) => {
    setRegisteredEvents((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const refreshPulse = () => {
    const items = allColleges
      .map((college, index) => ({
        ...college,
        tag: samplePulseTags[index % samplePulseTags.length],
        score: Math.floor(Math.random() * 100) + 50,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    setPulseCards(items);
  };

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Discover Colleges</p>
          <h1>Follow colleges and unlock their top student events</h1>
          <p className="hero-subtitle">
            Explore the newest campus highlights, live workshops, and trending student communities.
          </p>
          <div className="hero-actions">
            <button className="btn primary">Get Started</button>
            <button className="btn secondary">View Map</button>
          </div>
        </div>
      </header>

      <section className="search-panel">
        <form className="search-box" onSubmit={(e) => e.preventDefault()}>
          <input
            type="search"
            placeholder="Search colleges, locations or keywords..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
        <div className="feature-row">
          <button className="feature-pill">Top-ranked campuses</button>
          <button className="feature-pill">Live student events</button>
          <button className="feature-pill">Nearby opportunities</button>
        </div>
      </section>

      <section className="pulse-section">
        <div className="pulse-header">
          <div>
            <h2>Campus Pulse</h2>
            <p>The latest trending colleges and event hotspots on campus.</p>
          </div>
          <button className="btn small" onClick={refreshPulse}>
            Refresh Pulse
          </button>
        </div>
        <div className="pulse-grid">
          {pulseCards.map((college) => (
            <article key={college.id} className="pulse-card">
              <div className="pulse-top">
                <span className="pulse-badge">{college.tag}</span>
                <strong>{college.score}% buzz</strong>
              </div>
              <h3>{college.name}</h3>
              <p>{college.city}, {college.state}</p>
              <div className="pulse-meta">
                <span>{college.description}</span>
                <button
                  className="btn tertiary"
                  onClick={() => setSearchValue(college.city)}
                >
                  Explore
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="events-section">
        <div className="section-title">
          <div>
            <h2>Recommended Campus Events</h2>
            <p>Find the best student programs to join, with live event registration.</p>
          </div>
          <button className="btn small" type="button" onClick={() => setSearchValue('')}>
            Reset filter
          </button>
        </div>
        <div className="pulse-grid">
          {filteredEvents.map((event) => (
            <article key={event.id} className="event-card">
              <div className="pulse-top">
                <span className="pulse-badge">Live</span>
                <strong>{event.date}</strong>
              </div>
              <h3>{event.title}</h3>
              <p>{event.location} · {event.college}</p>
              <p>{event.description}</p>
              <div className="event-meta">
                <span>Seats {registeredEvents.includes(event.id) ? 'Booked' : 'Available'}</span>
                <button
                  className={`register-btn ${registeredEvents.includes(event.id) ? 'registered' : ''}`}
                  type="button"
                  onClick={() => toggleRegistration(event.id)}
                >
                  {registeredEvents.includes(event.id) ? 'Registered' : 'Register'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="spotlight-section">
        <div className="section-title">
          <h2>Campus Spotlight</h2>
          <a className="link" href="#all-colleges">See all colleges</a>
        </div>
        <div className="college-grid">
          {spotlightColleges.map((college) => (
            <article key={college.id} className={`college-card spotlight-card ${college.id === 'iit-madras' ? 'iit-madras' : ''}`}>
              <div className="spotlight-top">
                <div className="college-tag">{college.tag}</div>
                <button className="favorite-btn" type="button" aria-label={`Favorite ${college.name}`}>
                  <span>❤</span>
                </button>
              </div>
              <div className="college-card-thumb">
                <img
                  src={getCollegeImageUrl(college)}
                  alt={`${college.name} campus`}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.src = getFallbackImage(); }}
                />
              </div>
              <div className="college-card-content spotlight-content">
                <h3>{college.name}</h3>
                <p>{college.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="all-colleges" className="all-colleges-section">
        <div className="section-title">
          <h2>All Colleges</h2>
        </div>
        <div className="college-grid expanded">
          {filteredColleges.map((college) => (
            <article key={college.id} className="college-card blue college-card-horizontal">
              <div className="college-tag">{college.tag || college.city}</div>
              <div className="college-card-thumb">
                <img
                  src={getCollegeImageUrl(college)}
                  alt={`${college.name} campus`}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.src = getFallbackImage(); }}
                />
              </div>
              <div className="college-card-content">
                <h3>{college.name}</h3>
                <p>{college.city}, {college.state}</p>
                <p className="college-description">{college.description}</p>
              </div>
              <div className="college-actions">
                <button className="details-btn" type="button" onClick={() => alert(`View details for ${college.name}`)}>
                  Details
                </button>
                <button
                  className={`follow-btn ${followed.includes(college.id) ? 'followed' : ''}`}
                  type="button"
                  onClick={() => toggleFollow(college.id)}
                >
                  {followed.includes(college.id) ? 'Following' : 'Follow'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;

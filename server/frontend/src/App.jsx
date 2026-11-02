import { useEffect, useState } from 'react';
import Register from './components/Register/Register.jsx';

const STATES = ['Kansas', 'Illinois', 'Michigan'];

function readLocation() {
  const params = new URLSearchParams(window.location.search);
  return { dealerId: params.get('dealer'), state: params.get('state') || '' };
}

function navigate(params) {
  const query = new URLSearchParams(params).toString();
  window.history.pushState({}, '', query ? `/?${query}` : '/');
  window.dispatchEvent(new Event('app:navigate'));
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'The request could not be completed.');
  return payload;
}

function Brand() {
  return <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate({}); }}><span className="brand__mark">G</span><span>GOODROAD<span className="brand__sub">MOTORS</span></span></a>;
}

function LoginForm({ onLogin, onRegister, onClose }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await requestJson('/djangoapp/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      onLogin(result.userName);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-form__heading"><div><span className="eyebrow">Welcome back</span><h2>Sign in</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close sign in">×</button></div>
      <label>Username<input autoComplete="username" value={credentials.username} onChange={(event) => setCredentials({ ...credentials, username: event.target.value })} required /></label>
      <label>Password<input type="password" autoComplete="current-password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="auth-form__actions"><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button><button className="button button--quiet" type="button" onClick={onRegister}>Create account</button></div>
    </form>
  );
}

function DealerCard({ dealer, loggedIn, onOpen, onSignIn }) {
  return (
    <article className="dealer-card">
      <button className="dealer-card__image" type="button" onClick={onOpen} aria-label={`View ${dealer.full_name}`} style={{ backgroundImage: `url(${dealer.image})` }}>
        <span className="dealer-card__image-label">GOODROAD VERIFIED</span>
      </button>
      <div className="dealer-card__content">
        <div className="dealer-card__topline"><span className="dealer-card__city">{dealer.city}, {dealer.state}</span><span className="dealer-card__number">NO. {String(dealer.id).padStart(2, '0')}</span></div>
        <h2>{dealer.full_name}</h2>
        <p className="dealer-card__address">{dealer.address}, {dealer.city}, {dealer.state} {dealer.zip}</p>
        <div className="dealer-card__actions"><button className="text-button" type="button" onClick={onOpen}>Dealer details <span aria-hidden="true">↗</span></button>{loggedIn ? <button className="button button--small" type="button" onClick={onOpen}>Review dealer</button> : <button className="button button--small button--outline" type="button" onClick={onSignIn}>Sign in to review</button>}</div>
      </div>
    </article>
  );
}

function ReviewForm({ userName, onSubmit, onCancel }) {
  const [form, setForm] = useState({ review: '', rating: '5', purchase: false, purchaseDate: '' });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await onSubmit({ ...form, rating: Number(form.rating), name: userName });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <div className="review-form__heading"><div><span className="eyebrow">Your experience matters</span><h2>Write a review</h2></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Close review form">×</button></div>
      <label>Your rating<select value={form.rating} onChange={(event) => setForm({ ...form, rating: event.target.value })}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} {rating === 1 ? 'star' : 'stars'}</option>)}</select></label>
      <label>Your review<textarea value={form.review} onChange={(event) => setForm({ ...form, review: event.target.value })} rows="5" maxLength="2000" placeholder="What stood out about your visit?" required /></label>
      <label className="check-row"><input type="checkbox" checked={form.purchase} onChange={(event) => setForm({ ...form, purchase: event.target.checked })} /> I purchased a vehicle here</label>
      {form.purchase && <label>Purchase date<input type="date" value={form.purchaseDate} onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })} /></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="auth-form__actions"><button className="button button--primary" type="submit">Post review</button><button className="button button--quiet" type="button" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

export default function App() {
  const [location, setLocation] = useState(readLocation);
  const [dealers, setDealers] = useState([]);
  const [dealer, setDealer] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [userName, setUserName] = useState('');
  const [authMode, setAuthMode] = useState('');
  const [reviewForm, setReviewForm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncLocation = () => setLocation(readLocation());
    window.addEventListener('popstate', syncLocation);
    window.addEventListener('app:navigate', syncLocation);
    requestJson('/djangoapp/user').then((user) => {
      if (user.authenticated) setUserName(user.userName);
    }).catch(() => {});
    return () => {
      window.removeEventListener('popstate', syncLocation);
      window.removeEventListener('app:navigate', syncLocation);
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const path = location.state ? `/djangoapp/get_dealers/${encodeURIComponent(location.state)}` : '/djangoapp/get_dealers';
    requestJson(path)
      .then((result) => { if (active) setDealers(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [location.state]);

  useEffect(() => {
    if (!location.dealerId) {
      setDealer(null);
      setReviews([]);
      return;
    }
    let active = true;
    Promise.all([
      requestJson(`/djangoapp/get_dealer/${location.dealerId}`),
      requestJson(`/djangoapp/get_reviews/${location.dealerId}`),
    ]).then(([dealerResult, reviewResult]) => {
      if (active) { setDealer(dealerResult); setReviews(reviewResult); }
    }).catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [location.dealerId]);

  async function submitReview(formData) {
    await requestJson('/djangoapp/post_review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, dealerId: location.dealerId }),
    });
    setReviews(await requestJson(`/djangoapp/get_reviews/${location.dealerId}`));
    setReviewForm(false);
    setMessage('Your review has been posted.');
  }

  async function signOut() {
    await requestJson('/djangoapp/logout');
    setUserName('');
    setMessage('You are signed out.');
  }

  const isDetail = Boolean(location.dealerId);

  return (
    <div className="app-shell">
      <header className="site-header">
        <Brand />
        <nav className="site-nav" aria-label="Main navigation"><a href="/" onClick={(event) => { event.preventDefault(); navigate({}); }}>Dealers</a><a href="/about">Our story</a><a href="/contact">Contact</a></nav>
        <div className="header-account">{userName ? <><span className="account-name"><span className="account-dot" />{userName}</span><button className="header-link" type="button" onClick={signOut}>Sign out</button></> : <button className="button button--dark" type="button" onClick={() => setAuthMode('login')}>Sign in <span aria-hidden="true">↗</span></button>}</div>
      </header>

      <main className="main-content">
        <div className="page-kicker"><span>INDEPENDENT DEALERS. BETTER DECISIONS.</span><span className="kicker-rule" /></div>
        {isDetail && dealer ? (
          <>
            <button className="back-link" type="button" onClick={() => navigate(location.state ? { state: location.state } : {})}>← All dealers</button>
            <section className="detail-hero">
              <div className="detail-hero__image" style={{ backgroundImage: `url(${dealer.image})` }} />
              <div className="detail-hero__copy"><span className="eyebrow">{dealer.city}, {dealer.state} · DEALER NO. {dealer.id}</span><h1>{dealer.full_name}</h1><p>{dealer.address}, {dealer.city}, {dealer.state} {dealer.zip}</p><div className="detail-hero__buttons"><a className="button button--primary" href={`https://maps.google.com/?q=${encodeURIComponent(`${dealer.address}, ${dealer.city}, ${dealer.state}`)}`} target="_blank" rel="noreferrer">Get directions ↗</a>{userName ? <button className="button button--outline" type="button" onClick={() => setReviewForm(true)}>Post a review</button> : <button className="button button--outline" type="button" onClick={() => setAuthMode('login')}>Sign in to review</button>}</div></div>
            </section>
            <section className="reviews-section"><div className="section-heading"><div><span className="eyebrow">REAL EXPERIENCES</span><h2>Customer reviews <span className="review-count">{reviews.length}</span></h2></div>{userName && <button className="button button--small" type="button" onClick={() => setReviewForm(true)}>+ Add review</button>}</div>
              {reviews.length ? <div className="review-list">{reviews.map((item) => <article className="review-item" key={item._id}><div className="review-item__meta"><strong>{item.name || item.username}</strong><span>{'★'.repeat(Number(item.rating || 5))}{'☆'.repeat(5 - Number(item.rating || 5))}</span></div><p>{item.review}</p><div className="review-item__foot"><span>{item.purchase ? 'Verified purchase' : 'Customer review'}</span><time>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</time></div></article>)}</div> : <div className="empty-state"><span className="empty-state__symbol">✳</span><p>No reviews yet. Be the first to share your experience.</p></div>}
            </section>
          </>
        ) : (
          <>
            <section className="directory-heading"><div><span className="eyebrow">THE GOODROAD DIRECTORY</span><h1>Find your next<br /><em>good drive.</em></h1></div><p>Meet independent dealers who put people first. Browse the directory, compare locations, and hear from drivers like you.</p></section>
            <section className="directory-toolbar"><div className="directory-toolbar__label"><span className="toolbar-marker" /> DEALERS NEAR YOU <span className="dealer-count">{loading ? '…' : String(dealers.length).padStart(2, '0')}</span></div><label className="state-filter">Filter by state<select aria-label="Filter dealers by state" value={location.state} onChange={(event) => navigate(event.target.value ? { state: event.target.value } : {})}><option value="">All states</option>{STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></label></section>
            {error && <p className="notice notice--error" role="alert">{error}</p>}
            {message && <p className="notice" role="status">{message}<button type="button" onClick={() => setMessage('')} aria-label="Dismiss message">×</button></p>}
            {loading ? <div className="empty-state"><span className="loader" />Loading dealers…</div> : dealers.length ? <section className="dealer-grid" aria-label="Dealerships">{dealers.map((item) => <DealerCard key={item.id} dealer={item} loggedIn={Boolean(userName)} onOpen={() => navigate({ ...(location.state ? { state: location.state } : {}), dealer: item.id })} onSignIn={() => setAuthMode('login')} />)}</section> : <div className="empty-state"><span className="empty-state__symbol">⌕</span><p>No dealers found in this state.</p></div>}
            <section className="directory-note"><span>GOODROAD / 2026</span><p>Clear information. Real people. A more confident way to find your next car.</p><span>SCROLL TO EXPLORE ↓</span></section>
          </>
        )}
      </main>
      <footer className="site-footer"><Brand /><span>© 2026 Goodroad Motors</span><span>Built for the road ahead.</span></footer>

      {authMode && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthMode(''); }}><section className="auth-modal" role="dialog" aria-modal="true" aria-label={authMode === 'login' ? 'Sign in' : 'Create account'}>{authMode === 'login' ? <LoginForm onLogin={(name) => { setUserName(name); setAuthMode(''); setMessage(`Welcome, ${name}.`); }} onRegister={() => setAuthMode('register')} onClose={() => setAuthMode('')} /> : <Register onRegistered={(name) => { setUserName(name); setAuthMode(''); setMessage(`Welcome, ${name}.`); }} onCancel={() => setAuthMode('')} />}</section></div>}
      {reviewForm && dealer && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setReviewForm(false); }}><section className="auth-modal auth-modal--wide" role="dialog" aria-modal="true" aria-label="Post a review"><ReviewForm userName={userName} onSubmit={submitReview} onCancel={() => setReviewForm(false)} /></section></div>}
    </div>
  );
}
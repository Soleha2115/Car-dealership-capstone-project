import { useState } from 'react';

const emptyForm = {
  username: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
};

export default function Register({ onRegistered, onCancel }) {
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateField(event) {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/djangoapp/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Registration failed.');
      onRegistered(result.userName);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-form__heading">
        <div><span className="eyebrow">A better drive starts here</span><h2>Create your account</h2></div>
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Close registration">×</button>
      </div>
      <div className="form-grid form-grid--two">
        <label>First name<input name="firstName" value={formData.firstName} onChange={updateField} autoComplete="given-name" required /></label>
        <label>Last name<input name="lastName" value={formData.lastName} onChange={updateField} autoComplete="family-name" required /></label>
        <label>Username<input name="username" value={formData.username} onChange={updateField} autoComplete="username" required /></label>
        <label>Email<input name="email" type="email" value={formData.email} onChange={updateField} autoComplete="email" required /></label>
        <label className="form-grid__full">Password<input name="password" type="password" value={formData.password} onChange={updateField} autoComplete="new-password" minLength="8" required /></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="auth-form__actions">
        <button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Register'}</button>
        <button className="button button--quiet" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
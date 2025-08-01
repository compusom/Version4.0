import React, { useState } from 'react';

const SqlCredentialsForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [host, setHost] = useState('localhost');
  const [database, setDatabase] = useState('postgres');
  const [user, setUser] = useState('postgres');
  const [password, setPassword] = useState('');
  const [port, setPort] = useState('5432');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/connections/test-and-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, database, user, password, port, save: true })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback('Conexión exitosa y credenciales guardadas.');
        onSuccess();
      } else {
        setFeedback('Error: ' + (data.message || 'No se pudo conectar.'));
      }
    } catch (err) {
      setFeedback('Error de red o servidor.');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '2rem auto', padding: 24, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Credenciales de SQL</h2>
      <label>Host:<input value={host} onChange={e => setHost(e.target.value)} required /></label><br />
      <label>Base de datos:<input value={database} onChange={e => setDatabase(e.target.value)} required /></label><br />
      <label>Usuario:<input value={user} onChange={e => setUser(e.target.value)} required /></label><br />
      <label>Contraseña:<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label><br />
      <label>Puerto:<input value={port} onChange={e => setPort(e.target.value)} required /></label><br />
      <button type="submit" disabled={saving} style={{ marginTop: 12 }}>Testear y Guardar</button>
      {feedback && <div style={{ marginTop: 16, color: feedback.startsWith('Conexión') ? 'green' : 'red' }}>{feedback}</div>}
    </form>
  );
};

export default SqlCredentialsForm;

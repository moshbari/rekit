import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

function App() {
  const [sources, setSources] = useState([{ id: 1, name: 'Source 1', emails: '' }]);
  const [nextId, setNextId] = useState(2);
  const [unsubEmail, setUnsubEmail] = useState('');
  const [unsubscribers, setUnsubscribers] = useState([]);
  const [cleanedList, setCleanedList] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchUnsub, setSearchUnsub] = useState('');
  const [addingUnsub, setAddingUnsub] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [copied, setCopied] = useState(false);

  const UNSUB_LINK = 'https://rekit.pages.dev/unsubscribe/?email={{email}}';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const copyUnsubLink = async () => {
    try {
      await navigator.clipboard.writeText(UNSUB_LINK);
      setCopied(true);
      showToast('Unsubscribe link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast('Failed to copy. Try selecting and copying manually.', 'error');
    }
  };

  useEffect(() => {
    loadUnsubscribers();
    const savedWebhook = localStorage.getItem('webhook_url');
    if (savedWebhook) setWebhookUrl(savedWebhook);
  }, []);

  const loadUnsubscribers = async () => {
    try {
      const { data, error } = await supabase
        .from('unsubscribers')
        .select('email')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUnsubscribers(data.map((row) => row.email));
    } catch (err) {
      console.error('Failed to load unsubscribers:', err);
      showToast('Failed to connect to database', 'error');
    } finally {
      setLoading(false);
    }
  };

  const extractEmails = (text) => {
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    return (text.match(emailRegex) || []).map((e) => e.toLowerCase().trim());
  };

  const addSource = () => {
    setSources([...sources, { id: nextId, name: `Source ${nextId}`, emails: '' }]);
    setNextId(nextId + 1);
  };

  const removeSource = (id) => {
    if (sources.length > 1) setSources(sources.filter((s) => s.id !== id));
  };

  const updateSource = (id, field, value) => {
    setSources(sources.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const addUnsubscriber = async () => {
    const emails = extractEmails(unsubEmail);
    if (emails.length === 0) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    setAddingUnsub(true);
    try {
      const newEmails = emails.filter((e) => !unsubscribers.includes(e));
      if (newEmails.length > 0) {
        const { error } = await supabase
          .from('unsubscribers')
          .upsert(newEmails.map((email) => ({ email })), { onConflict: 'email' });
        if (error) throw error;
        setUnsubscribers([...newEmails, ...unsubscribers]);
      }
      setUnsubEmail('');
      showToast(newEmails.length > 0 ? `${newEmails.length} email(s) added to unsubscribe list` : 'Email(s) already in unsubscribe list');
    } catch (err) {
      console.error('Failed to add unsubscriber:', err);
      showToast('Failed to save. Check your database connection.', 'error');
    } finally {
      setAddingUnsub(false);
    }
  };

  const removeUnsubscriber = async (email) => {
    try {
      const { error } = await supabase.from('unsubscribers').delete().eq('email', email);
      if (error) throw error;
      setUnsubscribers(unsubscribers.filter((e) => e !== email));
      showToast(`Removed ${email}`);
    } catch (err) {
      showToast('Failed to remove. Try again.', 'error');
    }
  };

  const clearAllUnsubscribers = async () => {
    if (!window.confirm('Are you sure you want to remove ALL unsubscribers? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('unsubscribers').delete().neq('email', '');
      if (error) throw error;
      setUnsubscribers([]);
      showToast('All unsubscribers cleared');
    } catch (err) {
      showToast('Failed to clear. Try again.', 'error');
    }
  };

  const processAndExport = () => {
    setProcessing(true);
    let allEmails = [];
    let totalRaw = 0;

    sources.forEach((source) => {
      const emails = extractEmails(source.emails);
      totalRaw += emails.length;
      allEmails = [...allEmails, ...emails];
    });

    if (allEmails.length === 0) {
      showToast('No emails found. Paste your email lists first.', 'error');
      setProcessing(false);
      return;
    }

    const unique = [...new Set(allEmails)];
    const duplicatesRemoved = totalRaw - unique.length;
    const unsubSet = new Set(unsubscribers);
    const cleaned = unique.filter((email) => !unsubSet.has(email));
    const unsubsRemoved = unique.length - cleaned.length;

    setStats({ totalRaw, duplicatesRemoved, unsubsRemoved, finalCount: cleaned.length });
    setCleanedList(cleaned);
    setProcessing(false);
  };

  const downloadCSV = () => {
    if (!cleanedList) return;
    const csvContent = 'email\r\n' + cleanedList.join('\r\n') + '\r\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clean-email-list-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${cleanedList.length} emails as CSV`);
  };

  const sendToWebhook = async () => {
    if (!cleanedList || cleanedList.length === 0) {
      showToast('Process your list first before sending', 'error');
      return;
    }
    if (!webhookUrl.trim()) {
      showToast('Enter your n8n webhook URL', 'error');
      return;
    }

    setSending(true);
    setSendStatus(null);

    try {
      // Save webhook URL for next time
      localStorage.setItem('webhook_url', webhookUrl.trim());

      // Build CSV with CRLF line endings — exactly like a real .csv file from disk
      const csvContent = 'email\r\n' + cleanedList.join('\r\n') + '\r\n';
      const blob = new Blob([csvContent], { type: 'application/octet-stream' });

      // Send directly to n8n — same as Postman binary mode
      const response = await fetch(webhookUrl.trim(), {
        method: 'POST',
        body: blob,
        headers: { 'Content-Type': 'application/octet-stream' },
      });

      if (response.ok) {
        setSendStatus('success');
        showToast(`Sent ${cleanedList.length} emails to WebinarKit via n8n`);
      } else {
        setSendStatus('error');
        showToast(`Webhook returned error: ${response.status} ${response.statusText}`, 'error');
      }
    } catch (err) {
      console.error('Webhook send failed:', err);
      setSendStatus('error');
      showToast('Failed to send. Check your webhook URL and try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const filteredUnsubs = unsubscribers.filter((e) => e.toLowerCase().includes(searchUnsub.toLowerCase()));

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Connecting to database...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <header className="header">
        <h1><span className="header-icon">⚡</span> ReKit</h1>
        <p>Combine leads → Scrub duplicates & unsubscribers → Send to WebinarKit</p>
      </header>

      <div className="main-grid">
        {/* LEFT — Sources */}
        <div className="left-col">
          <div className="card">
            <div className="card-header">
              <h2>📋 Email Sources</h2>
              <button onClick={addSource} className="btn-secondary">+ Add Source</button>
            </div>

            <div className="sources-list">
              {sources.map((source) => (
                <div key={source.id} className="source-block">
                  <div className="source-top">
                    <input
                      type="text"
                      value={source.name}
                      onChange={(e) => updateSource(source.id, 'name', e.target.value)}
                      className="source-name"
                      placeholder="Source name..."
                    />
                    <span className="email-badge">{extractEmails(source.emails).length} emails</span>
                    {sources.length > 1 && (
                      <button onClick={() => removeSource(source.id)} className="btn-x">✕</button>
                    )}
                  </div>
                  <textarea
                    value={source.emails}
                    onChange={(e) => updateSource(source.id, 'emails', e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = e.clipboardData.getData('text/plain');
                      updateSource(source.id, 'emails', source.emails + text);
                    }}
                    placeholder="Paste emails here — one per line from your CSV or spreadsheet. The app auto-extracts all valid emails..."
                    className="email-textarea"
                  />
                </div>
              ))}
            </div>

            <button onClick={processAndExport} className="btn-process" disabled={processing}>
              {processing ? 'Processing...' : '🔄 Process & Clean List'}
            </button>
          </div>

          {stats && (
            <div className="card">
              <h2>📊 Results</h2>
              <div className="stats-grid">
                <div className="stat-box"><div className="stat-number">{stats.totalRaw}</div><div className="stat-label">Total Raw</div></div>
                <div className="stat-box"><div className="stat-number yellow">-{stats.duplicatesRemoved}</div><div className="stat-label">Duplicates</div></div>
                <div className="stat-box"><div className="stat-number red">-{stats.unsubsRemoved}</div><div className="stat-label">Unsubscribers</div></div>
                <div className="stat-box green"><div className="stat-number white">{stats.finalCount}</div><div className="stat-label light">Clean Emails</div></div>
              </div>
              <button onClick={downloadCSV} className="btn-download">⬇ Download Clean CSV ({stats.finalCount} emails)</button>

              {/* Send to WebinarKit */}
              <div className="webhook-section">
                <h3 className="webhook-title">🚀 Send to WebinarKit</h3>
                <p className="webhook-desc">Send the cleaned list directly to your n8n webhook — no Postman needed.</p>
                <div className="webhook-input-row">
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://moshbari.cloud/webhook/..."
                    className="webhook-input"
                    disabled={sending}
                  />
                  <button
                    onClick={sendToWebhook}
                    className={`btn-send ${sendStatus === 'success' ? 'btn-send-success' : ''}`}
                    disabled={sending || !cleanedList}
                  >
                    {sending ? 'Sending...' : sendStatus === 'success' ? '✓ Sent!' : '🚀 Send'}
                  </button>
                </div>
                {sendStatus === 'success' && (
                  <p className="send-status success">✓ {cleanedList.length} emails sent successfully to your webhook</p>
                )}
                {sendStatus === 'error' && (
                  <p className="send-status error">✕ Send failed — check the webhook URL and try again</p>
                )}
              </div>
              {cleanedList && cleanedList.length > 0 && (
                <div className="preview-box">
                  <p className="preview-label">Preview (first 10):</p>
                  {cleanedList.slice(0, 10).map((email, i) => (
                    <div key={i} className="preview-email">{email}</div>
                  ))}
                  {cleanedList.length > 10 && <p className="preview-more">...and {cleanedList.length - 10} more</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Unsubscribers + Unsub Link */}
        <div className="right-col">
          <div className="card">
            <h2>🚫 Unsubscribers <span className="unsub-count">({unsubscribers.length})</span></h2>
            <p className="unsub-desc">Automatically removed from every export. Stored in your Supabase database — shared across all your tools.</p>

            <div className="unsub-input-row">
              <input
                type="text"
                value={unsubEmail}
                onChange={(e) => setUnsubEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addUnsubscriber()}
                placeholder="Enter email to unsubscribe..."
                className="unsub-input"
                disabled={addingUnsub}
              />
              <button onClick={addUnsubscriber} className="btn-unsub-add" disabled={addingUnsub}>
                {addingUnsub ? '...' : 'Add'}
              </button>
            </div>
            <p className="unsub-hint">You can paste multiple emails at once</p>

            {unsubscribers.length > 5 && (
              <input
                type="text"
                value={searchUnsub}
                onChange={(e) => setSearchUnsub(e.target.value)}
                placeholder="Search unsubscribers..."
                className="search-input"
              />
            )}

            <div className="unsub-list">
              {filteredUnsubs.length === 0 && unsubscribers.length === 0 && <p className="empty-state">No unsubscribers yet. Add emails above.</p>}
              {filteredUnsubs.length === 0 && unsubscribers.length > 0 && <p className="empty-state">No matches found.</p>}
              {filteredUnsubs.map((email) => (
                <div key={email} className="unsub-item">
                  <span className="unsub-email">{email}</span>
                  <button onClick={() => removeUnsubscriber(email)} className="btn-x small">✕</button>
                </div>
              ))}
            </div>

            {unsubscribers.length > 0 && (
              <button onClick={clearAllUnsubscribers} className="btn-clear-all">Clear All Unsubscribers</button>
            )}
          </div>

          {/* UNSUBSCRIBE LINK SECTION */}
          <div className="card">
            <h2>🔗 Unsubscribe Link</h2>
            <p className="unsub-desc">Add this link to the bottom of your WebinarKit emails so people can unsubscribe themselves. It automatically saves to your database above.</p>

            <div className="unsub-link-box">
              <code className="unsub-link-code">{UNSUB_LINK}</code>
              <button onClick={copyUnsubLink} className={`btn-copy ${copied ? 'btn-copy-success' : ''}`}>
                {copied ? '✓ Copied!' : '📋 Copy Link'}
              </button>
            </div>

            <div className="unsub-link-instructions">
              <h3 className="instructions-title">📝 How to use in WebinarKit:</h3>
              <div className="instruction-step">
                <span className="step-number">1</span>
                <span>Go to your WebinarKit email settings</span>
              </div>
              <div className="instruction-step">
                <span className="step-number">2</span>
                <span>Edit any email template (reminders, follow-ups, etc.)</span>
              </div>
              <div className="instruction-step">
                <span className="step-number">3</span>
                <span>At the bottom of the email body, paste this HTML:</span>
              </div>

              <div className="unsub-link-box" style={{ marginTop: '8px' }}>
                <code className="unsub-link-code" style={{ fontSize: '12px' }}>
                  {'<a href="https://rekit.pages.dev/unsubscribe/?email={{email}}">Unsubscribe</a>'}
                </code>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText('<a href="https://rekit.pages.dev/unsubscribe/?email={{email}}">Unsubscribe</a>');
                      showToast('HTML link copied!');
                    } catch (err) {
                      showToast('Failed to copy', 'error');
                    }
                  }}
                  className="btn-copy"
                >
                  📋 Copy HTML
                </button>
              </div>

              <div className="instruction-step" style={{ marginTop: '12px' }}>
                <span className="step-number">4</span>
                <span>Save. Now every email will have an unsubscribe link that auto-adds to your database!</span>
              </div>
            </div>

            <p className="unsub-hint" style={{ marginTop: '16px' }}>
              💡 <strong>{'{{email}}'}</strong> is a WebinarKit variable — it automatically becomes the recipient's real email address.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

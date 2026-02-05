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
  const [activeTab, setActiveTab] = useState('unsub');
  const [copied, setCopied] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [webinarId, setWebinarId] = useState('');
  const [jsonReady, setJsonReady] = useState(false);

  const UNSUB_LINK = 'https://rekit.pages.dev/unsubscribe/?email={{email}}';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const generateN8nWorkflow = () => {
    if (!webinarId.trim()) {
      showToast('Please enter a WebinarKit Webinar ID', 'error');
      return;
    }

    // Generate unique webhook path in ddmmyy-hhmmss-gst format
    const now = new Date();
    const gst = new Date(now.getTime() + (4 * 60 * 60 * 1000)); // UTC+4 = GST
    const dd = String(gst.getUTCDate()).padStart(2, '0');
    const mm = String(gst.getUTCMonth() + 1).padStart(2, '0');
    const yy = String(gst.getUTCFullYear()).slice(-2);
    const hh = String(gst.getUTCHours()).padStart(2, '0');
    const min = String(gst.getUTCMinutes()).padStart(2, '0');
    const ss = String(gst.getUTCSeconds()).padStart(2, '0');
    const webhookPath = `${dd}${mm}${yy}-${hh}${min}${ss}-gst`;
const workflow = {"name":"WebinarKit Lead Import","nodes":[{"parameters":{"method":"POST","url":"https://webinarkit.com/api/webinar/registration/" + webinarId.trim(),"authentication":"predefinedCredentialType","nodeCredentialType":"httpBearerAuth","sendBody":true,"bodyParameters":{"parameters":[{"name":"email","value":"={{ $('Replace Me').item.json.email }}"},{"name":"date","value":"={{ $json.time_iso }}"},{"name":"=fullDate","value":"={{ $json.fullDate }}"}]},"options":{}},"type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[976,-528],"id":"dfe2d578-f612-4919-bab4-5061f6cf1cec","name":"HTTP Request1","credentials":{"httpBearerAuth":{"id":"uClZpdTn8Q8mpnry","name":"webinarkit"}}},{"parameters":{"jsCode":"const now = DateTime.fromISO($now);\nconst nyTime = now.setZone('America/New_York').plus({ days: 1 }).set({ hour: 11, minute: 0, second: 0, millisecond: 0 });\nconst time_iso = nyTime.toUTC().toISO();\nconst day = nyTime.day;\nconst ordinal = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';\nconst fullDate = `${nyTime.toFormat('cccc, LLLL')} ${day}${ordinal} at ${nyTime.toFormat('hh:mm a')} ET`;\nreturn [{ json: { time_iso, fullDate } }];"},"type":"n8n-nodes-base.code","typeVersion":2,"position":[752,-592],"id":"f596946d-c592-4fad-9efd-f0763b733dd4","name":"Code in JavaScript"},{"parameters":{"options":{}},"type":"n8n-nodes-base.extractFromFile","typeVersion":1.1,"position":[-144,-528],"id":"c2366e1e-fc6a-4d36-af18-b58e7bc3cb24","name":"Extract from File"},{"parameters":{"options":{}},"type":"n8n-nodes-base.splitInBatches","typeVersion":3,"position":[80,-528],"id":"688b9e72-476d-4c19-bcdc-c103d0a5afab","name":"Loop Over Items"},{"parameters":{},"type":"n8n-nodes-base.noOp","name":"Replace Me","typeVersion":1,"position":[304,-592],"id":"8b20d906-8580-440c-bea4-4cb9081af2d2"},{"parameters":{"amount":"=5"},"type":"n8n-nodes-base.wait","typeVersion":1.1,"position":[528,-592],"id":"185b13ed-30d1-4d48-b219-61ff296c857c","name":"Wait1","webhookId":"608699de-7848-4c0b-9896-d00e41162e54"},{"parameters":{"httpMethod":"POST","path":webhookPath,"options":{}},"type":"n8n-nodes-base.webhook","typeVersion":2.1,"position":[-368,-528],"id":"244b642f-bccf-4cd9-b8c9-c540341e2f4f","name":"Webhook","webhookId":"836de951-4a97-49f4-8b53-71e2b03fced5"}],"connections":{"Code in JavaScript":{"main":[[{"node":"HTTP Request1","type":"main","index":0}]]},"Extract from File":{"main":[[{"node":"Loop Over Items","type":"main","index":0}]]},"Loop Over Items":{"main":[[],[{"node":"Replace Me","type":"main","index":0}]]},"Replace Me":{"main":[[{"node":"Wait1","type":"main","index":0}]]},"Wait1":{"main":[[{"node":"Code in JavaScript","type":"main","index":0}]]},"HTTP Request1":{"main":[[{"node":"Loop Over Items","type":"main","index":0}]]},"Webhook":{"main":[[{"node":"Extract from File","type":"main","index":0}]]}},"active":false,"settings":{"executionOrder":"v1"}};
    // Copy JSON to clipboard instead of downloading
    navigator.clipboard.writeText(JSON.stringify(workflow, null, 2)).then(() => {
      setJsonReady(true);
      showToast('Workflow JSON copied to clipboard!');
      setTimeout(() => setJsonReady(false), 3000);
    }).catch(() => {
      showToast('Failed to copy to clipboard', 'error');
    });

    // Auto-fill the webhook URL into the Send to WebinarKit field
    const fullWebhookUrl = 'https://moshbari.cloud/webhook/' + webhookPath;
    setWebhookUrl(fullWebhookUrl);
    localStorage.setItem('webhook_url', fullWebhookUrl);
  };

  const copyUnsubLink = async () => {
    try {
      await navigator.clipboard.writeText(UNSUB_LINK);
      setCopied(true);
      showToast('Unsubscribe link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast('Failed to copy', 'error');
    }
  };

  const copyHtmlLink = async () => {
    try {
      await navigator.clipboard.writeText('We\'d hate to see you go, but if you want to stop all future emails, <a href="https://rekit.pages.dev/unsubscribe/?email={{email}}">click here to opt out</a>.');
      setCopiedHtml(true);
      showToast('HTML copied!');
      setTimeout(() => setCopiedHtml(false), 2000);
    } catch (err) {
      showToast('Failed to copy', 'error');
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
    const typed = window.prompt(`Type REMOVE to confirm removing ${email} from unsubscribers:`);
    if (!typed || typed.trim().toUpperCase() !== 'REMOVE') {
      showToast('Removal cancelled', 'error');
      return;
    }
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
      localStorage.setItem('webhook_url', webhookUrl.trim());
      const csvContent = 'email\r\n' + cleanedList.join('\r\n') + '\r\n';
      const blob = new Blob([csvContent], { type: 'application/octet-stream' });
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

  const tabs = [
    { id: 'unsub', label: '🚫 Unsubscribers', count: unsubscribers.length },
    { id: 'workflow', label: '⚙️ Workflow' },
    { id: 'link', label: '🔗 Unsub Link' },
  ];

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
          <div className="card" style={{ marginBottom: '20px' }}>
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
                  className={`btn-send ${sendStatus === 'success' ? 'btn-send-success' : ''} ${!cleanedList || cleanedList.length === 0 ? 'btn-send-disabled' : ''}`}
                  style={!cleanedList || cleanedList.length === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                  disabled={sending || !cleanedList || cleanedList.length === 0}
                >
                  {sending ? 'Sending...' : sendStatus === 'success' ? '✓ Sent!' : '🚀 Send'}
                </button>
              </div>
              {(!cleanedList || cleanedList.length === 0) && (
                <p className="webhook-helper-text" style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px', fontStyle: 'italic' }}>Paste your webhook URL above. Send button activates after emails are cleaned.</p>
              )}
              {sendStatus === 'success' && (
                <p className="send-status success">✓ {cleanedList.length} emails sent successfully to your webhook</p>
              )}
              {sendStatus === 'error' && (
                <p className="send-status error">✕ Send failed — check the webhook URL and try again</p>
              )}
            </div>
          </div>
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

        {/* RIGHT — Tabbed Panel */}
        <div className="right-col">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Tab Bar */}
            <div style={{ display: 'flex', background: '#151820', borderBottom: '1px solid #2a2d37' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '12px 8px',
                    border: 'none',
                    background: activeTab === tab.id ? '#1a1d27' : 'transparent',
                    color: activeTab === tab.id ? '#fff' : '#6b7280',
                    fontSize: '13px',
                    fontWeight: activeTab === tab.id ? '600' : '400',
                    cursor: 'pointer',
                    borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span style={{ marginLeft: '4px', fontSize: '11px', color: activeTab === tab.id ? '#9ca3af' : '#4b5563' }}>
                      ({tab.count})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ padding: '20px' }}>

              {/* TAB 1: UNSUBSCRIBERS */}
              {activeTab === 'unsub' && (
                <div>
                  <p className="unsub-desc">Automatically removed from every export. Stored in your Supabase database.</p>
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
              )}

              {/* TAB 2: WORKFLOW */}
              {activeTab === 'workflow' && (
                <div>
                  <p className="unsub-desc">Generate a ready-to-import n8n workflow JSON for a new webinar. Paste your WebinarKit Webinar ID below.</p>
                  <div className="unsub-input-row" style={{ marginTop: '12px' }}>
                    <input
                      type="text"
                      value={webinarId}
                      onChange={(e) => setWebinarId(e.target.value)}
                      placeholder="Paste Webinar ID here..."
                      className="unsub-input"
                    />
                    <button
                      onClick={generateN8nWorkflow}
                      className={`btn-unsub-add ${jsonReady ? 'btn-send-success' : ''}`}
                      style={{ minWidth: '110px', background: jsonReady ? '#16a34a' : '#3b82f6' }}
                    >
                      {jsonReady ? '✓ Copied!' : '📋 Copy Workflow'}
                    </button>
                  </div>
                  <p className="unsub-hint" style={{ marginTop: '8px' }}>Find your Webinar ID in WebinarKit → Settings → the ID in the URL</p>
                  <div style={{ borderTop: '1px solid #2a2d37', marginTop: '16px', paddingTop: '16px' }}>
                    <p style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>📝 After copying:</p>
                    {['Open n8n → Workflows → Import from URL or paste clipboard', 'Ctrl+V to paste the workflow JSON', 'Connect your WebinarKit API credential', 'Activate the workflow — webhook URL is already set above!'].map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ background: '#3b82f6', color: 'white', width: '20px', height: '20px', minWidth: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' }}>{i + 1}</span>
                        <span style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '1.4' }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: UNSUB LINK */}
              {activeTab === 'link' && (
                <div>
                  <p className="unsub-desc">Add this link to the bottom of your WebinarKit emails so people can unsubscribe themselves.</p>

                  {/* Raw link */}
                  <div style={{ background: '#252830', border: '1px solid #3a3d4a', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', marginBottom: '12px' }}>
                    <code style={{ flex: 1, color: '#60a5fa', fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: '1.4' }}>{UNSUB_LINK}</code>
                    <button onClick={copyUnsubLink} style={{ background: copied ? '#16a34a' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                      {copied ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  </div>

                  {/* Email text preview */}
                  <p style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Paste this text in your emails:</p>
                  <div style={{ background: '#252830', border: '1px solid #3a3d4a', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px' }}>
                    <p style={{ color: '#d1d5db', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                      We'd hate to see you go, but if you want to stop all future emails, <span style={{ color: '#60a5fa', textDecoration: 'underline' }}>click here to opt out</span>.
                    </p>
                  </div>

                  {/* Copy HTML */}
                  <div style={{ background: '#252830', border: '1px solid #3a3d4a', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <code style={{ flex: 1, color: '#60a5fa', fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: '1.4' }}>
                      {'<a href="' + UNSUB_LINK + '">click here to opt out</a>'}
                    </code>
                    <button onClick={copyHtmlLink} style={{ background: copiedHtml ? '#16a34a' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                      {copiedHtml ? '✓ Copied!' : '📋 HTML'}
                    </button>
                  </div>

                  <p className="unsub-hint">💡 <strong>{'{{email}}'}</strong> is a WebinarKit variable — it becomes the recipient's real email.</p>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

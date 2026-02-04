export async function onRequestPost(context) {
  try {
    const webhookUrl = context.request.headers.get('X-Webhook-URL');

    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: 'Missing X-Webhook-URL header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Read the raw CSV bytes from the request
    const csvBytes = await context.request.arrayBuffer();

    // Build a multipart/form-data file upload manually
    // This is exactly how browsers upload files via <input type="file">
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);
    const encoder = new TextEncoder();

    const prefix = encoder.encode(
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="data"; filename="data.csv"\r\n' +
      'Content-Type: text/csv\r\n' +
      '\r\n'
    );
    const suffix = encoder.encode('\r\n--' + boundary + '--\r\n');

    // Combine: prefix + csv bytes + suffix
    const combined = new Uint8Array(prefix.length + csvBytes.byteLength + suffix.length);
    combined.set(prefix, 0);
    combined.set(new Uint8Array(csvBytes), prefix.length);
    combined.set(suffix, prefix.length + csvBytes.byteLength);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: combined.buffer,
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
      },
    });

    const responseText = await response.text();

    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      message: responseText,
    }), {
      status: response.ok ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

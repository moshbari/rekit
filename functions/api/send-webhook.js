export async function onRequestPost(context) {
  try {
    const webhookUrl = context.request.headers.get('X-Webhook-URL');

    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: 'Missing X-Webhook-URL header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Buffer the entire body
    const rawBody = await context.request.arrayBuffer();

    // Forward to n8n with explicit Content-Length
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: rawBody,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Length': rawBody.byteLength.toString(),
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

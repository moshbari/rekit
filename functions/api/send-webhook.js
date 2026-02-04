export async function onRequestPost(context) {
  try {
    // Webhook URL comes in the header, raw CSV is the body
    const webhookUrl = context.request.headers.get('X-Webhook-URL');

    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: 'Missing X-Webhook-URL header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Read the raw body as-is (binary)
    const rawBody = await context.request.arrayBuffer();

    // Forward directly to n8n — identical to Postman binary upload
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: rawBody,
      headers: {
        'Content-Type': 'application/octet-stream',
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

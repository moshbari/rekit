export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { webhookUrl, csvData } = body;

    if (!webhookUrl || !csvData) {
      return new Response(JSON.stringify({ error: 'Missing webhookUrl or csvData' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Forward the CSV to the n8n webhook as binary (exactly like Postman does)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: csvData,
      headers: {
        'Content-Type': 'text/csv',
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

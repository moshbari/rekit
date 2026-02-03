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

    // Build a proper file upload — exactly like Postman binary file upload
    const formData = new FormData();
    const blob = new Blob([csvData], { type: 'text/csv' });
    formData.append('file', blob, 'leads.csv');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
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

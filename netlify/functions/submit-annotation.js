const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Google Script returned an error: ${response.statusText}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'success' }),
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to submit annotation.' }),
    };
  }
};
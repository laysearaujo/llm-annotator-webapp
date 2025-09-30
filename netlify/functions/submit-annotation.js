const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body);

      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'success' }),
      };

    } catch (error) {
      console.error('Error in POST:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to submit annotation.' }),
      };
    }
  }

  if (event.httpMethod === 'GET') {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL);
      const data = await response.json();

      return {
        statusCode: 200,
        body: JSON.stringify(data),
      };

    } catch (error) {
      console.error('Error in GET:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch completed questions.' }),
      };
    }
  }

  return {
    statusCode: 405,
    body: 'Method Not Allowed',
  };
};
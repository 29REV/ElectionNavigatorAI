const axios = require('axios');

async function test() {
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      sessionId: 'test-session',
      message: 'Hello'
    });
    console.log('RESPONSE:', response.data);
  } catch (error) {
    console.error('ERROR:', error.response ? error.response.data : error.message);
  }
}

test();

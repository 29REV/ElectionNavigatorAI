const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');

router.post('/', async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message are required' });
  }

  try {
    console.log("Incoming request:", sessionId, message);

    const response = await aiService.handleMessage(sessionId, message);

    console.log("AI response:", response);

    res.json({ response });
  } catch (error) {
    console.error('🔥 FULL ERROR:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

module.exports = router;
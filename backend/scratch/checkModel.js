const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    // There isn't a direct listModels in the standard SDK easily accessible this way,
    // but we can try to use a known good model.
    // Let's try 'gemini-1.5-flash' again or 'gemini-1.5-pro'.
    
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });
    const result = await model.generateContent("test");
    console.log("SUCCESS:", result.response.text());
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}

listModels();

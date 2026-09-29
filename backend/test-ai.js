require('dotenv').config({ path: 'C:/Users/dokha/Desktop/Toeic-Hub/backend/.env' });
const { GoogleGenAI } = require('@google/genai');

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: 'Say hello in 3 words'
    });
    console.log("Response:", response.text);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();

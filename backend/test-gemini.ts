import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function run() {
  try {
    console.log('Testing Gemini API...');
    console.log('API Key available:', !!process.env.GEMINI_API_KEY);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Respond with exactly: "Hello World"',
    });

    console.log('Success!');
    console.log('Response:', response.text);
  } catch (error: any) {
    console.error('Error testing Gemini API:');
    console.error(error);
    if (error.response) {
       console.error('Response details:', error.response);
    }
  }
}

run();

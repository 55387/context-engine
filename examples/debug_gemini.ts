import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';
config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        // There isn't a direct listModels on the client instance in older SDK versions or it's on a manager
        // In strict GoogleGenerativeAI SDK (node), it might not expose listModels easily without looking at docs,
        // but let's try a simple generation to a known-valid free model if possible.

        // Actually, let's try to just output what we can guess.
        console.log('Testing gemini-1.5-flash...');
        const result = await model.generateContent('Hi');
        console.log('Success:', await result.response.text());
    } catch (e: any) {
        console.error('Error during test:', e.message);
    }
}

listModels();

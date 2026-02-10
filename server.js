const express = require('express');
const axios = require('axios');
require('dotenv').config();

const server = express();
server.use(express.json());

// Configuration
const CONTACT_MAIL = "kashish2574.be23@chitkara.edu.in";
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// --- Logic Utilities ---

const MathEngine = {
    // Generates sequence up to 'count' terms
    generateFib: (count) => {
        if (count < 0) throw new Error("Negative input restricted");
        if (count === 0) return [];
        if (count === 1) return [0];

        const sequence = [0, 1];
        while (sequence.length < count) {
            const nextVal = sequence[sequence.length - 1] + sequence[sequence.length - 2];
            sequence.push(nextVal);
        }
        return sequence;
    },

    checkPrime: (val) => {
        if (val < 2) return false;
        for (let i = 2; i <= Math.sqrt(val); i++) {
            if (val % i === 0) return false;
        }
        return true;
    },

    findGCD: (x, y) => (!y ? x : MathEngine.findGCD(y, x % y)),

    findLCM: (x, y) => (x * y) / MathEngine.findGCD(x, y)
};

// --- External Integration ---

async function fetchGeminiInsight(prompt) {
    try {
        if (!GEMINI_KEY) throw new Error("Missing API Credentials");

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
        
        const payload = {
            contents: [{
                parts: [{ text: `Provide a one-word or very short answer for: ${prompt}` }]
            }],
            generationConfig: {
                temperature: 0.35,
                maxOutputTokens: 40
            }
        };

        const { data } = await axios.post(endpoint, payload);
        
        const rawText = data.candidates[0].content.parts[0].text;
        return rawText.replace(/[^\w\s]/gi, '').trim().split('\n')[0];

    } catch (err) {
        console.error('Gemini Service Error:', err.message);
        throw new Error("Failed to process AI request");
    }
}

// --- Route Handlers ---

// Main Processing Endpoint
server.post('/bfhl', async (req, res) => {
    try {
        const bodyKeys = Object.keys(req.body);

        if (bodyKeys.length !== 1) {
            return res.status(400).json({ is_success: false, error: "Single key operation required" });
        }

        const taskType = bodyKeys[0];
        const payload = req.body[taskType];
        let result;

        switch (taskType) {
            case 'fibonacci':
                if (typeof payload !== 'number' || payload < 0) throw new Error("Invalid Fibonacci count");
                result = MathEngine.generateFib(payload);
                break;

            case 'prime':
                if (!Array.isArray(payload)) throw new Error("Input must be a numeric array");
                result = payload.filter(n => typeof n === 'number' && MathEngine.checkPrime(n));
                break;

            case 'lcm':
                if (!Array.isArray(payload) || payload.length === 0) throw new Error("Non-empty array required");
                result = payload.reduce((a, b) => MathEngine.findLCM(a, b));
                break;

            case 'hcf':
                if (!Array.isArray(payload) || payload.length === 0) throw new Error("Non-empty array required");
                result = payload.reduce((a, b) => MathEngine.findGCD(a, b));
                break;

            case 'AI':
                if (typeof payload !== 'string' || !payload.trim()) throw new Error("Query string required");
                result = await fetchGeminiInsight(payload);
                break;

            default:
                return res.status(400).json({ is_success: false, error: "Unsupported operation" });
        }

        return res.status(200).json({
            is_success: true,
            official_email: CONTACT_MAIL,
            data: result
        });

    } catch (error) {
        res.status(400).json({ is_success: false, error: error.message });
    }
});

// Status Check
server.get('/health', (req, res) => {
    res.json({ is_success: true, official_email: CONTACT_MAIL });
});

// Fallback for undefined routes
server.use((req, res) => {
    res.status(404).json({ is_success: false, error: "Resource not found" });
});

const APP_PORT = process.env.PORT || 3000;
server.listen(APP_PORT, () => {
    console.log(`Worker active on port ${APP_PORT}`);
});
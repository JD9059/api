export default async function handler(req, res) {
    // Basic security safety check
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { rawText } = req.body;
    if (!rawText) {
        return res.status(400).json({ error: 'No text provided to parse' });
    }

    // Pulls your secret key securely from Vercel's environment settings
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'OpenAI API key missing on server' });
    }

    // Instruct the AI to act as a structured transaction coordinator
    const systemPrompt = `You are a real estate transaction data extraction expert. 
    Analyze the raw email thread or contract text provided and extract the following details. 
    Return ONLY a clean, valid JSON object matching the exact schema below. Do not include markdown code blocks, backticks, or introductory conversational text.
    
    Required JSON Schema output format:
    {
        "buyerName": "Full Name",
        "sellerName": "Full Name",
        "buyerAgent": "Email Address or blank",
        "sellerAgent": "Email Address or blank",
        "buyerAtt": "Email Address or blank",
        "sellerAtt": "Email Address or blank",
        "loanOfficer": "Email Address or blank (Ignore if email matches anmtg.com)",
        "hoa": "Email Address or blank",
        "price": "Dollar amount formatted as $XXX,XXX",
        "loanAmount": "Dollar amount formatted as $XXX,XXX",
        "loanNumber": "Digits only",
        "closeDate": "Date string",
        "approvalDate": "Date string"
    }`;

    try {
        // Send payload securely to OpenAI using standard Node fetch
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Ultra-fast, highly accurate, and extremely cheap
                response_format: { type: "json_object" }, // Forces OpenAI to output strict JSON
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: rawText }
                ]
            })
        });

        const result = await response.json();
        const aiAnalysis = JSON.parse(result.choices[0].message.content);
        
        // Return the clean structured data data-packet back to your UI
        return res.status(200).json(aiAnalysis);

    } catch (error) {
        console.error("AI Parser Error:", error);
        return res.status(500).json({ error: 'Failed to contextually process the text dump' });
    }
}

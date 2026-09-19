// Serverless Function: Civic Issue Multimodal AI Analysis (Google Gemini API)
// Endpoint: POST /api/analyze_issue

module.exports = async (req, res) => {
  // 1. Enforce POST Method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  // 2. Verify Gemini API Key Availability
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  if (!GEMINI_API_KEY) {
    return res.status(503).json({
      ai_available: false,
      error: 'AI analysis service is not configured (GEMINI_API_KEY missing).'
    });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    } else if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString('utf-8'));
      } catch (e) {
        body = {};
      }
    }
    const { image, description, category } = body;

    // 3. Input Validation & Boundary Checks
    if (!image && (!description || !description.trim())) {
      return res.status(400).json({
        error: 'Invalid request: At least an image or a description must be provided for analysis.'
      });
    }

    if (description && description.length > 2000) {
      return res.status(400).json({
        error: 'Invalid request: Description exceeds maximum allowed length of 2000 characters.'
      });
    }

    let inlineData = null;
    if (image && typeof image === 'string') {
      if (image.length > 14000000) { // ~10MB Base64 limit
        return res.status(400).json({
          error: 'Invalid request: Image size exceeds maximum allowed limit of 10MB.'
        });
      }

      let mimeType = 'image/jpeg';
      let pureBase64 = image;

      if (image.startsWith('data:')) {
        const matches = image.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1].toLowerCase();
          pureBase64 = matches[2];
        } else {
          return res.status(400).json({
            error: 'Invalid request: Malformed image data URL format.'
          });
        }
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedMimes.includes(mimeType)) {
        return res.status(400).json({
          error: `Invalid request: Unsupported image MIME type '${mimeType}'. Supported: JPEG, PNG, WEBP.`
        });
      }

      inlineData = {
        mimeType: mimeType,
        data: pureBase64
      };
    }

    // Sanitize user text inputs (No PII sent)
    const cleanDescription = (description || '').trim().replace(/[\r\n]+/g, ' ');
    const cleanCategory = (category || '').trim();

    // 4. Construct Multimodal Prompt
    const promptText = `
You are an AI civic infrastructure analysis engine for a smart city governance platform (CIVIS-AI).
Analyze the provided image and/or text description submitted by a citizen.

Tasks:
1. Determine whether the content represents a genuine public civic issue (e.g., pothole, asphalt crack, road damage, overflowing garbage bin, litter accumulation, broken streetlight, water pipe leakage, drainage overflow, open manhole).
2. If the photo shows a selfie, pet, food, indoor room, personal object, or unrelated image, set "is_valid_civic_issue" to false.
3. Classify into ONE canonical category: "Road Damage", "Garbage", "Water Leakage", "Streetlights", or "Other".
4. Assess severity level: "Low", "Moderate", "High", or "Critical".
5. Assign an integer "severity_score" from 1 to 100 based strictly on visible structural degradation or public safety hazard.
6. Provide an estimated model confidence signal ("confidence") as a float between 0.0 and 1.0.
7. Extract 2 to 4 short "detected_tags" describing key visual or contextual elements.
8. Provide a concise, actionable "recommended_action" for municipal field engineers.
9. Provide a short 1-2 sentence public user-safe "reasoning_summary" explaining the finding (do NOT include internal chain-of-thought).

Citizen Description Context: "${cleanDescription}"
User Selected Category Hint: "${cleanCategory}"

Return ONLY a raw, valid JSON object matching this exact structure:
{
  "is_valid_civic_issue": true,
  "category": "Road Damage",
  "severity": "Moderate",
  "severity_score": 68,
  "confidence": 0.91,
  "detected_tags": ["pothole", "asphalt fracture"],
  "recommended_action": "Deploy road repair crew for asphalt patching.",
  "reasoning_summary": "Surface fracture detected in road asphalt posing a vehicle safety hazard."
}
Do not include markdown code fences or preambles. Output plain JSON only.
`.trim();

    const parts = [];
    if (inlineData) {
      parts.push({ inlineData: inlineData });
    }
    parts.push({ text: promptText });

    const payload = {
      contents: [{ parts: parts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500
      }
    };

    // 5. Invoke Gemini API Endpoint
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error(`Gemini API returned HTTP ${geminiResponse.status}:`, errText);
      return res.status(502).json({
        ai_available: false,
        error: `AI provider error (${geminiResponse.status}). Analysis unavailable.`
      });
    }

    const geminiData = await geminiResponse.json();
    const candidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      console.error("Gemini API returned empty candidate response:", JSON.stringify(geminiData));
      return res.status(502).json({
        ai_available: false,
        error: "AI provider returned empty response."
      });
    }

    // 6. Clean & Parse JSON Output
    let rawJson = candidateText.trim();
    if (rawJson.startsWith('```json')) {
      rawJson = rawJson.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (rawJson.startsWith('```')) {
      rawJson = rawJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawJson);
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON output:", rawJson, parseErr);
      return res.status(502).json({
        ai_available: false,
        error: "AI provider response parsing error."
      });
    }

    // 7. Validate & Normalize Output Schema
    const canonicalCategories = ['Road Damage', 'Garbage', 'Water Leakage', 'Streetlights'];
    let finalCategory = (parsedResult.category || '').trim();
    if (!canonicalCategories.includes(finalCategory)) {
      finalCategory = 'Other';
    }

    const validSeverities = ['Low', 'Moderate', 'High', 'Critical'];
    let finalSeverity = (parsedResult.severity || '').trim();
    if (!validSeverities.includes(finalSeverity)) {
      finalSeverity = 'Moderate';
    }

    let rawScore = parseInt(parsedResult.severity_score, 10);
    if (isNaN(rawScore)) rawScore = 50;
    const finalSeverityScore = Math.max(1, Math.min(100, rawScore));

    let rawConf = parseFloat(parsedResult.confidence);
    if (isNaN(rawConf)) rawConf = 0.85;
    const finalConfidence = Math.max(0.0, Math.min(1.0, rawConf));

    const finalResponse = {
      ai_available: true,
      is_valid_civic_issue: typeof parsedResult.is_valid_civic_issue === 'boolean' ? parsedResult.is_valid_civic_issue : true,
      category: finalCategory,
      severity: finalSeverity,
      severity_score: finalSeverityScore,
      confidence: finalConfidence,
      detected_tags: Array.isArray(parsedResult.detected_tags) ? parsedResult.detected_tags.slice(0, 5) : ['civic issue'],
      recommended_action: parsedResult.recommended_action || 'Inspect reported location and dispatch maintenance crew.',
      reasoning_summary: parsedResult.reasoning_summary || 'Visual and textual analysis indicates a potential civic infrastructure concern.'
    };

    return res.status(200).json(finalResponse);

  } catch (err) {
    if (err.name === 'AbortError') {
      console.error("Gemini API call timed out after 25 seconds.");
      return res.status(540 || 504).json({
        ai_available: false,
        error: 'AI analysis request timed out. Please try again.'
      });
    }
    console.error("Unhandled error in analyze_issue serverless function:", err);
    return res.status(500).json({
      ai_available: false,
      error: 'An unexpected internal error occurred during AI analysis.'
    });
  }
};

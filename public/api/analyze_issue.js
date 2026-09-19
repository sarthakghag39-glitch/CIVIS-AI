// Serverless Function: Civic Issue Multimodal AI Analysis (Groq AI / Gemini AI Provider Abstraction)
// Endpoint: POST /api/analyze_issue

const Groq = require('groq-sdk');

module.exports = async (req, res) => {
  // 1. Enforce POST Method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  // Determine Active AI Provider (Default: groq)
  const AI_PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase();

  // Groq Configuration
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

  // Gemini Configuration
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  // 2. Verify API Key Availability for active provider
  if (AI_PROVIDER === 'groq' && !GROQ_API_KEY) {
    return res.status(503).json({
      ai_available: false,
      error: 'AI analysis is temporarily unavailable. AI provider configuration is missing.'
    });
  }

  if (AI_PROVIDER === 'gemini' && !GEMINI_API_KEY) {
    return res.status(503).json({
      ai_available: false,
      error: 'AI analysis is temporarily unavailable. AI provider configuration is missing.'
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
        ai_available: false,
        error: 'Invalid request: At least an image or a description must be provided for analysis.'
      });
    }

    if (description && description.length > 2000) {
      return res.status(400).json({
        ai_available: false,
        error: 'Invalid request: Description exceeds maximum allowed length of 2000 characters.'
      });
    }

    let inlineData = null;
    if (image && typeof image === 'string') {
      // Groq Vision allows images up to 20MB Base64 (~28MB)
      const maxBase64Len = AI_PROVIDER === 'groq' ? 28000000 : 14000000;
      if (image.length > maxBase64Len) {
        return res.status(400).json({
          ai_available: false,
          error: 'AI analysis could not process this image.'
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
            ai_available: false,
            error: 'AI analysis could not process this image.'
          });
        }
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedMimes.includes(mimeType)) {
        return res.status(400).json({
          ai_available: false,
          error: 'AI analysis could not process this image.'
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

    // 4. Construct Prompt
    const promptText = `
You are an AI civic infrastructure analysis engine for a smart city governance platform (CIVIS-AI).
Analyze the provided image and/or text description submitted by a citizen.

Tasks:
1. Determine whether the content represents a genuine public civic issue (e.g., pothole, asphalt crack, road damage, overflowing garbage bin, litter accumulation, broken streetlight, water pipe leakage, drainage overflow, open manhole).
2. If the photo shows a selfie, pet, food, indoor room, personal object, or unrelated image, set "is_valid_civic_issue" to false.
3. Classify into ONE canonical category: "Road Damage", "Garbage", "Water Leakage", "Streetlights", or "Other". Prefer the citizen-selected category when it agrees with the visual evidence.
4. Assess severity level: "Low", "Medium", "High", or "Critical".
5. Assign an integer "severity_score" from 0 to 10 strictly based on visible structural degradation or public safety hazard (0 = negligible, 10 = extremely urgent/dangerous).
6. Provide an estimated AI confidence signal ("confidence") as a float between 0.0 and 1.0.
7. Extract 2 to 5 short relevant "detected_tags" describing visual/contextual elements (e.g., ["pothole", "road_damage", "traffic_hazard"]).
8. Provide a concise, actionable "recommended_action" for municipal field authorities.
9. Provide a short 1-2 sentence public user-safe "reasoning" summary explaining the finding based only on visible evidence and supplied information.
10. Set "model_version" to "${AI_PROVIDER === 'groq' ? GROQ_MODEL : GEMINI_MODEL}".

Citizen Description Context: "${cleanDescription}"
User Selected Category Hint: "${cleanCategory}"

Return ONLY a raw, valid JSON object matching this exact structure:
{
  "is_valid_civic_issue": true,
  "category": "Road Damage",
  "severity": "Medium",
  "severity_score": 7,
  "confidence": 0.91,
  "detected_tags": ["pothole", "road_damage", "traffic_hazard"],
  "recommended_action": "Deploy road repair crew for asphalt patching.",
  "reasoning": "Surface fracture detected in road asphalt posing a vehicle safety hazard.",
  "model_version": "${AI_PROVIDER === 'groq' ? GROQ_MODEL : GEMINI_MODEL}"
}
Do not include markdown code fences or preambles. Output plain JSON only.
`.trim();

    let candidateText = '';

    // ================================================================
    // PROVIDER 1: GROQ AI (Official SDK + Vision Support)
    // ================================================================
    if (AI_PROVIDER === 'groq') {
      try {
        const groq = new Groq({ apiKey: GROQ_API_KEY });
        const contentParts = [];

        if (inlineData) {
          contentParts.push({
            type: "image_url",
            image_url: {
              url: `data:${inlineData.mimeType};base64,${inlineData.data}`
            }
          });
        }
        contentParts.push({
          type: "text",
          text: promptText
        });

        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: contentParts
            }
          ],
          model: GROQ_MODEL,
          temperature: 0.2,
          max_completion_tokens: 600,
          response_format: { type: "json_object" }
        });

        candidateText = completion.choices[0]?.message?.content || '';
      } catch (groqErr) {
        console.error("Groq API Error Details:", groqErr);
        if (groqErr.status === 429 || (groqErr.message && groqErr.message.includes('rate_limit'))) {
          return res.status(429).json({
            ai_available: false,
            error: "AI analysis is temporarily unavailable due to the AI service rate limit. Please try again later."
          });
        }
        if (groqErr.status === 400 || (groqErr.message && groqErr.message.includes('image'))) {
          return res.status(400).json({
            ai_available: false,
            error: "AI analysis could not process this image."
          });
        }
        return res.status(502).json({
          ai_available: false,
          error: "AI analysis is temporarily unavailable. Please try again."
        });
      }

    // ================================================================
    // PROVIDER 2: GEMINI AI (Fallback REST Interface)
    // ================================================================
    } else {
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

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

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
        if (geminiResponse.status === 429) {
          return res.status(429).json({
            ai_available: false,
            error: "AI analysis is temporarily unavailable due to the AI service rate limit. Please try again later."
          });
        }
        return res.status(502).json({
          ai_available: false,
          error: "AI analysis is temporarily unavailable. Please try again."
        });
      }

      const geminiData = await geminiResponse.json();
      candidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (!candidateText) {
      console.error("AI provider returned empty response.");
      return res.status(502).json({
        ai_available: false,
        error: "AI analysis is temporarily unavailable. Please try again."
      });
    }

    // Clean & Parse JSON Output
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
      console.error("Failed to parse AI JSON output:", rawJson, parseErr);
      return res.status(502).json({
        ai_available: false,
        error: "AI analysis is temporarily unavailable. Please try again."
      });
    }

    // Validate & Normalize Output Schema
    const canonicalCategories = ['Road Damage', 'Garbage', 'Water Leakage', 'Streetlights'];
    let finalCategory = (parsedResult.category || '').trim();
    if (!canonicalCategories.includes(finalCategory)) {
      finalCategory = 'Other';
    }

    // Map severity ("Medium" -> "Moderate", or keep valid strings)
    let rawSeverity = (parsedResult.severity || '').trim();
    if (rawSeverity === 'Medium') rawSeverity = 'Moderate';
    const validSeverities = ['Low', 'Moderate', 'High', 'Critical'];
    let finalSeverity = validSeverities.includes(rawSeverity) ? rawSeverity : 'Moderate';

    // Map severity score: scale 0..10 up to 1..100 if needed
    let rawScore = parseInt(parsedResult.severity_score, 10);
    if (isNaN(rawScore)) rawScore = 5;
    if (rawScore >= 0 && rawScore <= 10) {
      rawScore = Math.max(1, rawScore * 10);
    }
    const finalSeverityScore = Math.max(1, Math.min(100, rawScore));

    let rawConf = parseFloat(parsedResult.confidence);
    if (isNaN(rawConf)) rawConf = 0.85;
    const finalConfidence = Math.max(0.0, Math.min(1.0, rawConf));

    const reasoningText = parsedResult.reasoning || parsedResult.reasoning_summary || 'Visual and textual analysis indicates a potential civic infrastructure concern.';

    const finalResponse = {
      ai_available: true,
      is_valid_civic_issue: typeof parsedResult.is_valid_civic_issue === 'boolean' ? parsedResult.is_valid_civic_issue : true,
      category: finalCategory,
      severity: finalSeverity,
      severity_score: finalSeverityScore,
      confidence: finalConfidence,
      detected_tags: Array.isArray(parsedResult.detected_tags) ? parsedResult.detected_tags.slice(0, 5) : ['civic issue'],
      recommended_action: parsedResult.recommended_action || 'Inspect reported location and dispatch maintenance crew.',
      reasoning_summary: reasoningText,
      reasoning: reasoningText,
      model_version: AI_PROVIDER === 'groq' ? GROQ_MODEL : GEMINI_MODEL
    };

    return res.status(200).json(finalResponse);

  } catch (err) {
    if (err.name === 'AbortError') {
      console.error("AI API call timed out after 25 seconds.");
      return res.status(504).json({
        ai_available: false,
        error: 'AI analysis request timed out. Please try again.'
      });
    }
    console.error("Unhandled error in analyze_issue serverless function:", err);
    return res.status(500).json({
      ai_available: false,
      error: 'AI analysis is temporarily unavailable. Please try again.'
    });
  }
};

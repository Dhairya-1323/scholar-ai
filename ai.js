import fetch from "node-fetch";

const HF_API_KEY = process.env.HF_API_KEY;

// ================= MAIN AI RESPONSE =================
export async function askAI(profile, message) {
  try {
    const prompt = `
You are Scholar AI — a smart study abroad advisor.

Your job:
- Guide students step-by-step
- Be clear, practical, and helpful
- Never give vague answers

Student Profile:
Country: ${profile.country || "Unknown"}
Course: ${profile.course || "Unknown"}
Budget: ${profile.budget || "Unknown"}

User message:
"${message}"

Rules:
- Keep answer short (3–5 lines max)
- If unclear → ask a smart follow-up
- If user asks "what if" → guide them
- Be like a counselor, not chatbot
`;

    const response = await fetch(
      "https://api-inference.huggingface.co/models/google/flan-t5-base",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          options: { wait_for_model: true },
        }),
      }
    );

    const text = await response.text();

    // 🚨 HANDLE NON-JSON (VERY IMPORTANT)
    if (!text.startsWith("{") && !text.startsWith("[")) {
      console.log("askAI non-JSON:", text.slice(0, 100));

      return fallbackResponse(profile, message);
    }

    const data = JSON.parse(text);

    // HF error
    if (data.error) {
      console.log("HF error:", data.error);
      return fallbackResponse(profile, message);
    }

    return data[0]?.generated_text?.trim() || fallbackResponse(profile, message);

  } catch (err) {
    console.log("askAI error:", err);
    return fallbackResponse(profile, message);
  }
}

// ================= COURSE CLASSIFICATION =================
export async function classifyCourse(input) {
  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: input,
          parameters: {
            candidate_labels: ["MBA", "MBBS", "MS", "BTECH", "MTECH"],
          },
          options: { wait_for_model: true },
        }),
      }
    );

    const text = await res.text();

    // Prevent crash
    if (!text.startsWith("{") && !text.startsWith("[")) {
      console.log("HF non-JSON:", text.slice(0, 100));
      return fallbackCourse(input);
    }

    const data = JSON.parse(text);

    if (data.error) {
      console.log("HF error:", data.error);
      return fallbackCourse(input);
    }

    const best = data.labels?.[0]?.toLowerCase();
    if (!best) return fallbackCourse(input);

    if (best.includes("mba") || best.includes("business")) return "MBA";
    if (best.includes("mbbs") || best.includes("doctor") || best.includes("medical")) return "MBBS";
    if (best.includes("mtech")) return "MTECH";
    if (best.includes("engineering") || best.includes("btech")) return "BTECH";
    if (best.includes("ms") || best.includes("computer") || best.includes("data")) return "MS";

    return fallbackCourse(input);

  } catch (err) {
    console.log("classifyCourse error:", err);
    return fallbackCourse(input);
  }
}

// ================= FALLBACK COURSE =================
function fallbackCourse(input) {
  const text = input.toLowerCase();

  if (text.includes("doctor") || text.includes("medical")) return "MBBS";
  if (text.includes("business") || text.includes("management")) return "MBA";
  if (text.includes("mtech")) return "MTECH";
  if (text.includes("engineering") || text.includes("btech")) return "BTECH";
  if (
    text.includes("ai") ||
    text.includes("data") ||
    text.includes("computer") ||
    text.includes("software")
  ) {
    return "MS";
  }

  return null;
}

// ================= FALLBACK RESPONSE =================
function fallbackResponse(profile, message) {
  const text = message.toLowerCase();

  // WHAT-IF HANDLING
  if (text.includes("what if")) {
    return `Let’s explore that 👇

You can ask:
• MBA vs MBBS  
• Germany vs UK  
• 10L vs 20L loan  

Tell me what you'd like to compare.`;
  }

  // COURSE NOT SET
  if (!profile.course) {
    return "Tell me what you want to study (MBA, MBBS, MTech, MS, etc.)";
  }

  // COUNTRY NOT SET
  if (!profile.country) {
    return `Which country are you considering for ${profile.course}?`;
  }

  // BUDGET NOT SET
  if (!profile.budget) {
    return `What’s your budget for ${profile.course} in ${profile.country}?`;
  }

  // DEFAULT SMART RESPONSE
  return `I can help you compare options, calculate ROI, or suggest better countries.

What would you like to explore next?`;
}

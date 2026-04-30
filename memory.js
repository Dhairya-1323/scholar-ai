// ================= USER MEMORY =================

export let userProfile = {
  country: null,
  course: null,
  budget: null,

  // 🧠 CONTEXT MEMORY
  lastIntent: null,     // "suggestion" | "comparison" | "planning"
  lastAction: null,     // "university_followup" | "roi_followup" | etc.
  lastUpdated: null,
};

// ================= UPDATE PROFILE =================

export function updateProfile({
  country,
  course,
  budget,
  intent,
  action,
}) {
  if (country !== null && country !== undefined) {
    userProfile.country = country;
  }

  if (course !== null && course !== undefined) {
    userProfile.course = course;
  }

  if (budget !== null && budget !== undefined) {
    userProfile.budget = budget;
  }

  if (intent) {
    userProfile.lastIntent = intent;
  }

  if (action !== undefined) {
    userProfile.lastAction = action;
  }

  userProfile.lastUpdated = Date.now();
}

// ================= RESET MEMORY =================

export function resetProfile() {
  userProfile.country = null;
  userProfile.course = null;
  userProfile.budget = null;
  userProfile.lastIntent = null;
  userProfile.lastAction = null;
  userProfile.lastUpdated = null;
}

// ================= FOLLOW-UP DETECTION =================

export function isFollowUpQuery(text) {
  const followUpKeywords = [
    "what about",
    "and",
    "also",
    "then",
    "next",
    "more",
    "tell me more",
    "details",
    "yes",
    "yeah",
    "yep",
    "ok",
    "okay",
  ];

  return followUpKeywords.some((k) => text === k || text.includes(k));
}

// ================= INTENT DETECTION =================

export function detectIntent(text) {
  if (text.includes("vs") || text.includes("compare")) {
    return "comparison";
  }

  if (
    text.includes("suggest") ||
    text.includes("cheaper") ||
    text.includes("best option") ||
    text.includes("recommend")
  ) {
    return "suggestion";
  }

  if (text.includes("roi") || text.includes("return")) {
    return "roi";
  }

  if (
    text.includes("university") ||
    text.includes("college") ||
    text.includes("colleges")
  ) {
    return "university";
  }

  if (
    text.includes("study") ||
    text.includes("plan") ||
    text.includes("budget")
  ) {
    return "planning";
  }

  return "general";
}

// ================= HELPER: CHECK YES =================

export function isYes(text) {
  return [
    "yes",
    "yeah",
    "yep",
    "ok",
    "okay",
    "sure",
    "yes please",
  ].includes(text);
}
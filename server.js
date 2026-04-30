import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { isYes } from "./memory.js";
import {
  calculateLoanDetails,
  estimateSalary,
  calculateROI,
  buildResponse,
  searchUniversities,
  suggestCountries,
} from "./utils.js";
import { classifyCourse } from "./ai.js";
import { userProfile, updateProfile } from "./memory.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ================= STREAM =================
function streamResponse(res, text) {
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Transfer-Encoding", "chunked");

  const words = text.split(" ");
  let i = 0;

  const interval = setInterval(() => {
    if (i < words.length) {
      res.write(words[i] + " ");
      i++;
    } else {
      clearInterval(interval);
      res.end();
    }
  }, 20);
}

// ================= MAIN =================
app.post("/chat", async (req, res) => {
  const { message } = req.body;
  const text = message.toLowerCase().trim();

   // ================= FOLLOW-UP (YES HANDLER) =================
  if (isYes(text)) {

  // ROI FOLLOW-UP
  if (userProfile.lastAction === "roi_followup") {
    updateProfile({ action: null });

    const better = suggestCountries(userProfile.budget);

    return streamResponse(
      res,
      `Good thinking 👍 If ROI matters most, here are smarter options:

Germany — very low tuition, strong ROI  
Italy — affordable with scholarships  
China — lowest overall cost  

Compared to ${userProfile.country}, these reduce financial pressure.

Which one should I break down for you?`
    );
  }

  // UNIVERSITY FOLLOW-UP
  if (userProfile.lastAction === "university_followup") {
    updateProfile({ action: null });

    const universities = await searchUniversities(
      `${userProfile.course} affordable universities in ${userProfile.country}`
    );

    return res.json({
      text: `Nice 👍 Here are more budget-friendly universities:`,

      recommendations: universities.slice(0, 5),

      followUp:
        "Do you want ROI comparison or admission difficulty for these?",
    });
  }

  //  NEW: GENERIC FALLBACK
  return streamResponse(
    res,
    `Got it 👍 What would you like to explore next?

I can:
• Suggest universities  
• Compare countries  
• Analyze ROI`
  );
}

  // ================= GREETING =================
  const greetings = ["hi", "hello", "hey"];
  const isShortGreeting =
    greetings.some((g) => text.startsWith(g)) && text.length < 15;

  if (greetings.includes(text) || isShortGreeting) {
    return res.json({
      text: "Hey 👋 Tell me your plan — course, country, or budget.",
    });
  }

  // ================= RESET =================
  if (text.includes("reset")) {
    userProfile.country = null;
    userProfile.course = null;
    userProfile.budget = null;

    return streamResponse(res, "Starting fresh. What do you want to study?");
  }

  let country = null;
  let course = null;
  let budget = null;

  // ================= COUNTRY =================
  const countryMap = {
    germany: "Germany",
    italy: "Italy",
    china: "China",
    usa: "USA",
    uk: "UK",
  };

  Object.keys(countryMap).forEach((k) => {
    if (text.includes(k)) country = countryMap[k];
  });

  // ================= COURSE =================
  const courses = ["mba", "mbbs", "ms", "btech", "mtech"];
  courses.forEach((c) => {
    if (text.includes(c)) course = c.toUpperCase();
  });

  if (!course) {
    const aiCourse = await classifyCourse(text);
    if (aiCourse) course = aiCourse;
  }

  // ================= CONTEXT RESET =================
  if (course && course !== userProfile.course) {
    userProfile.country = null;
    userProfile.budget = null;
  }

  // ================= BUDGET =================
  const range = text.match(/(\d+)\s?-\s?(\d+)/);
  if (range) {
    budget = ((parseInt(range[1]) + parseInt(range[2])) / 2) * 100000;
  } else {
    const match = text.match(/(\d+)/);
    if (match) {
      const value = parseInt(match[1]);
      budget = value < 1000 ? value * 100000 : value;
    }
  }

  updateProfile({
    country: country || userProfile.country,
    course: course || userProfile.course,
    budget: budget || userProfile.budget,
  });
  // ================= WHAT-IF: SINGLE LOAN =================
if (text.includes("what if") && text.includes("loan")) {
  const match = text.match(/(\d+)\s*(l|lakh|lakhs)/);

  if (match) {
    const amount = parseInt(match[1]) * 100000;

    const loan = calculateLoanDetails(amount, 10, 10);

    return res.json({
      type: "loan_single",
      data: {
        amount,
        emi: loan.emi,
        total: loan.total,
        interest: loan.interest,
      },
      text: `Here’s what taking a ₹${amount / 100000}L loan looks like.`,
    });
  }
}
// ================= WHAT-IF: COUNTRY COMPARISON =================
const countryMatch = text.match(/(usa|uk|germany|italy|china)\s*vs\s*(usa|uk|germany|italy|china)/);

if (countryMatch) {
  const c1 = countryMatch[1].toUpperCase();
  const c2 = countryMatch[2].toUpperCase();

  const costMap = {
    USA: { tuition: "₹20L–₹50L/yr", living: "₹80K–₹2L/mo", roi: "5–7 yrs" },
    UK: { tuition: "₹18L–₹45L/yr", living: "₹80K–₹1.8L/mo", roi: "4–6 yrs" },
    GERMANY: { tuition: "₹0–₹5L/yr", living: "₹60K–₹1.2L/mo", roi: "2–4 yrs" },
    ITALY: { tuition: "₹2L–₹10L/yr", living: "₹60K–₹1.2L/mo", roi: "3–5 yrs" },
    CHINA: { tuition: "₹3L–₹12L/yr", living: "₹50K–₹1L/mo", roi: "3–5 yrs" },
  };

  const best =
    c1 === "GERMANY" || c2 === "GERMANY"
      ? "GERMANY"
      : costMap[c1].roi < costMap[c2].roi
      ? c1
      : c2;

  return res.json({
    type: "country",
    data: {
      country1: { name: c1, ...costMap[c1] },
      country2: { name: c2, ...costMap[c2] },
      best,
    },
    text: `${best} generally offers a better balance of cost and ROI.`,
  });
}

// ================= WHAT-IF: STUDY PLAN =================
if (text.includes("what if") && text.includes("study")) {
  const courseMatch = text.match(/(mba|mbbs|ms|mtech|btech)/);
  const countryMatch = text.match(/(usa|uk|germany|italy|china)/);

  if (courseMatch && countryMatch) {
    const course = courseMatch[1].toUpperCase();
    const country = countryMatch[1].toUpperCase();

    const loan = calculateLoanDetails(userProfile.budget || 2000000, 10, 10);
    const salary = estimateSalary(country, course);

    return res.json({
      type: "plan",
      data: {
        course,
        country,
        salary,
        emi: loan.emi,
        roi: Math.round((userProfile.budget || 2000000) / salary),
      },
      text: `Here’s a rough idea of what your plan could look like.`,
    });
  }
}

  // ================= WHAT-IF / COMPARISON =================
if (text.includes("vs") || text.includes("compare")) {

  // loan comparison
  const loanMatch = text.match(/(\d+)\s*l.*?(\d+)\s*l/);

  if (loanMatch) {
    const amount1 = parseInt(loanMatch[1]) * 100000;
    const amount2 = parseInt(loanMatch[2]) * 100000;

    const option1 = calculateLoanDetails(amount1, 10, 10);
    const option2 = calculateLoanDetails(amount2, 10, 10);

   return res.json({
  type: "loan",
  data: {
    amount1,
    amount2,
    option1,
    option2,
    best: option1.emi < option2.emi ? "lower" : "higher",
  },
text: `This gives you a clear idea of how your EMI changes with loan size.

A higher loan increases pressure every month, so choosing the right amount is important for long-term stability.`,});
  }

  // course comparison
  // ================= COURSE COMPARISON =================
const parts = text.split("vs");

if (parts.length === 2) {
  const course1 = parts[0].trim().toUpperCase();
  const course2 = parts[1].trim().toUpperCase();

  // validate courses (prevents crash)
  const validCourses = ["MBA", "MBBS", "MS", "BTECH", "MTECH"];

  if (validCourses.includes(course1) && validCourses.includes(course2)) {
   const salary1 = estimateSalary("USA", course1) + Math.floor(Math.random() * 20000);
const salary2 = estimateSalary("USA", course2) + Math.floor(Math.random() * 20000);

    const roi1 = Math.round((3000000 / salary1) * 10) / 10;
const roi2 = Math.round((3000000 / salary2) * 10) / 10;  
    const better = roi1 < roi2 ? course1 : course2;

    return res.json({
      type: "course",
      data: {
        course1: {
          name: course1,
          salary: salary1,
          roi: roi1,
         pros: [
  "Better long-term salary growth, especially in international roles",
  "Stronger global exposure and career mobility"
],
cons: [
  "Higher initial investment and financial pressure",
  "Admissions can be competitive depending on the university"
],
        },
        course2: {
          name: course2,
          salary: salary2,
          roi: roi2,
         pros: [
  "Lower overall cost, easier on finances",
  "Quicker entry into the job market"
],
cons: [
  "Salary growth may be slower compared to premium degrees",
  "Fewer global opportunities depending on specialization"
],
        },
        best: better,
      },
text: `If you're thinking from a financial perspective, ${better} is the stronger option here.

It gives you better return over time and more flexibility after graduation.

But the right choice still depends on whether you prefer faster recovery or long-term growth.`,    });
  }
}
}

 // ================= ROI =================
if (text.includes("roi")) {
  const loan = calculateLoanDetails(userProfile.budget, 10, 10);
  const salary = estimateSalary(userProfile.country, userProfile.course);
  const roi = calculateROI(userProfile.budget, salary, loan.emi);

  const saving = salary - loan.emi;

  return streamResponse(
    res,
    `Good question — this is exactly how you should think about it.

If you study ${userProfile.course} in ${userProfile.country}, your expected starting salary could be around ₹${salary}/month.

After paying your EMI of ₹${loan.emi}, you’ll still have roughly ₹${saving} left each month.

That means you recover your full investment in about ${roi.roiYears} years.

👉 In simple terms: ${
      roi.roiYears < 3
        ? "this is a very strong financial decision"
        : roi.roiYears < 5
        ? "this is decent, but not the fastest return"
        : "this is slow — you’re taking higher financial risk"
    }.

If your goal is to reduce pressure and recover faster, I’d suggest looking at cheaper countries.

Do you want me to show you better ROI options?`
  );
}

  // ================= BREAKDOWN =================
  if (text.includes("breakdown")) {
    return streamResponse(
      res,
      `Tuition: ₹20–50L/year
Living: ₹60K–1.2L/month

Germany has low tuition, so most cost is living.`
    );
  }

// ================= UNIVERSITIES =================
if (
  text.includes("university") ||
  text.includes("universities") ||
  text.includes("college") ||
  text.includes("colleges")
) {
  //  curated fallback (prevents blog links)
  const curated = {
    UK: [
      { name: "University of Oxford", link: "https://www.ox.ac.uk" },
      { name: "University of Cambridge", link: "https://www.cam.ac.uk" },
      { name: "Imperial College London", link: "https://www.imperial.ac.uk" },
      { name: "King's College London", link: "https://www.kcl.ac.uk" },
      { name: "University of Edinburgh", link: "https://www.ed.ac.uk" },
    ],
    Germany: [
      { name: "Heidelberg University", link: "https://www.uni-heidelberg.de" },
      { name: "LMU Munich", link: "https://www.lmu.de" },
      { name: "Charité Berlin", link: "https://www.charite.de" },
      { name: "University of Freiburg", link: "https://www.uni-freiburg.de" },
      { name: "University of Tübingen", link: "https://uni-tuebingen.de" },
    ],
  };

  const list =
    curated[userProfile.country] ||
    (await searchUniversities(
      `${userProfile.course} universities in ${userProfile.country}`
    ));

  updateProfile({ action: "university_followup" });

  return res.json({
    text: `Good choice 👍 If you're targeting ${userProfile.country}, these are strong options you should seriously consider:`,

    recommendations: list.slice(0, 5),

    followUp:
      "Do you want options that are easier to get into, or ones with better ROI?",
  });
}

  // ================= SMART FLOW =================
  if (!userProfile.course) {
    return streamResponse(res, "What do you want to study?");
  }

  if (userProfile.course && userProfile.budget && !userProfile.country) {
    const suggested = suggestCountries(userProfile.budget);

    return streamResponse(
      res,
      `Based on your budget:

• ${suggested.slice(0, 3).join("\n• ")}

Which one interests you?`
    );
  }

  if (userProfile.course && !userProfile.country) {
    return streamResponse(res, `Which country for ${userProfile.course}?`);
  }

  if (userProfile.course && userProfile.country && !userProfile.budget) {
    return streamResponse(
      res,
      `What’s your budget for ${userProfile.course} in ${userProfile.country}?`
    );
  }

  // ================= FINAL =================
  const suggested = suggestCountries(userProfile.budget);

  let bestCountry = userProfile.country;

  if (!userProfile.country) {
    if (userProfile.budget <= 2000000) bestCountry = "Germany";
    else if (userProfile.budget <= 4000000)
      bestCountry = userProfile.course === "MBBS" ? "Germany" : "Italy";
    else bestCountry = "USA";
  }

  const targetCountry = userProfile.country || bestCountry;

  const universities = await searchUniversities(
    `${userProfile.course} university ${targetCountry}`
  );

  const structured = buildResponse({
    country: targetCountry,
    course: userProfile.course,
    budget: userProfile.budget,
    universities,
  });

  const summary = "Here’s a quick overview of your plan:";

  const advisorData = !userProfile.country
    ? {
        bestCountry,
        alternatives: [...new Set(suggested)].filter(
          (c) => c !== bestCountry
        ),
      }
    : null;

  return res.json({
    ...structured,
    advisor: advisorData,
    summary,
  });
});

app.listen(5000, () =>
  console.log("Server running on http://localhost:5000")
);
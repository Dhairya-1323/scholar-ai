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
  return streamResponse(
    res,
    "Hey 👋 Tell me your plan — course, country, or budget."
  );
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
  const finalCourse = course || userProfile.course;
const finalCountry = country || userProfile.country;
const finalBudget = budget || userProfile.budget;



// ================= COURSE BUT NO COUNTRY =================
if (finalCourse && !finalCountry) {
  if (finalBudget) {
    const suggested = suggestCountries(finalBudget);

    return streamResponse(
      res,
      `Based on your budget, these countries fit well 👇

• ${suggested.slice(0, 3).join("\n• ")}

Which one are you interested in?`
    );
  }

  return streamResponse(res, `Which country for ${finalCourse}?`);
}

// ================= FOLLOW-UP COUNTRY =================
if (country && finalCourse && finalBudget) {
  const universities = await searchUniversities(
    `${finalCourse} universities in ${country}`
  );

  const structured = buildResponse({
    country,
    course: finalCourse,
    budget: finalBudget,
    universities,
  });

  return res.json({
  text: `Great choice 👍 — here’s how your ${finalCourse} journey in ${country} would look 👇

🎓 Investment side:
You’ll need to manage tuition + living costs carefully.

💼 Return side:
Salary potential is decent, but recovery speed matters here.

📊 What this means:
This helps you understand how financially comfortable this path will be.

👉 Here are the exact numbers:`,

  recommendations: structured.recommendations,

  details: {
    cost: structured.cost,
    loan: structured.loan,
    roi: structured.roi,
  },

  followUp: `What would you like to explore next?

• 🎓 Universities  
• 📊 ROI breakdown  
• ⚖️ Compare countries`,
});
}

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
const loanMatch = text.match(/(\d+)\s*(l|lakh|lakhs)?\s*vs\s*(\d+)\s*(l|lakh|lakhs)?/);
 if (loanMatch) {
  const amount1 = parseInt(loanMatch[1]) * 100000;
  const amount2 = parseInt(loanMatch[3]) * 100000;

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
// ================= FOLLOW-UP INTENTS =================

// ROI follow-up
if (text.includes("roi") || text.includes("breakdown")) {
  const loan = calculateLoanDetails(userProfile.budget, 10, 10);
  const salary = estimateSalary(userProfile.country, userProfile.course);
  const roi = calculateROI(userProfile.budget, salary, loan.emi);

  return streamResponse(
    res,
    `Here’s your detailed ROI 👇

Salary: ₹${salary}
EMI: ₹${loan.emi}
Savings: ₹${salary - loan.emi}

Recovery time: ${roi.roiYears} years`
  );
}

// comparison follow-up
if (
  text.includes("compare") ||
  text.includes("better roi") ||
  text.includes("better option") ||
  text.includes("cheaper country")
) {
  const suggested = suggestCountries(userProfile.budget);

  return streamResponse(
    res,
    `Here are better options based on ROI 👇

• ${suggested.slice(0, 3).join("\n• ")}

Which one do you want to explore?`
  );
}

// ================= ROI =================
if (
  text.includes("roi") &&
  !text.includes("compare") &&
  !text.includes("country")
) {

  // ✅ guard check
  if (!userProfile.course || !userProfile.country || !userProfile.budget) {
    return streamResponse(
      res,
      "I need your course, country, and budget to calculate ROI properly."
    );
  }

  const loan = calculateLoanDetails(userProfile.budget, 10, 10);
  const salary = estimateSalary(userProfile.country, userProfile.course);
  const roi = calculateROI(userProfile.budget, salary, loan.emi);

  const saving = salary - loan.emi;

  updateProfile({ action: "roi_followup" });

 return streamResponse(
  res,
  `Here’s a clear breakdown of your ROI 👇

💼 Monthly Income:
₹${salary}

💳 Loan EMI:
₹${loan.emi}

💰 Real Savings:
₹${saving} per month

⏱ Recovery Time:
${roi.roiYears} years

👉 What this means:
${
  roi.roiYears < 3
    ? "You can recover your investment quickly — this is financially strong."
    : roi.roiYears < 5
    ? "This is manageable, but requires planning."
    : "This is slow — you should consider lower-cost options."
}`
);
}

// ================= UNIVERSITIES =================
const isUniversityQuery =
  /(universit|college)/.test(text);

if (isUniversityQuery) {
  // curated (high quality)
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
    USA: [
      { name: "Harvard University", link: "https://www.harvard.edu" },
      { name: "Stanford University", link: "https://www.stanford.edu" },
      { name: "MIT", link: "https://www.mit.edu" },
      { name: "University of Chicago", link: "https://www.uchicago.edu" },
      { name: "Columbia University", link: "https://www.columbia.edu" },
    ],
  };

  //  missing course
  if (!userProfile.course) {
    return streamResponse(res, "What do you want to study?");
  }

  //  missing country → guide properly
  if (!userProfile.country) {
    if (userProfile.budget) {
      const suggested = suggestCountries(userProfile.budget);

      updateProfile({ action: "country_suggestion" });

      return streamResponse(
        res,
        `Based on your budget, these countries fit well 👇

• ${suggested.slice(0, 3).join("\n• ")}

Which country should I show universities for?`
      );
    }

    return streamResponse(
      res,
      `Which country are you targeting for ${userProfile.course}?`
    );
  }

  // HYBRID LOGIC
  let list = curated[userProfile.country];

  if (!list || list.length === 0) {
    list = await searchUniversities(
      `${userProfile.course} universities in ${userProfile.country}`
    );
  }

  if (!list || list.length === 0) {
    list = [
      {
        name: `Top universities in ${userProfile.country}`,
        link: `https://www.google.com/search?q=${encodeURIComponent(
          userProfile.course + " universities in " + userProfile.country
        )}`,
      },
      {
        name: `${userProfile.country} university list`,
        link: `https://en.wikipedia.org/wiki/List_of_universities_in_${userProfile.country}`,
      },
    ];
  }

  updateProfile({ action: "university_followup" });

  return res.json({
    text: curated[userProfile.country]
      ? `Top universities you should consider in ${userProfile.country} 👇`
      : `Here are some universities you can explore in ${userProfile.country} 👇`,

    recommendations: list.slice(0, 5),

    followUp: "Do you want safer options or better ROI?",
  });
}
// ================= SAFER OPTIONS =================
if (text.includes("safer")) {
  const suggested = suggestCountries(userProfile.budget);

  return streamResponse(
    res,
    `If you want safer financial options, consider 👇

• ${suggested.slice(0, 3).join("\n• ")}

These reduce cost and risk compared to ${userProfile.country}.

Which one do you want to explore?`
  );
}

// ================= AUTO PLAN =================
if (
  finalCourse &&
  finalCountry &&
  finalBudget &&
  !text.includes("vs") &&   // 
  (
    country ||
    budget ||
    text.includes("plan")
  )
) {  const universities = await searchUniversities(
    `${finalCourse} universities in ${finalCountry}`
  );

  const structured = buildResponse({
    country: finalCountry,
    course: finalCourse,
    budget: finalBudget,
    universities,
  });

  return res.json({
  text: `Alright — here’s a clear breakdown of your ${finalCourse} plan in ${finalCountry} 👇

🎓 Investment side:
You’re looking at tuition + living costs that add up significantly, so planning finances properly is important.

💼 Return side:
The salary potential after graduation is strong, which helps in faster recovery.

📊 What this means:
This gives you a realistic idea of how quickly you can recover your investment and how much financial pressure you'll face.

👉 Here are the exact numbers so you can evaluate this clearly:`,

  recommendations: structured.recommendations,

  details: {
    cost: structured.cost,
    loan: structured.loan,
    roi: structured.roi,
  },

  followUp: `What would you like to explore next? 👇

• 🎓 See top universities
• 📊 Get detailed ROI breakdown
• ⚖️ Compare with other countries`,
});
}
 // ================= FLEXIBLE FLOW =================

// 1. Nothing known
if (!userProfile.course && !userProfile.country && !userProfile.budget) {
  return streamResponse(
    res,
    "Tell me your plan — what do you want to study, where, or your budget?"
  );
}

// 2. Only country given
if (!userProfile.course && userProfile.country) {
  return streamResponse(
    res,
    `Nice 👍 What do you want to study in ${userProfile.country}?`
  );
}

// 3. Only course given
if (userProfile.course && !userProfile.country) {
  return streamResponse(
    res,
    `Which country are you targeting for ${userProfile.course}?`
  );
}

// 4. Only budget given
if (!userProfile.course && !userProfile.country && userProfile.budget) {
  return streamResponse(
    res,
    `Got it. What do you want to study, and in which country?`
  );
}

// 5. course + budget 
if (userProfile.course && userProfile.budget && !userProfile.country) {
  const suggested = suggestCountries(userProfile.budget);

  return streamResponse(
    res,
    `Based on your budget, these countries fit well 👇

• ${suggested.slice(0, 3).join("\n• ")}

Which country are you considering?`
  );
}

// 6. country + budget
if (!userProfile.course && userProfile.country && userProfile.budget) {
  return streamResponse(
    res,
    `What do you want to study in ${userProfile.country}?`
  );
}

// 7. country + course 
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
const advisorData = !userProfile.country
  ? {
      bestCountry,
      alternatives: [...new Set(suggested)].filter(
        (c) => c !== bestCountry
      ),
    }
  : null;

return res.json({
  text: `Here’s a quick overview of your ${userProfile.course} plan in ${targetCountry}:`,

  recommendations: structured.recommendations,

  details: {
    cost: structured.cost,
    loan: structured.loan,
    roi: structured.roi,
  },

  advisor: advisorData,
});
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);

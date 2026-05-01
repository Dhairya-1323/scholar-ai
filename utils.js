import fetch from "node-fetch";

export async function searchUniversities(query) {
  try {
    const res = await fetch(
      `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERP_API_KEY}`
    );

    const data = await res.json();

    return (data.organic_results || [])
      .filter((r) =>
        r.link &&
        !r.link.includes("blog") &&
        !r.link.includes("news") &&
        !r.link.includes("ranking") &&
        !r.link.includes("top-") &&
        !r.link.includes("list") &&
        (
          r.link.includes(".edu") ||
          r.link.includes(".ac.") ||
          r.link.match(/\/(university|college)/i)
        )
      )
      .map((r) => ({
        name: r.title
          .replace(/[-|–].*$/, "")
          .replace(/\s+/g, " ")
          .trim(),
        link: r.link,
      }))
      .slice(0, 5);

  } catch (err) {
    console.log("searchUniversities error:", err);
    return [];
  }
}
// ================= LOAN =================
export function calculateLoanDetails(P, annualRate, years) {
  const r = annualRate / (12 * 100);
  const n = years * 12;

  const emi =
    (P * r * Math.pow(1 + r, n)) /
    (Math.pow(1 + r, n) - 1);

  const total = emi * n;
  const interest = total - P;

  return {
    emi: Math.round(emi),
    total: Math.round(total),
    interest: Math.round(interest),
  };
}

// ================= SALARY =================
export function estimateSalary(country, course) {
  const data = {
    Germany: { MBA: 250000, MBBS: 200000, MTECH: 180000 },
    USA: { MBA: 500000, MBBS: 400000, MTECH: 300000 },
    China: { MBA: 200000, MBBS: 150000, MTECH: 160000 },
    Italy: { MBA: 220000, MBBS: 180000, MTECH: 170000 },
    UK: { MBA: 350000, MBBS: 250000, MTECH: 220000 },
  };

  return data[country]?.[course] || 150000;
}

// ================= ROI =================
export function calculateROI(loanAmount, monthlySalary, emi) {
  const savings = monthlySalary - emi;

  if (savings <= 0) {
    return {
      roiYears: "Not feasible",
      message: "EMI too high for expected salary.",
    };
  }

  const years = (loanAmount / savings / 12).toFixed(1);

 return {
  roiYears: parseFloat(years),  
    message: `You recover investment in ~${years} years.`,
  };
}

// ================= SMART BUILD RESPONSE =================
export function buildResponse({ country, course, budget, universities }) {
  const loanAmount = budget || 2000000;
  const loan = calculateLoanDetails(loanAmount, 10, 10);
  const salary = estimateSalary(country, course);
  const roi = calculateROI(loanAmount, salary, loan.emi);

  return {
    cost: {
      tuition: "₹20L – ₹50L/year",
      living: "₹80K – ₹2L/month",
    },

    loan: {
      emi: loan.emi,
    },

    roi: {
      salary,
      time: roi.roiYears,
      message: roi.message,
    },

    recommendations: universities.slice(0, 2),
  };
}

// ================= SMART COUNTRY SUGGESTION =================
export function suggestCountries(budget) {
  if (!budget) return [];

  // dynamic scoring instead of fixed lists
  const countries = [
    { name: "Germany", cost: 1, salary: 2 },
    { name: "Italy", cost: 2, salary: 2 },
    { name: "China", cost: 2, salary: 1 },
    { name: "UK", cost: 3, salary: 3 },
    { name: "USA", cost: 4, salary: 4 },
  ];

  return countries
    .map((c) => {
      const affordability = budget / (c.cost * 1000000);
      const score = affordability + c.salary;

      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((c) => c.name);
}

// ================= 🔥 COURSE COMPARISON =================
export function compareCourses(course1, course2) {
  const data = {
    MBA: { salary: 150000, cost: 2000000, duration: "2 years" },
    MBBS: { salary: 200000, cost: 3000000, duration: "5–6 years" },
    MS: { salary: 180000, cost: 2500000, duration: "2 years" },
    MTECH: { salary: 150000, cost: 1800000, duration: "2 years" },
  };

  const c1 = data[course1] || data["MBA"];
  const c2 = data[course2] || data["MBA"];

  const roi1 = (c1.cost / c1.salary).toFixed(1);
  const roi2 = (c2.cost / c2.salary).toFixed(1);

  const better = roi1 < roi2 ? course1 : course2;

  return {
    course1: {
      ...c1,
      roi: roi1,
      pros: [
        "Good career opportunities",
        "Recognized globally",
      ],
      cons: ["Higher cost", "Time investment"],
    },
    course2: {
      ...c2,
      roi: roi2,
      pros: [
        "Better specialization",
        "Strong job demand",
      ],
      cons: ["Requires skills", "Competitive"],
    },
    recommendation: `${better} is better based on ROI and cost.`,
  };
}

// ================= LOAN COMPARISON =================
export function compareLoans(a1, a2) {
  return {
    option1: calculateLoanDetails(a1, 10, 10),
    option2: calculateLoanDetails(a2, 10, 10),
  };
}

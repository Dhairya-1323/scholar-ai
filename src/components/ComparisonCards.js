function ComparisonCards({ type, data }) {
  if (!data) return null;

  // ================= LOAN COMPARISON =================
  if (type === "loan") {
    const better =
      data.option1.total < data.option2.total ? "option1" : "option2";

    return (
      <div className="compare-container">
        <div className={`compare-card ${better === "option1" ? "best" : ""}`}>
<h3>
  ₹{data.amount1 / 100000}L Loan {data.best === "lower" && "⭐"}
</h3>          <p><strong>Loan:</strong> ₹{data.amount1}</p>
          <p><strong>EMI:</strong> ₹{data.option1.emi}</p>
          <p><strong>Total:</strong> ₹{data.option1.total}</p>
          <p><strong>Interest:</strong> ₹{data.option1.interest}</p>
        </div>

        <div className={`compare-card ${better === "option2" ? "best" : ""}`}>
<h3>
  ₹{data.amount2 / 100000}L Loan {data.best === "higher" && "⭐"}
</h3>          <p><strong>Loan:</strong> ₹{data.amount2}</p>
          <p><strong>EMI:</strong> ₹{data.option2.emi}</p>
          <p><strong>Total:</strong> ₹{data.option2.total}</p>
          <p><strong>Interest:</strong> ₹{data.option2.interest}</p>
        </div>
      </div>
    );
  }
  // ================= COUNTRY =================
if (type === "country") {
  return (
    <div className="compare-container">
      <div className={`compare-card ${data.best === data.country1.name ? "best" : ""}`}>
        <h3>{data.country1.name}</h3>
        <p>Tuition: {data.country1.tuition}</p>
        <p>Living: {data.country1.living}</p>
        <p>ROI: {data.country1.roi}</p>
      </div>

      <div className={`compare-card ${data.best === data.country2.name ? "best" : ""}`}>
        <h3>{data.country2.name}</h3>
        <p>Tuition: {data.country2.tuition}</p>
        <p>Living: {data.country2.living}</p>
        <p>ROI: {data.country2.roi}</p>
      </div>
    </div>
  );
}

  // ================= COURSE COMPARISON =================
  if (type === "course") {
    const better =
      parseFloat(data.course1.roi) < parseFloat(data.course2.roi)
        ? "course1"
        : "course2";

    return (
      <div className="compare-container">
        {/* COURSE 1 */}
        <div className={`compare-card ${better === "course1" ? "best" : ""}`}>
         <h3>
  {data.course1.name} {data.best === data.course1.name && "⭐ Recommended"}
</h3>

<p>Salary: ₹{data.course1.salary}/month</p>
<p>ROI: {data.course1.roi} years</p>

<p><b>Pros:</b></p>
<ul>
  {data.course1.pros.map((p, i) => <li key={i}>{p}</li>)}
</ul>

<p><b>Cons:</b></p>
<ul>
  {data.course1.cons.map((c, i) => <li key={i}>{c}</li>)}
</ul>

          <p><strong>Salary:</strong> ₹{data.course1.salary}/month</p>
          <p><strong>ROI:</strong> {data.course1.roi} years</p>
          <p><strong>Duration:</strong> {data.course1.duration}</p>

          <div className="pros-cons">
            <p><strong>Pros:</strong></p>
            {data.course1.pros?.map((p, i) => (
              <li key={i}>✔ {p}</li>
            ))}

            <p><strong>Cons:</strong></p>
            {data.course1.cons?.map((c, i) => (
              <li key={i}>✖ {c}</li>
            ))}
          </div>
        </div>

        {/* COURSE 2 */}
        <div className={`compare-card ${better === "course2" ? "best" : ""}`}>
          <h3>
            {data.course2.name} {better === "course2" && "⭐ Recommended"}
          </h3>

          <p><strong>Salary:</strong> ₹{data.course2.salary}/month</p>
          <p><strong>ROI:</strong> {data.course2.roi} years</p>
          <p><strong>Duration:</strong> {data.course2.duration}</p>

          <div className="pros-cons">
            <p><strong>Pros:</strong></p>
            {data.course2.pros?.map((p, i) => (
              <li key={i}>✔ {p}</li>
            ))}

            <p><strong>Cons:</strong></p>
            {data.course2.cons?.map((c, i) => (
              <li key={i}>✖ {c}</li>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ================= PLAN =================
if (type === "plan") {
  return (
    <div className="compare-card best">
      <h3>{data.course} in {data.country}</h3>
      <p>Expected Salary: ₹{data.salary}/month</p>
      <p>EMI: ₹{data.emi}</p>
      <p>ROI: ~{data.roi} years</p>
    </div>
  );
}
  return null;
}

export default ComparisonCards;
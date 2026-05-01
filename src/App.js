import { useState, useRef, useEffect } from "react";
import "./App.css";
import ComparisonCards from "./components/ComparisonCards";

function App() {
  const [msg, setMsg] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [chat, setChat] = useState([
    {
      user: "",
      bot: "Hello 👋 I’m your AI assistant. Tell me your plan — course, country, or budget, and I’ll guide you step by step.",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const controllerRef = useRef(null);

  // ✅ WHAT-IF STATES
  const [showSimulator, setShowSimulator] = useState(false);
  const [simChat, setSimChat] = useState([]);
  const [simInput, setSimInput] = useState("");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  // ================= MAIN CHAT =================
  const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000/chat"
    : "https://scholarai-backend-6o1j.onrender.com/chat";
  const send = async () => {
    if (!msg.trim()) return;

    const userMessage = msg.trim();
    setMsg("");

    setChat((prev) => [...prev, { user: userMessage, bot: "" }]);
    setLoading(true);

    try {
      const controller = new AbortController();
      controllerRef.current = controller;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
        signal: controller.signal,
      });

      const contentType = response.headers.get("content-type");

      // ================= JSON =================
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();

      if (typeof data === "object" && (data.summary || data.text)) {
  let i = 0;
  let text = data.summary || data.text;
  let temp = "";

  setDisplayedText("");

  function typeWriter() {
    if (i < text.length) {
      temp += text.charAt(i);
      setDisplayedText(temp);
      i++;
      setTimeout(typeWriter, 15);
    } else {
      setChat((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].bot = {
          ...data,
          text: text,   
        };
        return updated;
      });
    }
  }

  typeWriter();
} else {
          setChat((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].bot = data;
            return updated;
          });
        }
      }

      // ================= STREAM =================
      else {
  const text = await response.text(); // 👈 SAFE fallback

  setChat((prev) => {
    const updated = [...prev];
    updated[updated.length - 1].bot = text;
    return updated;
  });
      }
    } catch {
      setChat((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].bot =
          "I couldn’t process that request. Try again.";
        return updated;
      });
    }

    setLoading(false);
  };

  const stopResponse = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      setLoading(false);
    }
  };

  // ================= WHAT-IF SIMULATOR =================
const sendSim = async () => {
  if (!simInput.trim()) return;

  const userMessage = simInput.trim();
  setSimInput("");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: userMessage }),
    });

    const data = await response.json(); 

    setSimChat((prev) => [
      ...prev,
      {
        user: userMessage,
        bot: data,
      },
    ]);
  } catch (err) {
    console.error(err);

    setSimChat((prev) => [
      ...prev,
      {
        user: userMessage,
        bot: { text: "Simulation failed. Try again." },
      },
    ]);
  }
};
  return (
    <div className="app">
      {/* NAVBAR */}
      <div className="navbar">
        <h1>Scholar AI</h1>
        <p>Your smart assistant — from ambition to admission ✨</p>
      </div>

      {/* CHAT */}
      <div className="chat-container">
        <div className="messages">
          {chat.map((c, i) => (
            <div key={i}>
              {c.user && (
                <div className="msg-row user">
                  <div className="bubble user">{c.user}</div>
                </div>
              )}

              <div className="msg-row bot">
                <div className="avatar">🤖</div>

                <div className="bubble bot">
                  {typeof c.bot === "string" && <p>{c.bot}</p>}

                  {typeof c.bot === "object" && (
                    <>
                      {c.bot.text && (
  <p style={{ whiteSpace: "pre-line" }}>
    {displayedText || c.bot.text}
  </p>
)}
                      {c.bot.recommendations &&
                        c.bot.recommendations.map((u, idx) => (
                          <div className="card" key={idx}>
                            <h4>{u.name}</h4>
                            <a href={u.link} target="_blank" rel="noreferrer">
                              Visit →
                            </a>
                          </div>
                        ))}
                         {/*  PLAN DETAILS  */}
    {c.bot.details && (
      <div className="plan-box">
        <p><b>💰 Cost:</b> {c.bot.details.cost.tuition}</p>
        <p><b>🏠 Living:</b> {c.bot.details.cost.living}</p>
        <p><b>💳 EMI:</b> ₹{c.bot.details.loan.emi}/month</p>
        <p><b>📈 Salary:</b> ₹{c.bot.details.roi.salary}/month</p>
        <p><b>⏱ ROI:</b> {c.bot.details.roi.time} years</p>
      </div>
    )}
    {/*  FOLLOW-UP TEXT */}
    {c.bot.followUp && (
<p className="followup-text" style={{ whiteSpace: "pre-line" }}>
  {c.bot.followUp}
</p>    )}
    
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          

          {loading && (
            <div className="thinking">
              <span>.</span><span>.</span><span>.</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT */}
        <div className="input-box">
          <input
            value={msg}
            placeholder="Ask anything about your future..."
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />

          {!loading ? (
            <button className="icon-btn" onClick={send}>➤</button>
          ) : (
            <button className="icon-btn stop" onClick={stopResponse}>⏹</button>
          )}
        </div>

        {/* WHAT-IF BUTTON */}
        <button
          className="sim-btn"
          onClick={() => {
  setShowSimulator(true);
  setSimChat([
    {
      user: "",
      bot: {
        text: "Try scenarios like:\n• 10L vs 20L loan\n• MBA vs MS\n• Germany vs UK",
      },
    },
  ]);
  setSimInput("");
}}
        >
          ⚡ Explore What-If Scenarios
        </button>
      </div>

      {/* ================= MODAL ================= */}
      {showSimulator && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>What-If Simulator</h3>

            <div className="sim-chat">
              {simChat.map((c, i) => (
                <div key={i}>
                  <p><b>You:</b> {c.user}</p>

                  {c.bot?.type ? (
                    <ComparisonCards
                      type={c.bot.type}
                      data={c.bot.data}
                    />
                  ) : (
                    <p>{c.bot.text || "No response"}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="input-box">
              <input
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                placeholder="Ask any what-if question..."
                onKeyDown={(e) => e.key === "Enter" && sendSim()}
              />
              <button onClick={sendSim}>➤</button>
            </div>

            <button onClick={() => setShowSimulator(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

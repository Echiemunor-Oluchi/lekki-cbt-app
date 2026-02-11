import { useState, useEffect, useCallback, useRef } from "react";
import { questionsAPI, resultsAPI, studentsAPI, checkServerHealth } from "./services/api";

const APP_NAME = "Lekki Peculiar Schools";

const ELEM_LOGO = "/elementary-logo-removebg-preview.png";
const COLLEGE_LOGO = "/college-logo-removebg-preview.png";

const ELEMENTARY_YEARS = [1, 2, 3, 4, 5, 6];
const JUNIOR_COLLEGE_YEARS = [7, 8, 9];
const SENIOR_COLLEGE_YEARS = [10, 11, 12];
const SENIOR_TRACKS = ["Science", "Commercial", "Arts"];

const JUNIOR_SUBJECTS = ["Mathematics", "English", "Basic Science", "Basic Technology", "Social Studies", "Civic Education", "French", "Computer Studies", "Agricultural Science", "Home Economics", "CRS", "Business Studies", "Yoruba"];
const SENIOR_SUBJECTS = {
  Science: ["Mathematics", "English", "Physics", "Chemistry", "Biology", "Further Mathematics", "Computer Studies", "Civic Education", "Geography", "Agricultural Science"],
  Commercial: ["Mathematics", "English", "Commerce", "Economics", "Accounting", "Civic Education", "Marketing", "Government"],
  Arts: ["Mathematics", "English", "Literature in English", "Government", "Yoruba", "CRS", "Civic Education", "Marketing", "Economics"]
};

// Updated: Added French for Year 1-4
const ELEMENTARY_SUBJECTS = {
  1: ["English Language", "Mathematics", "Basic Science", "Social Studies", "Verbal Reasoning", "Quantitative Reasoning", "Handwriting", "Phonics", "French", "Basic Technology","History"],
  2: ["English Language", "Mathematics", "Basic Science", "Social Studies", "Verbal Reasoning", "Quantitative Reasoning", "Handwriting", "Phonics", "French", "Basic Technology","History"],
  3: ["English Language", "Mathematics", "Basic Science", "Social Studies", "Verbal Reasoning", "Quantitative Reasoning", "Computer Studies", "French", "Basic Technology","History"],
  4: ["English Language", "Mathematics", "Basic Science", "Social Studies", "Verbal Reasoning", "Quantitative Reasoning", "Computer Studies", "French", "Civic Education", "Basic Technology","History"],
  5: ["English Language", "Mathematics", "Basic Science", "Social Studies", "Verbal Reasoning", "Quantitative Reasoning", "Computer Studies", "French", "Civic Education", "Agricultural Science", "Basic Technology","History"],
  6: ["English Language", "Mathematics", "Basic Science", "Social Studies", "Verbal Reasoning", "Quantitative Reasoning", "Computer Studies", "French", "Civic Education", "Agricultural Science", "Basic Technology","Histroy"]
};

const QUESTION_COUNTS = { test: 20, exam: 40, practice: 10 };

function generateSampleQuestions(subject, count = 10) {
  const templates = [
    { q: `What is the fundamental concept of ${subject}?`, opts: ["Foundation principles", "Advanced theory", "Applied methods", "Historical context"], a: 0 },
    { q: `Which of these is most associated with ${subject}?`, opts: ["Core methodology", "External factors", "Unrelated field", "Random topic"], a: 0 },
    { q: `In ${subject}, what comes first in the learning sequence?`, opts: ["Basics and fundamentals", "Complex theories", "Practical exams", "Research papers"], a: 0 },
    { q: `The best approach to studying ${subject} is:`, opts: ["Consistent practice", "Last-minute cramming", "Guessing", "Skipping classes"], a: 0 },
    { q: `${subject} is important because:`, opts: ["It builds critical thinking", "It is mandatory", "Teachers say so", "No particular reason"], a: 0 },
    { q: `A key skill developed in ${subject} is:`, opts: ["Analytical thinking", "Memorization only", "Speed reading", "Handwriting"], a: 0 },
    { q: `Which method works best for ${subject} revision?`, opts: ["Practice questions", "Reading once", "Not studying", "Watching TV"], a: 0 },
    { q: `The goal of learning ${subject} is to:`, opts: ["Understand concepts deeply", "Pass exams only", "Please parents", "Fill time"], a: 0 },
    { q: `${subject} connects to real life through:`, opts: ["Daily applications", "No connection", "Only in textbooks", "Only in labs"], a: 0 },
    { q: `What should you do if stuck on a ${subject} problem?`, opts: ["Break it into steps", "Give up", "Skip it forever", "Complain"], a: 0 },
  ];
  return Array.from({ length: count }, (_, i) => {
    const t = templates[i % templates.length];
    return { id: `prac_${Date.now()}_${i}`, question: t.q, options: [...t.opts], correctAnswer: t.a };
  });
}

function useTimer(onEnd) {
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    if (running && secs > 0) {
      ref.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) { clearInterval(ref.current); setRunning(false); endRef.current?.(); return 0; }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(ref.current);
  }, [running]);

  return {
    secs, running,
    start: (mins) => { setSecs(mins * 60); setRunning(true); },
    stop: () => { setRunning(false); clearInterval(ref.current); },
    fmt: () => `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`
  };
}

// Color palette from the school logo
const C = {
  navy: "#1a2260",
  yellow: "#f7e533",
  red: "#d42626",
  bg: "#f7f8fc",
  card: "#ffffff",
  text: "#1a1d2e",
  textSec: "#64698a",
  border: "#e2e4ed",
  accent: "#1a2260",
  accentLight: "#ecedf5",
  green: "#0ea45e",
  greenLight: "#e6f7ef",
  redLight: "#fdeaea",
  yellowLight: "#fef9e0",
};

export default function App() {
  const [view, setView] = useState("splash");
  const [section, setSection] = useState(null);
  const [user, setUser] = useState(null);
  const [serverConnected, setServerConnected] = useState(null);
  const [loading, setLoading] = useState(false);

  const [selYear, setSelYear] = useState(null);
  const [selTrack, setSelTrack] = useState(null);
  const [selSubject, setSelSubject] = useState(null);
  const [examType, setExamType] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [curQ, setCurQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [result, setResult] = useState(null);

  const [adminTab, setAdminTab] = useState("questions");
  const [bank, setBank] = useState([]);
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [newQ, setNewQ] = useState({ question: "", options: ["", "", "", ""], correctAnswer: 0, section: "elementary", year: 1, subject: "", type: "test", track: "" });
  const [bulkText, setBulkText] = useState("");
  const [toast, setToast] = useState(null);
  
  // New state for results filtering
  const [filterSection, setFilterSection] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  const submitRef = useRef(null);
  const timer = useTimer(() => submitRef.current?.());

  // Check server connection and show splash screen
  useEffect(() => {
    const initApp = async () => {
      try {
        const health = await checkServerHealth();
        setServerConnected(health.connected);
      } catch {
        setServerConnected(false);
      }
      setTimeout(() => setView("home"), 2800);
    };
    initApp();
  }, []);

  // Load data from MongoDB on mount
  useEffect(() => {
    const loadData = async () => {
      if (!serverConnected) return;
      
      try {
        setLoading(true);
        const [questionsData, resultsData, studentsData] = await Promise.all([
          questionsAPI.getAll(),
          resultsAPI.getAll(),
          studentsAPI.getAll()
        ]);
        setBank(questionsData);
        setResults(resultsData);
        setStudents(studentsData);
      } catch (error) {
        console.error('Error loading data:', error);
        notify('Error connecting to database. Using offline mode.', 'warning');
      } finally {
        setLoading(false);
      }
    };
    
    if (serverConnected) {
      loadData();
    }
  }, [serverConnected]);

  const notify = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  // ═══════════════════════════════════════════════════════════════════
  // CRUD OPERATIONS - Now using MongoDB API
  // ═══════════════════════════════════════════════════════════════════

  const doSubmit = useCallback(async () => {
    timer.stop();
    let correct = 0;
    const details = questions.map((q, i) => {
      const ua = answers[i];
      const ok = ua === q.correctAnswer;
      if (ok) correct++;
      return { question: q.question, userAnswer: ua, correctAnswer: q.correctAnswer, options: q.options, isCorrect: ok };
    });
    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const res = { 
      student: user, 
      section, 
      year: selYear, 
      track: selTrack, 
      subject: selSubject, 
      examType, 
      score, 
      correct, 
      total: questions.length, 
      details, 
      ts: new Date().toISOString() 
    };
    
    setResult(res);
    
    if (examType !== "practice") {
      try {
        // Save to MongoDB
        const savedResult = await resultsAPI.save(res);
        setResults(prev => [savedResult, ...prev]);
      } catch (error) {
        console.error('Error saving result:', error);
        notify('Result saved locally. Will sync when online.', 'warning');
        // Still update local state
        setResults(prev => [res, ...prev]);
      }
    }
    
    setView("result");
    notify(score >= 50 ? "Well done! 🎉" : "Keep studying, you'll improve!", score >= 50 ? "success" : "info");
  }, [questions, answers, user, section, selYear, selTrack, selSubject, examType]);

  submitRef.current = doSubmit;

  const startExam = async (subject, type) => {
    setSelSubject(subject);
    setExamType(type);
    setLoading(true);
    
    try {
      // Fetch questions from MongoDB
      let qs = await questionsAPI.getFiltered(section, selYear, subject, type, selTrack);
      
      const need = QUESTION_COUNTS[type] || 10;
      
      if (qs.length === 0 && type !== "practice") { 
        notify("No questions available yet. Try Practice mode or upload questions via Admin.", "warning"); 
        setLoading(false);
        return; 
      }
      
      if (qs.length < need && type === "practice") {
        qs = generateSampleQuestions(subject, need);
      } else {
        qs = [...qs].sort(() => Math.random() - 0.5).slice(0, need);
      }
      
      setQuestions(qs);
      setCurQ(0);
      setAnswers({});
      setFlagged(new Set());
      setResult(null);
      setView("exam");
      timer.start(type === "exam" ? 60 : type === "test" ? 30 : 15);
    } catch (error) {
      console.error('Error loading questions:', error);
      notify('Error loading questions. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null); setSection(null); setSelYear(null); setSelTrack(null);
    setSelSubject(null); setExamType(null); setQuestions([]); setResult(null);
    setView("home");
  };

  const login = async (name, id, role) => {
    const u = { name, id, role };
    setUser(u);
    
    if (role === "admin") { 
      setView("admin"); 
    } else {
      setView("yearSelect");
      
      // Register/update student in MongoDB
      try {
        await studentsAPI.login({ ...u, section });
        // Refresh students list
        const updatedStudents = await studentsAPI.getAll();
        setStudents(updatedStudents);
      } catch (error) {
        console.error('Error registering student:', error);
      }
    }
    notify(`Welcome, ${name}!`, "success");
  };

  const addQuestion = async () => {
    if (!newQ.question.trim() || newQ.options.some(o => !o.trim()) || !newQ.subject) { 
      notify("Please fill all fields", "error"); 
      return; 
    }
    
    setLoading(true);
    try {
      const questionData = {
        question: newQ.question,
        options: newQ.options,
        correctAnswer: newQ.correctAnswer,
        section: newQ.section,
        year: newQ.year,
        subject: newQ.subject,
        type: newQ.type,
        track: newQ.track || ""
      };
      
      const savedQuestion = await questionsAPI.add(questionData);
      setBank(prev => [savedQuestion, ...prev]);
      setNewQ({ question: "", options: ["", "", "", ""], correctAnswer: 0, section: newQ.section, year: newQ.year, subject: "", type: "test", track: newQ.track || "" });
      notify("Question added successfully!", "success");
    } catch (error) {
      console.error('Error adding question:', error);
      notify("Error adding question. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteQ = async (id) => {
    try {
      await questionsAPI.delete(id);
      setBank(prev => prev.filter(q => q.id !== id));
      notify("Question deleted", "info");
    } catch (error) {
      console.error('Error deleting question:', error);
      notify("Error deleting question", "error");
    }
  };

  const bulkUpload = async () => {
    try {
      const arr = JSON.parse(bulkText);
      if (!Array.isArray(arr)) throw new Error("Invalid format");
      
      setLoading(true);
      const uploadedQuestions = await questionsAPI.addBulk(arr);
      setBank(prev => [...uploadedQuestions, ...prev]);
      setBulkText("");
      notify(`${uploadedQuestions.length} questions uploaded successfully!`, "success");
    } catch (error) {
      if (error.message === "Invalid format") {
        notify("Invalid JSON format. Please check the template.", "error");
      } else {
        console.error('Error uploading questions:', error);
        notify("Error uploading questions. Please try again.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const clearAllResults = async () => {
    if (!window.confirm("Clear all results? This cannot be undone.")) return;
    
    try {
      await resultsAPI.clearAll();
      setResults([]);
      notify("All results cleared", "info");
    } catch (error) {
      console.error('Error clearing results:', error);
      notify("Error clearing results", "error");
    }
  };

  const getSubjects = () => {
    if (section === "elementary") return ELEMENTARY_SUBJECTS[selYear] || [];
    if (selYear >= 10 && selTrack) return SENIOR_SUBJECTS[selTrack] || [];
    if (selYear >= 7 && selYear <= 9) return JUNIOR_SUBJECTS;
    return [];
  };

  // Get subjects for filter dropdown
  const getFilterSubjects = () => {
    if (!filterSection || !filterYear) return [];
    const yr = parseInt(filterYear);
    if (filterSection === "elementary") return ELEMENTARY_SUBJECTS[yr] || [];
    if (yr >= 10) {
      // Return all senior subjects combined for filtering
      return [...new Set([...SENIOR_SUBJECTS.Science, ...SENIOR_SUBJECTS.Commercial, ...SENIOR_SUBJECTS.Arts])];
    }
    if (yr >= 7 && yr <= 9) return JUNIOR_SUBJECTS;
    return [];
  };

  // Filter results based on selected criteria
  const getFilteredResults = () => {
    return results.filter(r => {
      if (filterSection && r.section !== filterSection) return false;
      if (filterYear && r.year !== parseInt(filterYear)) return false;
      if (filterSubject && r.subject !== filterSubject) return false;
      return true;
    });
  };

  // ── Styles (INCREASED SIZES) ──
  const pageS = { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Nunito', 'Segoe UI', system-ui, sans-serif", fontSize: "18px" };
  const inputS = { width: "100%", padding: "16px 18px", borderRadius: "12px", border: `2px solid ${C.border}`, background: "#fff", color: C.text, fontSize: "18px", boxSizing: "border-box", outline: "none", transition: "border-color 0.2s" };
  const btnP = { padding: "16px 28px", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "18px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "all 0.15s", background: C.navy, color: "#fff" };
  const btnSec = { ...btnP, background: C.accentLight, color: C.navy };
  const btnOut = { ...btnP, background: "transparent", color: C.text, border: `2px solid ${C.border}` };
  const btnDanger = { ...btnP, background: C.red, color: "#fff" };
  const btnGreen = { ...btnP, background: C.green, color: "#fff" };
  const cardS = (extra = {}) => ({ background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "22px", transition: "all 0.2s", ...extra });

  const Logo = ({ type, size = 80 }) => (
    <img src={type === "college" ? COLLEGE_LOGO : ELEM_LOGO} alt={type === "college" ? "Lekki Peculiar College" : "Lekki Peculiar School"}
      style={{ width: size, height: size, objectFit: "contain", borderRadius: 12 }} />
  );

  const Toast = () => toast ? (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
      padding: "16px 32px", borderRadius: "14px", fontWeight: 700, fontSize: "18px",
      background: toast.type === "success" ? C.green : toast.type === "error" ? C.red : toast.type === "warning" ? "#e8a308" : C.navy,
      color: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", animation: "fadeSlide 0.3s ease",
      maxWidth: "90vw", textAlign: "center"
    }}>{toast.msg}
      <style>{`@keyframes fadeSlide{from{opacity:0;transform:translateX(-50%) translateY(-14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  ) : null;

  const LoadingOverlay = () => loading ? (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
      background: "rgba(255,255,255,0.8)", zIndex: 9998,
      display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column"
    }}>
      <div style={{ 
        width: 50, height: 50, border: `5px solid ${C.border}`, 
        borderTopColor: C.navy, borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
      <p style={{ marginTop: 16, color: C.navy, fontWeight: 700, fontSize: "20px" }}>Loading...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ) : null;

  const ServerStatus = () => (
    <div style={{ 
      position: "fixed", bottom: 20, right: 20, 
      padding: "10px 16px", borderRadius: 10,
      background: serverConnected ? C.greenLight : C.redLight,
      color: serverConnected ? C.green : C.red,
      fontSize: 14, fontWeight: 700, zIndex: 100,
      display: "flex", alignItems: "center", gap: 8
    }}>
      <div style={{ 
        width: 10, height: 10, borderRadius: "50%", 
        background: serverConnected ? C.green : C.red 
      }} />
      {serverConnected ? "Connected" : "Offline"}
    </div>
  );

  const Header = ({ title, onBack, showLogout = true }) => (
    <div style={{ background: "#fff", borderBottom: `2px solid ${C.border}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(26,34,96,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {onBack && <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: C.text, padding: "6px", display: "flex" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 28, height: 28 }}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>}
        <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: C.navy }}>{title}</h2>
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {user && showLogout && <button onClick={logout} style={{ ...btnOut, padding: "10px 18px", color: C.red, borderColor: C.red + "50", fontSize: 16 }}>
          Logout
        </button>}
      </div>
    </div>
  );

  const HoverCard = ({ children, onClick, style = {} }) => (
    <div onClick={onClick}
      style={{ ...cardS(style), cursor: onClick ? "pointer" : "default" }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(26,34,96,0.08)"; }}}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}}>
      {children}
    </div>
  );

  // ══════════════════════════════════════════════════════
  // SPLASH - Single Big Logo
  // ══════════════════════════════════════════════════════
  if (view === "splash") return (
    <div style={{ background: `linear-gradient(160deg, ${C.navy} 0%, #262d6e 50%, #1a2260 100%)`, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito', sans-serif", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes loadBar { 0% { width: 0; } 100% { width: 100%; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
      `}</style>
      <div style={{ textAlign: "center", animation: "fadeUp 0.8s ease" }}>
        {/* Single Big Logo */}
        <div style={{ 
          width: 180, 
          height: 180, 
          borderRadius: 30, 
          background: "rgba(255,255,255,0.15)", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          margin: "0 auto 30px",
          animation: "pulse 2s ease-in-out infinite"
        }}>
          <img src={ELEM_LOGO} style={{ width: 140, height: 140, objectFit: "contain", borderRadius: 20 }} alt="Lekki Peculiar Schools" />
        </div>
        <h1 style={{ color: "#fff", fontSize: 42, fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.5px" }}>Lekki Peculiar Schools</h1>
        <p style={{ color: C.yellow, fontSize: 20, margin: "8px 0 0", fontWeight: 700, fontStyle: "italic" }}>Leading by Learning</p>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 18, marginTop: 20, letterSpacing: 4, textTransform: "uppercase", fontWeight: 700 }}>CBT Platform</p>
        <div style={{ marginTop: 40, width: 280, height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden", margin: "40px auto 0" }}>
          <div style={{ height: "100%", background: `linear-gradient(90deg, ${C.yellow}, ${C.red})`, borderRadius: 3, animation: "loadBar 2.5s ease" }} />
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════
  // HOME
  // ══════════════════════════════════════════════════════
  if (view === "home") return (
    <div style={pageS}>
      <Toast />
      <LoadingOverlay />
      <ServerStatus />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');`}</style>
      <div style={{ maxWidth: 540, margin: "0 auto", padding: "20px 20px 50px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", padding: "40px 0 30px" }}>
          <img src={ELEM_LOGO} style={{ width: 160, height: 160, objectFit: "contain", margin: "0 auto 20px" }} alt="Lekki Peculiar Schools" />
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: "0 0 6px", color: C.navy }}>Lekki Peculiar Schools</h1>
          <p style={{ color: C.red, fontSize: 18, fontWeight: 700, fontStyle: "italic", margin: "4px 0 0" }}>Leading by Learning</p>
          <p style={{ color: C.textSec, fontSize: 18, marginTop: 12 }}>Computer Based Testing Platform</p>
        </div>

        {/* Connection Warning */}
        {serverConnected === false && (
          <div style={{ ...cardS({ background: C.yellowLight, borderColor: C.yellow, marginBottom: 18, padding: 18 }) }}>
            <p style={{ margin: 0, fontSize: 16, color: "#8a7200", fontWeight: 600 }}>
              ⚠️ Server not connected. Some features may be limited.
            </p>
          </div>
        )}

        {/* Elementary */}
        <HoverCard onClick={() => { setSection("elementary"); setView("login"); }} style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 20 }}>
          <Logo type="elementary" size={80} />
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: C.navy }}>Lekki Peculiar School</h3>
            <p style={{ margin: 0, color: C.textSec, fontSize: 16 }}>Elementary — Year 1 to Year 6</p>
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              {ELEMENTARY_YEARS.map(y => <span key={y} style={{ background: C.yellowLight, color: "#8a7200", padding: "4px 12px", borderRadius: 8, fontSize: 14, fontWeight: 700 }}>Year {y}</span>)}
            </div>
          </div>
        </HoverCard>

        {/* College */}
        <HoverCard onClick={() => { setSection("college"); setView("login"); }} style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 20 }}>
          <Logo type="college" size={80} />
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: C.navy }}>Lekki Peculiar College</h3>
            <p style={{ margin: 0, color: C.textSec, fontSize: 16 }}>Junior (Year 7–9) &amp; Senior (Year 10–12)</p>
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              <span style={{ background: C.accentLight, color: C.navy, padding: "4px 12px", borderRadius: 8, fontSize: 14, fontWeight: 700 }}>Junior College</span>
              {SENIOR_TRACKS.map(t => <span key={t} style={{ background: t === "Science" ? "#dbeafe" : t === "Commercial" ? "#d1fae5" : "#fce7f3", color: t === "Science" ? "#1e40af" : t === "Commercial" ? "#065f46" : "#9d174d", padding: "4px 12px", borderRadius: 8, fontSize: 14, fontWeight: 700 }}>{t}</span>)}
            </div>
          </div>
        </HoverCard>

        {/* Admin */}
        <HoverCard onClick={() => { setSection("admin"); setView("login"); }} style={{ textAlign: "center", background: C.accentLight, borderColor: C.navy + "20" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>⚙️</span>
            <span style={{ fontWeight: 800, fontSize: 22, color: C.navy }}>Admin Panel</span>
          </div>
          <p style={{ margin: "8px 0 0", color: C.textSec, fontSize: 16 }}>Manage questions, view results &amp; students</p>
        </HoverCard>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════
  // LOGIN
  // ══════════════════════════════════════════════════════
  if (view === "login") {
    const isAdm = section === "admin";
    return (
      <div style={pageS}>
        <Toast />
        <LoadingOverlay />
        <Header title={isAdm ? "Admin Login" : section === "elementary" ? "Elementary Login" : "College Login"} onBack={() => setView("home")} showLogout={false} />
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={{ textAlign: "center", margin: "30px 0 28px" }}>
            {isAdm ? <div style={{ fontSize: 64 }}>⚙️</div> : <Logo type={section} size={100} />}
            <h2 style={{ margin: "18px 0 8px", fontSize: 28, color: C.navy }}>{isAdm ? "Admin Access" : "Student Login"}</h2>
            <p style={{ color: C.textSec, fontSize: 18 }}>{isAdm ? "Enter admin credentials" : "Enter your details to begin"}</p>
          </div>
          <LoginForm isAdmin={isAdm} onLogin={login} C={C} inputS={inputS} btnP={btnP} />
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // YEAR SELECT
  // ══════════════════════════════════════════════════════
  if (view === "yearSelect") {
    return (
      <div style={pageS}>
        <Toast />
        <LoadingOverlay />
        <Header title={section === "elementary" ? "Lekki Peculiar School" : "Lekki Peculiar College"} onBack={() => setView("login")} />
        <div style={{ maxWidth: 540, margin: "0 auto", padding: 24 }}>
          <div style={{ textAlign: "center", margin: "20px 0 28px" }}>
            <Logo type={section} size={70} />
            <p style={{ color: C.textSec, fontSize: 20, marginTop: 12 }}>Select your year</p>
          </div>

          {section === "college" && (<>
            <p style={{ fontSize: 14, fontWeight: 800, color: C.navy, textTransform: "uppercase", letterSpacing: 3, margin: "20px 0 12px" }}>Junior College</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
              {JUNIOR_COLLEGE_YEARS.map(y => (
                <HoverCard key={y} onClick={() => { setSelYear(y); setSelTrack(null); setView("subjectSelect"); }} style={{ textAlign: "center", padding: 20 }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: C.navy }}>Year {y}</div>
                  <div style={{ fontSize: 14, color: C.textSec, marginTop: 4 }}>Junior College</div>
                </HoverCard>
              ))}
            </div>

            <p style={{ fontSize: 14, fontWeight: 800, color: C.navy, textTransform: "uppercase", letterSpacing: 3, margin: "20px 0 12px" }}>Senior College</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {SENIOR_COLLEGE_YEARS.map(y => (
                <HoverCard key={y} onClick={() => { setSelYear(y); setView("trackSelect"); }} style={{ textAlign: "center", padding: 20 }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: C.navy }}>Year {y}</div>
                  <div style={{ fontSize: 14, color: C.textSec, marginTop: 4 }}>Senior College</div>
                </HoverCard>
              ))}
            </div>
          </>)}

          {section === "elementary" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {ELEMENTARY_YEARS.map(y => (
                <HoverCard key={y} onClick={() => { setSelYear(y); setView("subjectSelect"); }} style={{ textAlign: "center", padding: 22 }}>
                  <div style={{ fontSize: 34, fontWeight: 900, color: C.navy }}>Year {y}</div>
                </HoverCard>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // TRACK SELECT
  // ══════════════════════════════════════════════════════
  if (view === "trackSelect") {
    const info = { Science: { emoji: "🔬", color: "#1e40af", bg: "#dbeafe" }, Commercial: { emoji: "📊", color: "#065f46", bg: "#d1fae5" }, Arts: { emoji: "🎨", color: "#9d174d", bg: "#fce7f3" } };
    return (
      <div style={pageS}>
        <Toast />
        <Header title={`Year ${selYear} — Choose Department`} onBack={() => setView("yearSelect")} />
        <div style={{ maxWidth: 540, margin: "0 auto", padding: 24 }}>
          <div style={{ textAlign: "center", margin: "24px 0" }}>
            <Logo type="college" size={70} />
            <p style={{ color: C.textSec, marginTop: 12, fontSize: 20 }}>Select your department</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {SENIOR_TRACKS.map(t => (
              <HoverCard key={t} onClick={() => { setSelTrack(t); setView("subjectSelect"); }} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 70, height: 70, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, background: info[t].bg }}>{info[t].emoji}</div>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: info[t].color }}>{t} Department</h3>
                  <p style={{ margin: 0, color: C.textSec, fontSize: 16 }}>{(SENIOR_SUBJECTS[t] || []).length} subjects</p>
                </div>
              </HoverCard>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // SUBJECT SELECT
  // ══════════════════════════════════════════════════════
  if (view === "subjectSelect") {
    const subs = getSubjects();
    const lbl = section === "elementary" ? `Year ${selYear}` : selYear >= 10 ? `Year ${selYear} — ${selTrack}` : `Year ${selYear} (Junior College)`;
    return (
      <div style={pageS}>
        <Toast />
        <LoadingOverlay />
        <Header title={lbl} onBack={() => {
          if (section === "college" && selYear >= 10) setView("trackSelect");
          else setView("yearSelect");
        }} />
        <div style={{ maxWidth: 580, margin: "0 auto", padding: "18px 20px 50px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <Logo type={section} size={50} />
            <p style={{ color: C.textSec, fontSize: 18, margin: 0 }}>Choose a subject, then select Test, Exam, or Practice</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {subs.map(sub => {
              const cnt = bank.filter(q => q.section === section && q.year === selYear && q.subject === sub).length;
              return (
                <div key={sub} style={cardS({ padding: "20px" })}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.navy }}>{sub}</h4>
                      <span style={{ fontSize: 14, color: C.textSec }}>{cnt} question{cnt !== 1 ? "s" : ""} in bank</span>
                    </div>
                    <span style={{ fontSize: 28 }}>📖</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={() => startExam(sub, "test")} disabled={loading} style={{ ...btnP, padding: "12px 20px", fontSize: 16 }}>📋 Test (20Q)</button>
                    <button onClick={() => startExam(sub, "exam")} disabled={loading} style={{ ...btnSec, padding: "12px 20px", fontSize: 16 }}>📝 Exam (40Q)</button>
                    <button onClick={() => startExam(sub, "practice")} disabled={loading} style={{ ...btnOut, padding: "12px 20px", fontSize: 16 }}>🎯 Practice</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // EXAM
  // ══════════════════════════════════════════════════════
  if (view === "exam") {
    const q = questions[curQ];
    const prog = Object.keys(answers).length;
    const pct = Math.round((prog / questions.length) * 100);
    const lowTime = timer.secs < 300;
    return (
      <div style={pageS}>
        <Toast />
        <div style={{ background: "#fff", borderBottom: `2px solid ${C.border}`, padding: "14px 20px", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Logo type={section} size={40} />
              <div>
                <span style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>{selSubject}</span>
                <span style={{ fontSize: 14, color: C.textSec, marginLeft: 8 }}>({examType?.toUpperCase()})</span>
              </div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: lowTime ? C.redLight : C.accentLight,
              padding: "10px 20px", borderRadius: 12,
              color: lowTime ? C.red : C.navy,
              fontWeight: 800, fontSize: 24, fontFamily: "monospace"
            }}>⏱ {timer.fmt()}</div>
          </div>
          <div style={{ height: 8, background: C.border, borderRadius: 4, marginTop: 12 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${C.navy}, ${C.red})`, borderRadius: 4, transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: 14, color: C.textSec, marginTop: 6 }}>{prog}/{questions.length} answered</div>
        </div>

        <div style={{ maxWidth: 650, margin: "0 auto", padding: "20px 20px 100px" }}>
          {q && (<>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>Question {curQ + 1} of {questions.length}</span>
              <button onClick={() => setFlagged(prev => { const n = new Set(prev); n.has(curQ) ? n.delete(curQ) : n.add(curQ); return n; })}
                style={{ background: flagged.has(curQ) ? C.yellowLight : "#fff", border: `2px solid ${flagged.has(curQ) ? C.yellow : C.border}`, borderRadius: 10, padding: "10px 18px", cursor: "pointer", color: flagged.has(curQ) ? "#8a7200" : C.textSec, fontSize: 16, fontWeight: 700 }}>
                🚩 {flagged.has(curQ) ? "Flagged" : "Flag"}
              </button>
            </div>

            <div style={cardS({ marginBottom: 20, borderLeft: `5px solid ${C.navy}` })}>
              <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.7, margin: 0, color: C.text }}>{q.question}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {q.options.map((opt, i) => {
                const sel = answers[curQ] === i;
                return (
                  <div key={i} onClick={() => setAnswers(p => ({ ...p, [curQ]: i }))}
                    style={{
                      padding: "18px 20px", borderRadius: 14, cursor: "pointer",
                      border: `3px solid ${sel ? C.navy : C.border}`,
                      background: sel ? C.accentLight : "#fff",
                      display: "flex", alignItems: "center", gap: 16, transition: "all 0.15s"
                    }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      background: sel ? C.navy : "#fff", border: `3px solid ${sel ? C.navy : C.border}`,
                      color: sel ? "#fff" : C.textSec, fontWeight: 800, fontSize: 18, flexShrink: 0
                    }}>{String.fromCharCode(65 + i)}</div>
                    <span style={{ fontSize: 20, fontWeight: sel ? 700 : 500, color: sel ? C.navy : C.text }}>{opt}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, gap: 12 }}>
              <button onClick={() => setCurQ(Math.max(0, curQ - 1))} disabled={curQ === 0}
                style={{ ...btnOut, opacity: curQ === 0 ? 0.35 : 1, cursor: curQ === 0 ? "not-allowed" : "pointer", fontSize: 18 }}>← Previous</button>
              {curQ < questions.length - 1
                ? <button onClick={() => setCurQ(curQ + 1)} style={{ ...btnP, fontSize: 18 }}>Next →</button>
                : <button onClick={() => {
                    if (prog < questions.length) { if (!window.confirm(`You've answered ${prog}/${questions.length}. Submit anyway?`)) return; }
                    doSubmit();
                  }} style={{ ...btnGreen, fontSize: 18 }}>✓ Submit</button>}
            </div>

            <div style={{ marginTop: 28 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.textSec, marginBottom: 10 }}>Question Navigator</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {questions.map((_, i) => (
                  <div key={i} onClick={() => setCurQ(i)}
                    style={{
                      width: 48, height: 48, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", fontSize: 16, fontWeight: 800,
                      background: i === curQ ? C.navy : answers[i] !== undefined ? C.greenLight : flagged.has(i) ? C.yellowLight : "#fff",
                      color: i === curQ ? "#fff" : answers[i] !== undefined ? C.green : C.text,
                      border: `2px solid ${i === curQ ? C.navy : answers[i] !== undefined ? C.green + "50" : flagged.has(i) ? C.yellow : C.border}`
                    }}>{i + 1}</div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 14, color: C.textSec }}>
                <span>🟢 Answered</span><span>🔵 Current</span><span>🟡 Flagged</span><span>⚪ Unanswered</span>
              </div>
            </div>
          </>)}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // RESULT - No Review Button
  // ══════════════════════════════════════════════════════
  if (view === "result" && result) {
    const { score, correct, total } = result;
    const grade = score >= 70 ? "A" : score >= 60 ? "B" : score >= 50 ? "C" : score >= 40 ? "D" : "F";
    return (
      <div style={pageS}>
        <Toast />
        <Header title="Results" onBack={() => setView("subjectSelect")} />
        <div style={{ maxWidth: 540, margin: "0 auto", padding: 24 }}>
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <Logo type={section} size={70} />
            <div style={{ fontSize: 72, margin: "20px 0" }}>{score >= 70 ? "🎉" : score >= 50 ? "👍" : "📚"}</div>
            <div style={{
              width: 180, height: 180, borderRadius: "50%", margin: "0 auto 24px",
              background: `conic-gradient(${score >= 50 ? C.green : C.red} ${score * 3.6}deg, ${C.border} 0deg)`,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <div style={{ width: 150, height: 150, borderRadius: "50%", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 42, fontWeight: 900, color: C.navy }}>{score}%</span>
                <span style={{ fontSize: 20, color: C.textSec, fontWeight: 700 }}>Grade: {grade}</span>
              </div>
            </div>
            <h2 style={{ margin: "0 0 10px", color: C.navy, fontSize: 32 }}>{score >= 50 ? "Congratulations!" : "Keep Studying!"}</h2>
            <p style={{ color: C.textSec, fontSize: 20 }}>{correct}/{total} correct • {selSubject} ({examType})</p>
            {user && <p style={{ color: C.textSec, fontSize: 18, marginTop: 8 }}>Student: {user.name}</p>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 28 }}>
            {[["Correct", correct, C.green, C.greenLight], ["Wrong", total - correct, C.red, C.redLight], ["Total", total, C.navy, C.accentLight]].map(([l, v, c, bg]) => (
              <div key={l} style={cardS({ textAlign: "center", padding: 18, background: bg })}>
                <div style={{ fontSize: 36, fontWeight: 900, color: c }}>{v}</div>
                <div style={{ fontSize: 16, color: C.textSec, fontWeight: 600 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* REMOVED Review Answers button */}
          <button onClick={() => setView("subjectSelect")} style={{ ...btnP, width: "100%", justifyContent: "center", fontSize: 20, padding: 18 }}>← Back to Subjects</button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // ADMIN
  // ══════════════════════════════════════════════════════
  if (view === "admin") {
    const tabs = [
      { id: "questions", label: "📋 Questions" },
      { id: "add", label: "➕ Add" },
      { id: "upload", label: "📤 Upload" },
      { id: "results", label: "📊 Results" },
      { id: "students", label: "👥 Students" },
    ];

    const getAdminSubjects = () => {
      if (newQ.section === "elementary") return ELEMENTARY_SUBJECTS[newQ.year] || [];
      if (newQ.year >= 10 && newQ.track) return SENIOR_SUBJECTS[newQ.track] || [];
      if (newQ.year >= 7 && newQ.year <= 9) return JUNIOR_SUBJECTS;
      return [];
    };

    const filteredResults = getFilteredResults();

    return (
      <div style={pageS}>
        <Toast />
        <LoadingOverlay />
        <ServerStatus />
        <Header title="Admin Panel" onBack={logout} />
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 20px 50px" }}>

          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 20 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setAdminTab(t.id)} style={{
                padding: "12px 20px", borderRadius: 12, border: "none", cursor: "pointer",
                background: adminTab === t.id ? C.navy : "#fff", color: adminTab === t.id ? "#fff" : C.text,
                fontWeight: 700, fontSize: 16, whiteSpace: "nowrap", border: `2px solid ${adminTab === t.id ? C.navy : C.border}`
              }}>{t.label}</button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
            {[["Questions", bank.length, C.navy, C.accentLight], ["Results", results.length, C.green, C.greenLight], ["Students", students.length, "#b45309", C.yellowLight]].map(([l, v, c, bg]) => (
              <div key={l} style={cardS({ textAlign: "center", padding: 16, background: bg })}>
                <div style={{ fontSize: 32, fontWeight: 900, color: c }}>{v}</div>
                <div style={{ fontSize: 16, color: C.textSec, fontWeight: 600 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Questions Tab */}
          {adminTab === "questions" && (
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: C.navy }}>Question Bank ({bank.length})</h3>
              {bank.length === 0 && <div style={cardS({ textAlign: "center", padding: 36 })}><p style={{ color: C.textSec, fontSize: 18 }}>No questions yet. Use "Add" or "Upload" tab to add questions.</p></div>}
              {[...bank].slice(0, 100).map(q => (
                <div key={q.id} style={{ ...cardS({ marginBottom: 12, padding: "16px 20px" }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {[q.section, `Yr ${q.year}`, q.subject, q.type, q.track].filter(Boolean).map((tag, i) => (
                          <span key={i} style={{ background: C.accentLight, color: C.navy, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{tag}</span>
                        ))}
                      </div>
                      <p style={{ fontSize: 16, margin: "0 0 6px", fontWeight: 600 }}>{q.question}</p>
                      <div style={{ fontSize: 14, color: C.textSec }}>
                        {q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join("  •  ")} — Answer: {String.fromCharCode(65 + q.correctAnswer)}
                      </div>
                    </div>
                    <button onClick={() => deleteQ(q.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.red, padding: 8, flexShrink: 0, fontSize: 24 }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Question Tab */}
          {adminTab === "add" && (
            <div style={cardS()}>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, marginTop: 0, color: C.navy }}>Add New Question</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 16, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 8 }}>Section</label>
                  <select value={newQ.section} onChange={e => setNewQ(p => ({ ...p, section: e.target.value, year: e.target.value === "elementary" ? 1 : 7, subject: "", track: "" }))} style={inputS}>
                    <option value="elementary">Elementary (Yr 1-6)</option>
                    <option value="college">College (Yr 7-12)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 16, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 8 }}>Year</label>
                  <select value={newQ.year} onChange={e => setNewQ(p => ({ ...p, year: parseInt(e.target.value), subject: "" }))} style={inputS}>
                    {(newQ.section === "elementary" ? ELEMENTARY_YEARS : [...JUNIOR_COLLEGE_YEARS, ...SENIOR_COLLEGE_YEARS]).map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                {newQ.section === "college" && newQ.year >= 10 && (
                  <div>
                    <label style={{ fontSize: 16, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 8 }}>Department</label>
                    <select value={newQ.track} onChange={e => setNewQ(p => ({ ...p, track: e.target.value, subject: "" }))} style={inputS}>
                      <option value="">Select department...</option>
                      {SENIOR_TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 16, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 8 }}>Subject</label>
                  <select value={newQ.subject} onChange={e => setNewQ(p => ({ ...p, subject: e.target.value }))} style={inputS}>
                    <option value="">Select subject...</option>
                    {getAdminSubjects().map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 16, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 8 }}>Type</label>
                  <select value={newQ.type} onChange={e => setNewQ(p => ({ ...p, type: e.target.value }))} style={inputS}>
                    <option value="test">Test</option><option value="exam">Exam</option><option value="practice">Practice</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 16, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 8 }}>Question</label>
                  <textarea value={newQ.question} onChange={e => setNewQ(p => ({ ...p, question: e.target.value }))} rows={3}
                    style={{ ...inputS, resize: "vertical" }} placeholder="Type the question..." />
                </div>
                {newQ.options.map((opt, i) => (
                  <div key={i}>
                    <label style={{ fontSize: 16, fontWeight: 700, color: newQ.correctAnswer === i ? C.green : C.textSec, display: "block", marginBottom: 8 }}>
                      Option {String.fromCharCode(65 + i)} {newQ.correctAnswer === i && "✓ (Correct Answer)"}
                    </label>
                    <div style={{ display: "flex", gap: 10 }}>
                      <input value={opt} onChange={e => { const o = [...newQ.options]; o[i] = e.target.value; setNewQ(p => ({ ...p, options: o })); }}
                        style={{ ...inputS, flex: 1, borderColor: newQ.correctAnswer === i ? C.green : C.border }} placeholder={`Option ${String.fromCharCode(65 + i)}...`} />
                      <button onClick={() => setNewQ(p => ({ ...p, correctAnswer: i }))}
                        style={{ ...(newQ.correctAnswer === i ? btnGreen : btnOut), padding: "0 20px", fontSize: 24 }}>✓</button>
                    </div>
                  </div>
                ))}
                <button onClick={addQuestion} disabled={loading} style={{ ...btnP, width: "100%", justifyContent: "center", marginTop: 10, padding: 18, fontSize: 18 }}>➕ Add Question</button>
              </div>
            </div>
          )}

          {/* Bulk Upload Tab */}
          {adminTab === "upload" && (
            <div>
              <div style={cardS({ marginBottom: 20 })}>
                <h3 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 12px", color: C.navy }}>Bulk Upload (JSON)</h3>
                <p style={{ fontSize: 16, color: C.textSec, margin: "0 0 12px" }}>Paste a JSON array of questions:</p>
                <pre style={{ background: "#f0f1f5", padding: 16, borderRadius: 12, fontSize: 14, overflow: "auto", lineHeight: 1.6, color: C.text }}>
{`[
  {
    "section": "college",
    "year": 10,
    "track": "Science",
    "subject": "Physics",
    "type": "test",
    "question": "What is the SI unit of force?",
    "options": ["Joule","Newton","Watt","Pascal"],
    "correctAnswer": 1
  }
]`}
                </pre>
                <p style={{ fontSize: 14, color: C.textSec, marginTop: 10 }}>
                  <strong>correctAnswer</strong>: 0=A, 1=B, 2=C, 3=D &nbsp;|&nbsp; <strong>track</strong>: required for Yr 10-12 only
                </p>
              </div>
              <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={10}
                style={{ ...inputS, fontFamily: "monospace", fontSize: 16, resize: "vertical", marginBottom: 16 }}
                placeholder="Paste JSON array here..." />
              <button onClick={bulkUpload} disabled={loading} style={{ ...btnP, width: "100%", justifyContent: "center", padding: 18, fontSize: 18 }}>📤 Upload Questions</button>
            </div>
          )}

          {/* Results Tab - REDESIGNED with Filters */}
          {adminTab === "results" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: C.navy }}>Exam Results</h3>
                {results.length > 0 && <button onClick={clearAllResults} style={{ ...btnDanger, padding: "10px 18px", fontSize: 14 }}>Clear All</button>}
              </div>

              {/* Filters */}
              <div style={cardS({ marginBottom: 20, padding: 20 })}>
                <h4 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: C.navy }}>🔍 Filter Results by Class & Subject</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 6 }}>Section</label>
                    <select 
                      value={filterSection} 
                      onChange={e => { setFilterSection(e.target.value); setFilterYear(""); setFilterSubject(""); }}
                      style={{ ...inputS, padding: "12px 14px", fontSize: 16 }}
                    >
                      <option value="">All Sections</option>
                      <option value="elementary">Elementary</option>
                      <option value="college">College</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 6 }}>Year</label>
                    <select 
                      value={filterYear} 
                      onChange={e => { setFilterYear(e.target.value); setFilterSubject(""); }}
                      style={{ ...inputS, padding: "12px 14px", fontSize: 16 }}
                      disabled={!filterSection}
                    >
                      <option value="">All Years</option>
                      {filterSection === "elementary" && ELEMENTARY_YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
                      {filterSection === "college" && [...JUNIOR_COLLEGE_YEARS, ...SENIOR_COLLEGE_YEARS].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 6 }}>Subject</label>
                    <select 
                      value={filterSubject} 
                      onChange={e => setFilterSubject(e.target.value)}
                      style={{ ...inputS, padding: "12px 14px", fontSize: 16 }}
                      disabled={!filterYear}
                    >
                      <option value="">All Subjects</option>
                      {getFilterSubjects().map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                {(filterSection || filterYear || filterSubject) && (
                  <button 
                    onClick={() => { setFilterSection(""); setFilterYear(""); setFilterSubject(""); }}
                    style={{ ...btnOut, marginTop: 16, padding: "10px 18px", fontSize: 14 }}
                  >
                    ✕ Clear Filters
                  </button>
                )}
              </div>

              {/* Filtered Results Count */}
              <p style={{ fontSize: 16, color: C.textSec, marginBottom: 16 }}>
                Showing <strong style={{ color: C.navy }}>{filteredResults.length}</strong> result{filteredResults.length !== 1 ? "s" : ""}
                {(filterSection || filterYear || filterSubject) && " (filtered)"}
              </p>

              {filteredResults.length === 0 && (
                <div style={cardS({ textAlign: "center", padding: 40 })}>
                  <p style={{ color: C.textSec, fontSize: 18 }}>
                    {results.length === 0 ? "No results recorded yet." : "No results match the selected filters."}
                  </p>
                </div>
              )}
              
              {filteredResults.map((r, i) => (
                <div key={r.id || i} style={{ ...cardS({ marginBottom: 12, padding: "16px 20px", borderLeft: `5px solid ${r.score >= 50 ? C.green : C.red}` }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 20, margin: "0 0 6px", color: C.navy }}>{r.student?.name || "Unknown"}</p>
                      <span style={{ fontSize: 16, color: C.textSec }}>{r.section} • Year {r.year}{r.track ? ` • ${r.track}` : ""} • {r.subject} • {r.examType}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 32, fontWeight: 900, color: r.score >= 50 ? C.green : C.red }}>{r.score}%</div>
                      <div style={{ fontSize: 16, color: C.textSec }}>{r.correct}/{r.total}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: C.textSec, marginTop: 8 }}>{new Date(r.ts || r.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}

          {/* Students Tab */}
          {adminTab === "students" && (
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: C.navy }}>Registered Students ({students.length})</h3>
              {students.length === 0 && <div style={cardS({ textAlign: "center", padding: 40 })}><p style={{ color: C.textSec, fontSize: 18 }}>No students registered yet.</p></div>}
              {students.map((s, i) => {
                const sr = results.filter(r => r.student?.id === s.id || r.student?.id === s.studentId);
                const avg = sr.length > 0 ? Math.round(sr.reduce((a, r) => a + r.score, 0) / sr.length) : "-";
                return (
                  <div key={s.id || i} style={{ ...cardS({ marginBottom: 12, padding: "16px 20px" }) }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 20, margin: "0 0 4px", color: C.navy }}>{s.name}</p>
                        <span style={{ fontSize: 16, color: C.textSec }}>ID: {s.id || s.studentId} • {s.section}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: C.navy }}>Avg: {avg}{avg !== "-" ? "%" : ""}</div>
                        <div style={{ fontSize: 16, color: C.textSec }}>{sr.length} exam{sr.length !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <div style={pageS}><Toast /><LoadingOverlay /></div>;
}

function LoginForm({ isAdmin, onLogin, C, inputS, btnP }) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    if (isAdmin) {
      if (pass === "adminpeculiar@1234") onLogin("Administrator", "admin", "admin");
      else setErr("Invalid password");
    } else {
      if (!name.trim() || !id.trim()) { setErr("Please fill all fields"); return; }
      onLogin(name.trim(), id.trim(), "student");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {!isAdmin && (<>
        <div>
          <label style={{ fontSize: 18, fontWeight: 700, display: "block", marginBottom: 8, color: C.textSec }}>Full Name</label>
          <input value={name} onChange={e => { setName(e.target.value); setErr(""); }} style={inputS} placeholder="Enter your full name" />
        </div>
        <div>
          <label style={{ fontSize: 18, fontWeight: 700, display: "block", marginBottom: 8, color: C.textSec }}>Student ID</label>
          <input value={id} onChange={e => { setId(e.target.value); setErr(""); }} style={inputS} placeholder="Enter student ID" />
        </div>
      </>)}
      {isAdmin && (
        <div>
          <label style={{ fontSize: 18, fontWeight: 700, display: "block", marginBottom: 8, color: C.textSec }}>Admin Password</label>
          <input type="password" value={pass} onChange={e => { setPass(e.target.value); setErr(""); }}
            style={inputS} placeholder="Enter admin password" onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
      )}
      {err && <p style={{ color: C.red, fontSize: 16, margin: 0, fontWeight: 600 }}>{err}</p>}
      <button onClick={submit} style={{ ...btnP, width: "100%", justifyContent: "center", padding: 20, fontSize: 22, marginTop: 10 }}>
        {isAdmin ? "🔐 Access Admin" : "📝 Start CBT"}
      </button>
    </div>
  );
}

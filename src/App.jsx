import { useState, useEffect, useCallback, useRef } from "react";
import { questionsAPI, resultsAPI, studentsAPI, checkServerHealth } from "./services/api";

const APP_NAME = "Lekki Peculiar Schools";

const ELEM_LOGO = "/elementary-logo-removebg-preview.png";
const COLLEGE_LOGO = "/college-logo-removebg-preview.png";

const ELEMENTARY_YEARS = [1, 2, 3, 4, 5, 6];
const JUNIOR_COLLEGE_YEARS = [7, 8, 9];
const SENIOR_COLLEGE_YEARS = [10, 11, 12];
const SENIOR_TRACKS = ["Science", "Commercial", "Arts"];

const JUNIOR_SUBJECTS = ["Mathematics", "English", "Basic Science", "Basic Technology", "Social Studies", "Civic Education", "French", "Computer Studies", "Agricultural Science", "Home Economics", "CRS", "Business Studies", "Yoruba", "History","Music","PHE","CCA","ICT","PVS"];
const SENIOR_SUBJECTS = {
  Science: ["Mathematics", "English", "Physics", "Chemistry", "Biology", "Further Mathematics", "Computer Studies", "Civic Education", "Geography", "Agricultural Science","ICT"],
  Commercial: ["Mathematics", "English", "Commerce", "Economics", "Accounting", "Civic Education", "Marketing", "Government"],
  Arts: ["Mathematics", "English", "Literature in English", "Government", "Yoruba", "CRS", "Civic Education", "Marketing", "Economics"]
};

// Updated: Added French for Year 1-4
const ELEMENTARY_SUBJECTS = {
  1: ["English Language", "Mathematics", "Basic Science", "Social Studies", "Verbal Reasoning", "Quantitative Reasoning", "Handwriting", "Phonics", "French", "Basic Technology","History", "CCA", "CRS", "PHE"],
  2: ["English Language", "Mathematics", "Basic Science", "Social Studies", "Verbal Reasoning", "Quantitative Reasoning", "Handwriting", "Phonics", "French", "Basic Technology","History", "CCA", "CRS", "PHE"],
  3: ["English Language", "Mathematics", "Basic Science", "Social Studies", "Verbal Reasoning", "Quantitative Reasoning", "Computer Studies", "French", "Basic Technology","History", "CCA", "CRS", "PHE"],
  4: ["English Language", "Mathematics", "Basic Science", "Social Studies", "Verbal Reasoning", "Quantitative Reasoning", "Computer Studies", "French", "Civic Education", "Basic Technology","History", "CCA", "CRS", "PHE"],
  5: ["English Language", "Mathematics", "Basic Science", "Social Studies", "Verbal Reasoning", "Quantitative Reasoning", "Computer Studies", "French", "Civic Education", "Agricultural Science", "Basic Technology","History", "CCA", "CRS", "PHE"],
  6: ["English Language", "Mathematics", "Basic Science", "Social Studies", "Verbal Reasoning", "Quantitative Reasoning", "Computer Studies", "French", "Civic Education", "Agricultural Science", "Basic Technology","Histroy", "CCA", "CRS", "PHE"]
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

// ══════════════════════════════════════════════════════
// PASSWORD MODAL COMPONENT
// ══════════════════════════════════════════════════════
function PasswordModal({ isOpen, onClose, onSubmit, subjectName, error, C }) {
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    onSubmit(password);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)"
    }}>
      <div style={{
        background: "white", borderRadius: 20, padding: 35, maxWidth: 450,
        width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        animation: "slideIn 0.3s ease-out"
      }}>
        <h2 style={{ color: C.navy, marginBottom: 15, textAlign: "center", fontSize: 24 }}>
          🔐 Password Required
        </h2>
        <p style={{ color: C.textSec, marginBottom: 20, textAlign: "center", fontSize: 16 }}>
          Enter password to access <strong style={{ color: C.navy }}>{subjectName}</strong> Test
        </p>
        
        {error && (
          <div style={{
            background: C.redLight, color: C.red, padding: 12, borderRadius: 10,
            marginBottom: 15, textAlign: "center", fontWeight: 600, fontSize: 15
          }}>
            {error}
          </div>
        )}

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter test password"
          autoFocus
          style={{
            width: "100%", padding: 15, border: `2px solid ${C.border}`,
            borderRadius: 10, fontSize: 16, marginBottom: 20, boxSizing: "border-box",
            outline: "none", transition: "border-color 0.2s"
          }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: 12, border: "none", borderRadius: 10,
              background: "#e0e0e0", color: "#666", fontSize: 16,
              cursor: "pointer", fontWeight: 600
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1, padding: 12, border: "none", borderRadius: 10,
              background: C.navy, color: "white", fontSize: 16,
              cursor: "pointer", fontWeight: 600
            }}
          >
            Unlock Test
          </button>
        </div>
      </div>
    </div>
  );
}

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

  // ══════════════════════════════════════════════════════
  // PASSWORD PROTECTION STATE - FIXED PERMANENT PASSWORDS
  // ══════════════════════════════════════════════════════
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingTest, setPendingTest] = useState(null);
  const [passwordError, setPasswordError] = useState("");

  const submitRef = useRef(null);
  const timer = useTimer(() => submitRef.current?.());

  // FIXED PERMANENT PASSWORDS - These never change
  const testPasswords = {
    "elementary-1-English Language": "FWKN8",
    "elementary-1-Mathematics": "8UW2N",
    "elementary-1-Basic Science": "VBHZ",
    "elementary-1-Social Studies": "V6MA",
    "elementary-1-Verbal Reasoning": "4DZT",
    "elementary-1-Quantitative Reasoning": "3EZYV",
    "elementary-1-Handwriting": "T9WWV",
    "elementary-1-Phonics": "89JZA",
    "elementary-1-French": "N3R2B",
    "elementary-1-Basic Technology": "SUX53",
    "elementary-1-History": "5B78",
    "elementary-1-CCA": "M53WQ",
    "elementary-1-CRS": "CUFW",
    "elementary-1-PHE": "E6N9F",
    "elementary-2-English Language": "9AUV",
    "elementary-2-Mathematics": "4KVVG",
    "elementary-2-Basic Science": "S9PR",
    "elementary-2-Social Studies": "MTWWR",
    "elementary-2-Verbal Reasoning": "5VG2",
    "elementary-2-Quantitative Reasoning": "DAEG3",
    "elementary-2-Handwriting": "FA6X",
    "elementary-2-Phonics": "2P4YM",
    "elementary-2-French": "BKEH",
    "elementary-2-Basic Technology": "42AEH",
    "elementary-2-History": "DZS8",
    "elementary-2-CCA": "FGUK",
    "elementary-2-CRS": "D9W84",
    "elementary-2-PHE": "Y2ZY",
    "elementary-3-English Language": "494F",
    "elementary-3-Mathematics": "YJF4",
    "elementary-3-Basic Science": "5XFKC",
    "elementary-3-Social Studies": "BXRV4",
    "elementary-3-Verbal Reasoning": "ABH3",
    "elementary-3-Quantitative Reasoning": "KBBE4",
    "elementary-3-Computer Studies": "WK7P",
    "elementary-3-French": "39PM",
    "elementary-3-Basic Technology": "GKGGW",
    "elementary-3-History": "E5L6",
    "elementary-3-CCA": "RT54",
    "elementary-3-CRS": "G7KH",
    "elementary-3-PHE": "CYK8",
    "elementary-4-English Language": "RQR6Y",
    "elementary-4-Mathematics": "BBBWE",
    "elementary-4-Basic Science": "7MZYR",
    "elementary-4-Social Studies": "K3XP",
    "elementary-4-Verbal Reasoning": "4TGC",
    "elementary-4-Quantitative Reasoning": "SUMX",
    "elementary-4-Computer Studies": "8HCA",
    "elementary-4-French": "TKX6D",
    "elementary-4-Civic Education": "WUE4",
    "elementary-4-Basic Technology": "W985Z",
    "elementary-4-History": "8QDKC",
    "elementary-4-CCA": "Q9CX",
    "elementary-4-CRS": "8NQBT",
    "elementary-4-PHE": "KLNFL",
    "elementary-5-English Language": "CLFL",
    "elementary-5-Mathematics": "2UQAA",
    "elementary-5-Basic Science": "TY4B",
    "elementary-5-Social Studies": "8HEG",
    "elementary-5-Verbal Reasoning": "G348",
    "elementary-5-Quantitative Reasoning": "EVGPU",
    "elementary-5-Computer Studies": "GQRF",
    "elementary-5-French": "CXAV",
    "elementary-5-Civic Education": "D8K8X",
    "elementary-5-Agricultural Science": "BRTF",
    "elementary-5-Basic Technology": "MXKMD",
    "elementary-5-History": "4DPUW",
    "elementary-5-CCA": "ARY7",
    "elementary-5-CRS": "Y8LL",
    "elementary-5-PHE": "8NXS8",
    "elementary-6-English Language": "DMSF",
    "elementary-6-Mathematics": "6D48",
    "elementary-6-Basic Science": "83F3A",
    "elementary-6-Social Studies": "8UZM6",
    "elementary-6-Verbal Reasoning": "NUDW6",
    "elementary-6-Quantitative Reasoning": "NKPU",
    "elementary-6-Computer Studies": "UPUE2",
    "elementary-6-French": "LVZMV",
    "elementary-6-Civic Education": "3C55",
    "elementary-6-Agricultural Science": "ETCBS",
    "elementary-6-Basic Technology": "3W9D",
    "elementary-6-Histroy": "EUV4",
    "elementary-6-CCA": "VVCNN",
    "elementary-6-CRS": "C6TV",
    "elementary-6-PHE": "ZHMR",
    "college-7-Mathematics": "HUJ7",
    "college-7-English": "R7VNE",
    "college-7-Basic Science": "NC79",
    "college-7-Basic Technology": "C24D",
    "college-7-Social Studies": "T7Y8",
    "college-7-Civic Education": "LZYV",
    "college-7-French": "Y42XJ",
    "college-7-Computer Studies": "M25U",
    "college-7-Agricultural Science": "KW2KU",
    "college-7-Home Economics": "M347",
    "college-7-CRS": "LVA8X",
    "college-7-Business Studies": "CTYRW",
    "college-7-Yoruba": "FNC5",
    "college-7-History": "MZBCT",
    "college-7-Music": "CGHA",
    "college-7-PHE": "UUCBY",
    "college-7-CCA": "Y8EED",
    "college-7-ICT": "VBGNZ",
    "college-7-PVS": "GNWNT",
    "college-8-Mathematics": "LTJML",
    "college-8-English": "6EYD",
    "college-8-Basic Science": "X3A8",
    "college-8-Basic Technology": "WL4G",
    "college-8-Social Studies": "MA3K",
    "college-8-Civic Education": "TAKN",
    "college-8-French": "UYJ9K",
    "college-8-Computer Studies": "86BK6",
    "college-8-Agricultural Science": "VRB5",
    "college-8-Home Economics": "YGRNZ",
    "college-8-CRS": "S7EN",
    "college-8-Business Studies": "BDAJX",
    "college-8-Yoruba": "GH3GC",
    "college-8-History": "DPAUD",
    "college-8-Music": "MB5XP",
    "college-8-PHE": "N43V",
    "college-8-CCA": "GVFGA",
    "college-8-ICT": "8NEK",
    "college-8-PVS": "WJ8W",
    "college-9-Mathematics": "W7URE",
    "college-9-English": "MG3J",
    "college-9-Basic Science": "R2XE",
    "college-9-Basic Technology": "ZW4BX",
    "college-9-Social Studies": "T89XC",
    "college-9-Civic Education": "7LD2X",
    "college-9-French": "UTEE",
    "college-9-Computer Studies": "D3PGA",
    "college-9-Agricultural Science": "55KW",
    "college-9-Home Economics": "WHAG",
    "college-9-CRS": "GXZ3",
    "college-9-Business Studies": "WWCL",
    "college-9-Yoruba": "SU7ZE",
    "college-9-History": "EA5QY",
    "college-9-Music": "33JE3",
    "college-9-PHE": "6ZRD",
    "college-9-CCA": "9P7L7",
    "college-9-ICT": "9LWA",
    "college-9-PVS": "NH6MX",
    "college-10-Science-Mathematics": "JVA3B",
    "college-10-Science-English": "8HUJS",
    "college-10-Science-Physics": "KU95E",
    "college-10-Science-Chemistry": "4ZBE",
    "college-10-Science-Biology": "JTMS",
    "college-10-Science-Further Mathematics": "RL8M",
    "college-10-Science-Computer Studies": "S3AS",
    "college-10-Science-Civic Education": "GWHE",
    "college-10-Science-Geography": "Z8GP",
    "college-10-Science-Agricultural Science": "S3CH6",
    "college-10-Science-ICT": "DV9E3",
    "college-10-Commercial-Mathematics": "3FZLB",
    "college-10-Commercial-English": "PCEZ",
    "college-10-Commercial-Commerce": "JHUL",
    "college-10-Commercial-Economics": "NQF6Q",
    "college-10-Commercial-Accounting": "VDXJ",
    "college-10-Commercial-Civic Education": "Y377",
    "college-10-Commercial-Marketing": "YJE7",
    "college-10-Commercial-Government": "BGHM",
    "college-10-Arts-Mathematics": "AKXZF",
    "college-10-Arts-English": "F8ZG",
    "college-10-Arts-Literature in English": "C8VD",
    "college-10-Arts-Government": "GVEZV",
    "college-10-Arts-Yoruba": "SNWW",
    "college-10-Arts-CRS": "T6KS",
    "college-10-Arts-Civic Education": "EVFWN",
    "college-10-Arts-Marketing": "SV9QR",
    "college-10-Arts-Economics": "WHV9",
    "college-11-Science-Mathematics": "BNVY",
    "college-11-Science-English": "NHMP7",
    "college-11-Science-Physics": "S3LBX",
    "college-11-Science-Chemistry": "NUUX",
    "college-11-Science-Biology": "U9GXV",
    "college-11-Science-Further Mathematics": "7UYV4",
    "college-11-Science-Computer Studies": "J7BV3",
    "college-11-Science-Civic Education": "WRTZ",
    "college-11-Science-Geography": "X5P7F",
    "college-11-Science-Agricultural Science": "FAL4H",
    "college-11-Science-ICT": "GDPNQ",
    "college-11-Commercial-Mathematics": "96RTV",
    "college-11-Commercial-English": "Y22G",
    "college-11-Commercial-Commerce": "UZLGL",
    "college-11-Commercial-Economics": "SY52",
    "college-11-Commercial-Accounting": "NPTZS",
    "college-11-Commercial-Civic Education": "GTAS",
    "college-11-Commercial-Marketing": "8D4T",
    "college-11-Commercial-Government": "HLBSM",
    "college-11-Arts-Mathematics": "DSHEE",
    "college-11-Arts-English": "FGB3",
    "college-11-Arts-Literature in English": "ZLFD",
    "college-11-Arts-Government": "NMMZM",
    "college-11-Arts-Yoruba": "YT9P",
    "college-11-Arts-CRS": "TVLN",
    "college-11-Arts-Civic Education": "FVQP",
    "college-11-Arts-Marketing": "BBM3Z",
    "college-11-Arts-Economics": "QPXCY",
    "college-12-Science-Mathematics": "8AKNS",
    "college-12-Science-English": "WVR2",
    "college-12-Science-Physics": "ALYYT",
    "college-12-Science-Chemistry": "ELP6",
    "college-12-Science-Biology": "7V3J",
    "college-12-Science-Further Mathematics": "7C5XG",
    "college-12-Science-Computer Studies": "KYRR2",
    "college-12-Science-Civic Education": "3NPC",
    "college-12-Science-Geography": "JRMA",
    "college-12-Science-Agricultural Science": "8BMXY",
    "college-12-Science-ICT": "XCXD6",
    "college-12-Commercial-Mathematics": "KL293",
    "college-12-Commercial-English": "XS95",
    "college-12-Commercial-Commerce": "BDMP",
    "college-12-Commercial-Economics": "D49K",
    "college-12-Commercial-Accounting": "LVPC2",
    "college-12-Commercial-Civic Education": "6S5K",
    "college-12-Commercial-Marketing": "2WXWT",
    "college-12-Commercial-Government": "Z7T6",
    "college-12-Arts-Mathematics": "HMB3",
    "college-12-Arts-English": "37W3",
    "college-12-Arts-Literature in English": "XJCK",
    "college-12-Arts-Government": "XVRZ7",
    "college-12-Arts-Yoruba": "YSZ5",
    "college-12-Arts-CRS": "FSCJ",
    "college-12-Arts-Civic Education": "Z5T9",
    "college-12-Arts-Marketing": "2MKPL",
    "college-12-Arts-Economics": "F2H4"
  };

  // Get password key for a subject
  const getPasswordKey = (section, year, subject, track = null) => {
    if (section === "elementary") {
      return `elementary-${year}-${subject}`;
    } else {
      if (year >= 10 && track) {
        return `college-${year}-${track}-${subject}`;
      } else {
        return `college-${year}-${subject}`;
      }
    }
  };

  // Handle password verification
  const handlePasswordSubmit = (enteredPassword) => {
    if (!pendingTest) return;

    const { subject, type } = pendingTest;
    const key = getPasswordKey(section, selYear, subject, selTrack);
    const correctPassword = testPasswords[key];

    if (enteredPassword.trim() === correctPassword) {
      setShowPasswordModal(false);
      setPasswordError("");
      setPendingTest(null);
      // Proceed with starting the test
      proceedWithTest(subject, type);
    } else {
      setPasswordError("❌ Incorrect password. Please try again or contact your teacher.");
    }
  };

  // Modified startExam to check for password if it's a test
  const startExam = async (subject, type) => {
    // Only require password for "test" type
    if (type === "test") {
      // Show password modal (all passwords are hardcoded, so they always exist)
      setPendingTest({ subject, type });
      setShowPasswordModal(true);
      setPasswordError("");
      return;
    }

    // For exam and practice, proceed directly
    proceedWithTest(subject, type);
  };

  // Proceed with test after password verification (or for exam/practice)
  const proceedWithTest = async (subject, type) => {
    setSelSubject(subject);
    setExamType(type);
    
    if (type === "practice") {
      setQuestions(generateSampleQuestions(subject, QUESTION_COUNTS.practice));
      setView("exam");
      return;
    }

    setLoading(true);
    try {
      const allQs = await questionsAPI.getAll();
      let pool = allQs.filter(q => 
        q.section === section && 
        q.year === selYear && 
        q.subject === subject && 
        q.type === type
      );

      if (pool.length === 0) {
        notify(`No ${type} questions available for ${subject}. Contact admin.`, "error");
        return;
      }

      const needed = QUESTION_COUNTS[type];
      if (pool.length < needed) {
        notify(`Only ${pool.length}/${needed} questions available. Using what we have.`, "info");
      }

      const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, needed);
      setQuestions(shuffled);
      setCurQ(0);
      setAnswers({});
      setFlagged(new Set());
      setResult(null);
      setView("exam");

      const mins = type === "exam" ? 50 : type === "test" ? 25 : 15;
      timer.start(mins);
    } catch (error) {
      console.error('Error loading questions:', error);
      notify("Failed to load questions. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const finishExam = useCallback(async () => {
    timer.stop();
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) correct++;
    });
    const score = Math.round((correct / questions.length) * 100);
    const resultData = { 
      section, 
      year: selYear, 
      track: selTrack, 
      subject: selSubject, 
      examType, 
      correct, 
      total: questions.length, 
      score,
      student: { name: user.name, id: user.id }
    };
    setResult(resultData);
    
    if (serverConnected && examType !== "practice") {
      try {
        const savedResult = await resultsAPI.add(resultData);
        setResults(prev => [savedResult, ...prev]);
      } catch (error) {
        console.error('Error saving result:', error);
        notify("Result couldn't be saved to database, but you can still see it below.", "error");
      }
    }
    
    setView("result");
  }, [timer, questions, answers, section, selYear, selTrack, selSubject, examType, user, serverConnected]);

  submitRef.current = finishExam;

  const login = async (name, id, role) => {
    setUser({ name, id, role });
    if (role === "admin") {
      setView("admin");
    } else {
      setView("yearSelect");
    }

    // If student is logging in, create/update student record
    if (role === "student" && serverConnected) {
      try {
        const studentData = {
          studentId: id,
          name: name,
          section: section
        };
        await studentsAPI.add(studentData);
      } catch (error) {
        console.error('Error adding student:', error);
      }
    }
  };

  const notify = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Use this to check the server connection and show the splash screen
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

  //This is for Loading all the data from MongoDB on mount
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
        notify("Error loading data from server", "error");
      } finally {
        setLoading(false);
      }
    };

    if (view === "admin" || view === "yearSelect") {
      loadData();
    }
  }, [view, serverConnected]);

  const addQ = async () => {
    if (!newQ.question.trim() || newQ.options.some(o => !o.trim()) || !newQ.subject.trim()) {
      notify("Please fill all fields", "error");
      return;
    }

    try {
      setLoading(true);
      const questionData = {
        question: newQ.question.trim(),
        options: newQ.options.map(o => o.trim()),
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
  const btnOut = { ...btnP, background: "transparent", border: `3px solid ${C.border}`, color: C.navy };
  const cardS = (extra = {}) => ({ background: C.card, borderRadius: "18px", padding: "24px", border: `2px solid ${C.border}`, boxShadow: "0 2px 8px rgba(26,34,96,0.04)", ...extra });

  const filteredResults = getFilteredResults();

  function Logo({ type, size = 60 }) {
    return <img src={type === "college" ? COLLEGE_LOGO : ELEM_LOGO} alt="Logo" style={{ width: size, height: size, borderRadius: 12, objectFit: "contain" }} />;
  }

  function HoverCard({ children, onClick, style = {} }) {
    const [hover, setHover] = useState(false);
    return (
      <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ ...cardS(), cursor: "pointer", transform: hover ? "translateY(-4px)" : "none", boxShadow: hover ? "0 8px 20px rgba(26,34,96,0.15)" : "0 2px 8px rgba(26,34,96,0.04)", transition: "all 0.2s", ...style }}>
        {children}
      </div>
    );
  }

  function Header({ title, onBack, showLogout = true }) {
    return (
      <div style={{ background: "#fff", borderBottom: `2px solid ${C.border}`, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {onBack && <button onClick={onBack} style={{ ...btnSec, padding: "12px", fontSize: 24 }}>←</button>}
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.navy }}>{title}</h2>
        </div>
        {showLogout && user && (
          <button onClick={() => { setUser(null); setView("home"); setSection(null); setSelYear(null); setSelTrack(null); timer.stop(); }}
            style={{ ...btnOut, padding: "10px 18px", fontSize: 16 }}>
            🚪 Logout
          </button>
        )}
      </div>
    );
  }

  function Toast() {
    if (!toast) return null;
    const bgMap = { success: C.greenLight, error: C.redLight, info: C.yellowLight };
    const txtMap = { success: C.green, error: C.red, info: "#8a7200" };
    return (
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: bgMap[toast.type], color: txtMap[toast.type], padding: "16px 24px", borderRadius: 12, fontSize: 16, fontWeight: 700, boxShadow: "0 8px 20px rgba(0,0,0,0.15)", minWidth: 250, maxWidth: 400 }}>
        {toast.msg}
      </div>
    );
  }

  function LoadingOverlay() {
    if (!loading) return null;
    return (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 60, height: 60, border: `6px solid ${C.accentLight}`, borderTop: `6px solid ${C.navy}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
          <p style={{ marginTop: 16, fontSize: 18, fontWeight: 700, color: C.navy }}>Loading...</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // SPLASH
  // ══════════════════════════════════════════════════════
  if (view === "splash") {
    return (
      <div style={{ ...pageS, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", gap: 28, marginBottom: 28 }}>
          <Logo type="elementary" size={110} />
          <Logo type="college" size={110} />
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 900, color: C.navy, marginBottom: 10 }}>{APP_NAME}</h1>
        <p style={{ fontSize: 22, color: C.textSec, marginBottom: 28 }}>Computer-Based Testing System</p>
        {serverConnected === false && (
          <p style={{ color: C.red, fontSize: 18, fontWeight: 600 }}>⚠️ Server disconnected. Results won't be saved.</p>
        )}
        {serverConnected && (
          <p style={{ color: C.green, fontSize: 18, fontWeight: 600 }}>✓ Connected to database</p>
        )}
        <div style={{ width: 70, height: 70, border: `8px solid ${C.accentLight}`, borderTop: `8px solid ${C.navy}`, borderRadius: "50%", animation: "spin 1.2s linear infinite", marginTop: 30 }} />
        <style>
          {`@keyframes spin { to { transform: rotate(360deg); } }`}
        </style>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // HOME
  // ══════════════════════════════════════════════════════
  if (view === "home") {
    return (
      <div style={pageS}>
        <Toast />
        <div style={{ maxWidth: 540, margin: "0 auto", padding: 24 }}>
          <div style={{ textAlign: "center", margin: "40px 0" }}>
            <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 20 }}>
              <Logo type="elementary" size={90} />
              <Logo type="college" size={90} />
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 900, color: C.navy, margin: "0 0 10px" }}>{APP_NAME}</h1>
            <p style={{ fontSize: 20, color: C.textSec }}>Select your section to begin</p>
          </div>

        {/* Elementary */}
        <HoverCard onClick={() => { setSection("elementary"); setView("login"); }} style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 20 }}>
          <Logo type="elementary" size={80} />
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: C.navy }}>Lekki Peculiar School</h3>
            <p style={{ margin: 0, color: C.textSec, fontSize: 16 }}>Elementary (Year 1–6)</p>
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
          <p style={{ margin: "8px 0 0", color: C.textSec, fontSize: 16 }}>Manage questions, passwords, view results &amp; students</p>
        </HoverCard>
      </div>
    </div>
  );
}

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
         <LoginForm isAdmin={isAdm} section={section} onLogin={login} C={C} inputS={inputS} btnP={btnP} />
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
  // SUBJECT SELECT (WITH PASSWORD MODAL)
  // ══════════════════════════════════════════════════════
  if (view === "subjectSelect") {
    const subs = getSubjects();
    const lbl = section === "elementary" ? `Year ${selYear}` : selYear >= 10 ? `Year ${selYear} — ${selTrack}` : `Year ${selYear} (Junior College)`;
    return (
      <div style={pageS}>
        <Toast />
        <LoadingOverlay />
        <PasswordModal 
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            setPendingTest(null);
            setPasswordError("");
          }}
          onSubmit={handlePasswordSubmit}
          subjectName={pendingTest?.subject || ""}
          error={passwordError}
          C={C}
        />
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
                    <button onClick={() => startExam(sub, "test")} disabled={loading} style={{ ...btnP, padding: "12px 20px", fontSize: 16 }}>
                      🔐 Test (20Q)
                    </button>
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
                style={{ ...btnSec, flex: 1, opacity: curQ === 0 ? 0.4 : 1 }}>← Previous</button>
              {curQ < questions.length - 1 ? (
                <button onClick={() => setCurQ(curQ + 1)} style={{ ...btnP, flex: 1 }}>Next →</button>
              ) : (
                <button onClick={finishExam} style={{ ...btnP, flex: 1, background: C.green }}>✓ Submit</button>
              )}
            </div>

            {flagged.size > 0 && (
              <div style={{ ...cardS({ marginTop: 20, background: C.yellowLight, borderColor: C.yellow }) }}>
                <span style={{ fontSize: 16, color: "#8a7200", fontWeight: 700 }}>🚩 {flagged.size} flagged question{flagged.size !== 1 ? "s" : ""}</span>
              </div>
            )}
          </>)}
        </div>

        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: `2px solid ${C.border}`, padding: "12px 20px" }}>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {questions.map((_, i) => {
              const ans = i in answers;
              const flag = flagged.has(i);
              const cur = i === curQ;
              return (
                <button key={i} onClick={() => setCurQ(i)}
                  style={{
                    width: 40, height: 40, borderRadius: 8, border: "none", cursor: "pointer",
                    background: cur ? C.navy : ans ? C.green : flag ? C.yellow : C.accentLight,
                    color: cur || ans ? "#fff" : flag ? "#8a7200" : C.navy,
                    fontWeight: 700, fontSize: 14
                  }}>{i + 1}</button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // RESULT
  // ══════════════════════════════════════════════════════
  if (view === "result" && result) {
    const pass = result.score >= 50;
    return (
      <div style={pageS}>
        <Toast />
        <Header title="Exam Results" showLogout={true} />
        <div style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <div style={{ fontSize: 80, marginBottom: 10 }}>{pass ? "🎉" : "📚"}</div>
            <h2 style={{ fontSize: 34, fontWeight: 900, color: pass ? C.green : C.red, margin: "0 0 6px" }}>{result.score}%</h2>
            <p style={{ fontSize: 20, color: C.textSec, margin: "0 0 6px" }}>{result.correct} out of {result.total} correct</p>
            <div style={{ background: pass ? C.greenLight : C.redLight, color: pass ? C.green : C.red, padding: "12px 24px", borderRadius: 12, display: "inline-block", fontWeight: 800, fontSize: 18, marginTop: 14 }}>
              {pass ? "PASSED" : "NEEDS IMPROVEMENT"}
            </div>
          </div>

          <div style={{ ...cardS({ marginTop: 28 }) }}>
            <p style={{ fontSize: 16, color: C.textSec, marginBottom: 8 }}>Subject:</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: C.navy, margin: "0 0 16px" }}>{result.subject}</p>
            <p style={{ fontSize: 16, color: C.textSec, marginBottom: 8 }}>Type:</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: C.navy, margin: "0 0 16px" }}>{result.examType.toUpperCase()}</p>
            <p style={{ fontSize: 16, color: C.textSec, marginBottom: 8 }}>Year:</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: C.navy, margin: 0 }}>Year {result.year}{result.track ? ` — ${result.track}` : ""}</p>
          </div>

          <button onClick={() => { setView("subjectSelect"); setResult(null); }} style={{ ...btnP, width: "100%", justifyContent: "center", marginTop: 20, padding: 18, fontSize: 20 }}>
            ← Back to Subjects
          </button>
          {examType !== "practice" && (
            <p style={{ textAlign: "center", marginTop: 16, color: C.textSec, fontSize: 16 }}>
              {serverConnected ? "✓ Result saved to database" : "⚠️ Result not saved (server offline)"}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // ADMIN PANEL
  // ══════════════════════════════════════════════════════
  if (view === "admin") {
    return (
      <div style={pageS}>
        <Toast />
        <LoadingOverlay />
        <Header title="Admin Panel" />
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <button onClick={() => setAdminTab("questions")} style={{ ...btnP, background: adminTab === "questions" ? C.navy : C.accentLight, color: adminTab === "questions" ? "#fff" : C.navy }}>📚 Questions ({bank.length})</button>
            <button onClick={() => setAdminTab("results")} style={{ ...btnP, background: adminTab === "results" ? C.navy : C.accentLight, color: adminTab === "results" ? "#fff" : C.navy }}>📊 Results ({results.length})</button>
            <button onClick={() => setAdminTab("students")} style={{ ...btnP, background: adminTab === "students" ? C.navy : C.accentLight, color: adminTab === "students" ? "#fff" : C.navy }}>👥 Students ({students.length})</button>
            <button onClick={() => setAdminTab("passwords")} style={{ ...btnP, background: adminTab === "passwords" ? C.navy : C.accentLight, color: adminTab === "passwords" ? "#fff" : C.navy }}>🔐 Test Passwords</button>
          </div>

          {/* PASSWORD MANAGEMENT TAB */}
          {adminTab === "passwords" && (
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, color: C.navy }}>Test Password Management</h3>

              <div style={{ ...cardS({ marginBottom: 20, background: C.greenLight, borderColor: C.green }) }}>
                <p style={{ margin: 0, color: C.green, fontSize: 16 }}>
                  ✅ <strong>Fixed Passwords:</strong> Each subject has a permanent unique password that never changes. These passwords are hardcoded and cannot be modified.
                </p>
              </div>

              <div style={{ ...cardS({ marginBottom: 20, background: C.yellowLight, borderColor: C.yellow }) }}>
                <p style={{ margin: 0, color: "#8a7200", fontSize: 16 }}>
                  ℹ️ <strong>Note:</strong> Passwords are only required for <strong>Test (20Q)</strong>. Exam and Practice are freely accessible.
                </p>
              </div>

              {/* Elementary Passwords */}
              <div style={{ ...cardS({ marginBottom: 24 }) }}>
                <h4 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: C.navy }}>
                  🎓 Elementary School (Years 1-6)
                </h4>
                {ELEMENTARY_YEARS.map(year => {
                  const yearSubjects = ELEMENTARY_SUBJECTS[year] || [];
                  return (
                    <div key={year} style={{ marginBottom: 20 }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: C.textSec, marginBottom: 10 }}>Year {year}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                        {yearSubjects.map(subject => {
                          const key = getPasswordKey("elementary", year, subject);
                          return (
                            <div key={key} style={{ background: C.bg, padding: 10, borderRadius: 8, border: `1px solid ${C.border}` }}>
                              <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px", color: C.navy }}>{subject}</p>
                              <p style={{ fontSize: 18, fontWeight: 800, color: C.green, margin: 0, fontFamily: "monospace" }}>
                                {testPasswords[key] || "—"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Junior College Passwords */}
              <div style={{ ...cardS({ marginBottom: 24 }) }}>
                <h4 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: C.navy }}>
                  📘 Junior College (Years 7-9)
                </h4>
                {JUNIOR_COLLEGE_YEARS.map(year => (
                  <div key={year} style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: C.textSec, marginBottom: 10 }}>Year {year}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                      {JUNIOR_SUBJECTS.map(subject => {
                        const key = getPasswordKey("college", year, subject);
                        return (
                          <div key={key} style={{ background: C.bg, padding: 10, borderRadius: 8, border: `1px solid ${C.border}` }}>
                            <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px", color: C.navy }}>{subject}</p>
                            <p style={{ fontSize: 18, fontWeight: 800, color: C.green, margin: 0, fontFamily: "monospace" }}>
                              {testPasswords[key] || "—"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Senior College Passwords */}
              <div style={cardS()}>
                <h4 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: C.navy }}>
                  🎓 Senior College (Years 10-12)
                </h4>
                {SENIOR_COLLEGE_YEARS.map(year => (
                  <div key={year} style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 14 }}>Year {year}</p>
                    {SENIOR_TRACKS.map(track => {
                      const trackSubjects = SENIOR_SUBJECTS[track] || [];
                      return (
                        <div key={track} style={{ marginBottom: 16 }}>
                          <p style={{ fontSize: 16, fontWeight: 700, color: C.textSec, marginBottom: 10 }}>{track} Department</p>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                            {trackSubjects.map(subject => {
                              const key = getPasswordKey("college", year, subject, track);
                              return (
                                <div key={key} style={{ background: C.bg, padding: 10, borderRadius: 8, border: `1px solid ${C.border}` }}>
                                  <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px", color: C.navy }}>{subject}</p>
                                  <p style={{ fontSize: 18, fontWeight: 800, color: C.green, margin: 0, fontFamily: "monospace" }}>
                                    {testPasswords[key] || "—"}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Questions Tab */}
          {adminTab === "questions" && (
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: C.navy }}>Add Question</h3>
              <div style={cardS({ marginBottom: 24 })}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 6 }}>Section</label>
                    <select value={newQ.section} onChange={e => setNewQ({ ...newQ, section: e.target.value, year: 1, track: "" })} style={inputS}>
                      <option value="elementary">Elementary</option>
                      <option value="college">College</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 6 }}>Year</label>
                    <select value={newQ.year} onChange={e => setNewQ({ ...newQ, year: parseInt(e.target.value), track: "" })} style={inputS}>
                      {(newQ.section === "elementary" ? ELEMENTARY_YEARS : [...JUNIOR_COLLEGE_YEARS, ...SENIOR_COLLEGE_YEARS]).map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                </div>
                
                {newQ.section === "college" && newQ.year >= 10 && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 14, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 6 }}>Track</label>
                    <select value={newQ.track} onChange={e => setNewQ({ ...newQ, track: e.target.value })} style={inputS}>
                      <option value="">Select Track</option>
                      {SENIOR_TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 6 }}>Subject</label>
                    <select value={newQ.subject} onChange={e => setNewQ({ ...newQ, subject: e.target.value })} style={inputS}>
                      <option value="">Select Subject</option>
                      {(newQ.section === "elementary" ? (ELEMENTARY_SUBJECTS[newQ.year] || []) : newQ.year >= 10 && newQ.track ? (SENIOR_SUBJECTS[newQ.track] || []) : JUNIOR_SUBJECTS).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 6 }}>Type</label>
                    <select value={newQ.type} onChange={e => setNewQ({ ...newQ, type: e.target.value })} style={inputS}>
                      <option value="test">Test</option>
                      <option value="exam">Exam</option>
                      <option value="practice">Practice</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 6 }}>Question</label>
                  <textarea value={newQ.question} onChange={e => setNewQ({ ...newQ, question: e.target.value })} style={{ ...inputS, minHeight: 100, resize: "vertical" }} placeholder="Enter question..." />
                </div>
                <label style={{ fontSize: 14, fontWeight: 700, color: C.textSec, display: "block", marginBottom: 6 }}>Options (select correct answer)</label>
                {newQ.options.map((o, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <input type="radio" checked={newQ.correctAnswer === i} onChange={() => setNewQ({ ...newQ, correctAnswer: i })} style={{ width: 24, cursor: "pointer" }} />
                    <input value={o} onChange={e => { const opts = [...newQ.options]; opts[i] = e.target.value; setNewQ({ ...newQ, options: opts }); }} style={{ ...inputS, marginBottom: 0 }} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                  </div>
                ))}
                <button onClick={addQ} disabled={loading} style={{ ...btnP, width: "100%", justifyContent: "center", marginTop: 10 }}>+ Add Question</button>
              </div>

              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: C.navy }}>Bulk Upload (JSON)</h3>
              <div style={cardS({ marginBottom: 24 })}>
                <p style={{ color: C.textSec, fontSize: 16, marginBottom: 10 }}>Paste JSON array of questions:</p>
                <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} style={{ ...inputS, minHeight: 200, fontFamily: "monospace", fontSize: 14 }} placeholder='[{"question":"...","options":["A","B","C","D"],"correctAnswer":0,"section":"elementary","year":1,"subject":"Mathematics","type":"test"}]' />
                <button onClick={bulkUpload} disabled={loading} style={{ ...btnP, width: "100%", justifyContent: "center", marginTop: 10 }}>📤 Upload JSON</button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: C.navy }}>Question Bank ({bank.length})</h3>
              </div>
              {bank.length === 0 && <div style={cardS({ textAlign: "center", padding: 40 })}><p style={{ color: C.textSec, fontSize: 18 }}>No questions yet. Add some above!</p></div>}
              {bank.map(q => (
                <div key={q.id} style={{ ...cardS({ marginBottom: 12, padding: "16px 20px" }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: 18, margin: "0 0 8px", color: C.navy }}>{q.question}</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                        {q.options.map((opt, i) => (
                          <span key={i} style={{ background: i === q.correctAnswer ? C.greenLight : C.bg, color: i === q.correctAnswer ? C.green : C.text, padding: "4px 10px", borderRadius: 6, fontSize: 14, fontWeight: i === q.correctAnswer ? 700 : 500 }}>
                            {String.fromCharCode(65 + i)}: {opt}
                          </span>
                        ))}
                      </div>
                      <span style={{ fontSize: 14, color: C.textSec }}>{q.section} • Year {q.year}{q.track ? ` • ${q.track}` : ""} • {q.subject} • {q.type}</span>
                    </div>
                    <button onClick={() => deleteQ(q.id)} style={{ ...btnOut, padding: "8px 14px", fontSize: 14, alignSelf: "flex-start" }}>🗑 Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results Tab */}
          {adminTab === "results" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: C.navy }}>All Results ({results.length})</h3>
                {results.length > 0 && (
                  <button onClick={clearAllResults} style={{ ...btnOut, padding: "10px 18px", fontSize: 16 }}>🗑 Clear All</button>
                )}
              </div>

              {/* Filters */}
              <div style={{ ...cardS({ marginBottom: 24 }) }}>
                <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, color: C.navy }}>Filter Results</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
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

function LoginForm({ isAdmin, section, onLogin, C, inputS, btnP }) {
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

 const submit = () => {
  if (isAdmin) {
    if (pass === "schooladmin@123") onLogin("Administrator", "admin", "admin");
    else setErr("Invalid password");
  } else {
    if (!name.trim() || !pass.trim()) { setErr("Please fill all fields"); return; }
    // Elementary student password
    if (section === "elementary" && pass === "science2024") {
      onLogin(name.trim(), name.trim(), "student");
    }
    // College student password
    else if (section === "college" && pass === "startup2024") {
      onLogin(name.trim(), name.trim(), "student");
    }
    else {
      setErr("Invalid password");
    }
  }
};
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {!isAdmin && (<>
         <div>
    <input style={inputS} placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
    <input style={inputS} type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} />
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

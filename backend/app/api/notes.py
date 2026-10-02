from fastapi import APIRouter, HTTPException, Request
from datetime import date, datetime
import itertools

router = APIRouter(prefix="/notes", tags=["AI Notes"])

# -------------------------
# RATE LIMIT (SIMPLE)
# -------------------------
DAILY_LIMIT = 20
request_tracker = {}

def check_rate_limit(request: Request):
    ip = request.client.host
    today = str(date.today())

    if ip not in request_tracker:
        request_tracker[ip] = {}
    if today not in request_tracker[ip]:
        request_tracker[ip][today] = 0
    if request_tracker[ip][today] >= DAILY_LIMIT:
        raise HTTPException(status_code=429, detail="Daily limit reached")

    request_tracker[ip][today] += 1
    return DAILY_LIMIT - request_tracker[ip][today]

# -------------------------
# IN-MEMORY "DATABASE"
# Resets on server restart — swap for SQLite/Postgres for real use.
# -------------------------
notes_db = []
_id_counter = itertools.count(1)

def build_notes_content(topic: str, level: str, style: str) -> str:
    """Placeholder generator — replace with a real AI/LLM call for real content."""
    return f"""📘 {topic.upper()} — {level.title()} Notes ({style})

1. Definition
   {topic} refers to the core idea/subject being studied.

2. Key Concepts
   - Core principle #1 of {topic}
   - Core principle #2 of {topic}
   - Common terminology used in {topic}

3. Examples
   - A real-world example of {topic} in practice
   - A second example showing a different use case

4. Why It Matters
   {topic} is relevant because of its practical applications.

5. Quick Recap
   - Remember the definition
   - Remember at least one example
   - Be able to explain {topic} in your own words
"""

# -------------------------
# 🧠 AI NOTES
# -------------------------
@router.post("/generate")
def generate_notes(request: Request, topic: str, level: str = "intermediate", style: str = "structured"):
    if not topic:
        raise HTTPException(status_code=400, detail="Topic required")
    check_rate_limit(request)

    content = build_notes_content(topic, level, style)
    record = {
        "id": next(_id_counter),
        "topic": topic,
        "level": level,
        "style": style,
        "content": content,
        "created_at": datetime.utcnow().isoformat(),
    }
    notes_db.append(record)
    return {"topic": topic, "notes": content, "cached": False}

# -------------------------
# 📚 HISTORY
# -------------------------
@router.get("/history")
def get_history():
    return sorted(notes_db, key=lambda n: n["id"], reverse=True)

@router.get("/history/{note_id}")
def get_history_item(note_id: int):
    for n in notes_db:
        if n["id"] == note_id:
            return n
    raise HTTPException(status_code=404, detail="Note not found")

# -------------------------
# 📅 STUDY PLANNER — every day gets a genuinely unique task, no repeats
# even when the day count is large. Returns structured rows so the
# frontend can render a real HTML table (always aligns correctly,
# unlike a hand-padded text table).
# -------------------------
def build_study_plan_rows(topic: str, days: int):
    # A curated pool of distinct stages, each with one unique task.
    # Ordered roughly beginner -> mastery.
    task_pool = [
        ("Introduction", f"Read a broad overview of {topic} — what it is and why it matters"),
        ("Introduction", f"Note down key terminology and vocabulary used in {topic}"),
        ("Introduction", f"Watch or read one beginner-friendly explanation of {topic}"),
        ("Core Concepts", f"Study the main components/structure of {topic}"),
        ("Core Concepts", f"Work through 2-3 fully solved examples of {topic}"),
        ("Core Concepts", f"Summarize the core concepts of {topic} in your own words"),
        ("Core Concepts", f"Create a diagram or mind map connecting the parts of {topic}"),
        ("Deeper Understanding", f"Compare {topic} with a closely related concept — note similarities/differences"),
        ("Deeper Understanding", f"Research one real-world case study involving {topic}"),
        ("Deeper Understanding", f"Read about common misconceptions or mistakes related to {topic}"),
        ("Practice", f"Solve a set of practice problems / exercises on {topic}"),
        ("Practice", f"Apply {topic} to a small real-world example or mini project"),
        ("Practice", f"Attempt past exam or interview-style questions on {topic}"),
        ("Practice", f"Identify your weakest area in {topic} and drill it specifically"),
        ("Application", f"Explain {topic} out loud as if teaching a beginner"),
        ("Application", f"Write a short summary sheet (1 page) covering all of {topic}"),
        ("Application", f"Try teaching {topic} to a friend or record yourself explaining it"),
        ("Revision", f"Revise all your notes on {topic} from the earlier days"),
        ("Revision", f"Take a self-test or quiz covering all of {topic}"),
        ("Revision", f"Do a final recap — list the 5 most important facts about {topic}"),
    ]

    rows = []
    for i in range(days):
        if i < len(task_pool):
            phase, task = task_pool[i]
        else:
            extra_num = i - len(task_pool) + 1
            phase = "Extended Practice"
            task = f"Deep-dive session #{extra_num}: explore an unexplored angle or sub-topic of {topic} you haven't covered yet"
        rows.append({"day": i + 1, "phase": phase, "task": task})
    return rows


@router.post("/study-planner")
def study_planner(topic: str, days: int = 7):
    if not topic:
        raise HTTPException(status_code=400, detail="Topic required")
    rows = build_study_plan_rows(topic, days)
    return {"topic": topic, "days": days, "plan_rows": rows}


@router.post("/study-planner")
def study_planner(topic: str, days: int = 7):
    if not topic:
        raise HTTPException(status_code=400, detail="Topic required")
    plan = build_study_plan(topic, days)
    return {"topic": topic, "days": days, "plan": plan}

# -------------------------
# 🤖 AI DOUBT SOLVER
# -------------------------
@router.post("/doubt-solver")
def ai_doubt_solver(topic: str, question: str):
    if not topic or not question:
        raise HTTPException(status_code=400, detail="Topic and question required")

    answer = f"""AI DOUBT SOLVER

Topic: {topic}
Question: {question}

Answer:
{topic} is an important concept related to your question.

1. Understand the basics of {topic}
2. Break the question into smaller parts
3. Apply step-by-step logic
4. Practice similar problems to reinforce understanding
"""
    return {"topic": topic, "question": question, "answer": answer}

# -------------------------
# 📖 FLASHCARDS
# -------------------------
@router.post("/flashcards")
def flashcards(topic: str):
    if not topic:
        raise HTTPException(status_code=400, detail="Topic required")
    return {
        "topic": topic,
        "flashcards": [
            {"question": f"What is {topic}?", "answer": f"{topic} is a core concept — define it clearly here."},
            {"question": f"Explain the key features of {topic}.", "answer": f"Key features of {topic} include its main properties and behavior."},
            {"question": f"Give a real-world application of {topic}.", "answer": f"{topic} is applied in practical scenarios such as industry use cases."},
        ]
    }

# -------------------------
# ❓ MCQ QUIZ
# -------------------------
@router.post("/mcq")
def mcq(topic: str, difficulty: str = "medium", count: int = 5):
    if not topic:
        raise HTTPException(status_code=400, detail="Topic required")
    questions = [{
        "question": f"({difficulty}) Question {i + 1} about {topic}?",
        "options": [
            f"Correct fact about {topic}",
            "Unrelated distractor A",
            "Unrelated distractor B",
            "Unrelated distractor C",
        ],
        "correct": 0,
        "explanation": f"This tests understanding of {topic} at a {difficulty} level.",
    } for i in range(int(count))]
    return {"topic": topic, "questions": questions}

# -------------------------
# ⚡ ONE DAY BEFORE EXAM
# -------------------------
@router.post("/exam")
def exam_notes(topic: str, type: str = "quick"):
    if not topic:
        raise HTTPException(status_code=400, detail="Topic required")
    notes = f"""⚡ LAST MINUTE REVISION: {topic.upper()} ({type})

🎯 MUST KNOW POINTS:
- Core definition of {topic}
- Main components / structure
- Key terminology

📌 KEY DEFINITIONS:
- {topic}: concise definition here

⚠️ COMMON MISTAKES:
- Don't confuse {topic} with related concepts

✅ You're ready. Good luck!
"""
    return {"topic": topic, "type": type, "notes": notes}

# -------------------------
# 📊 EXAM PREPARATION (fixed: now uses type + level, full content)
# -------------------------
@router.post("/exam-preparation")
def exam_preparation(topic: str, type: str = "full", level: str = "intermediate"):
    if not topic:
        raise HTTPException(status_code=400, detail="Topic required")

    notes = f"""🎓 AI EXAM PREPARATION: {topic.upper()}
Level: {level.upper()} | Type: {type.upper()}
{"=" * 60}

📚 SYLLABUS COVERAGE:
Unit 1: Introduction to {topic}
  - Definition and Overview
  - History and Evolution
  - Types and Classification

Unit 2: Core Concepts of {topic}
  - Key Components
  - Architecture and Design
  - Working Principles

Unit 3: Advanced Topics in {topic}
  - Advanced Features
  - Optimization Techniques
  - Real-world Applications

{"=" * 60}

❓ IMPORTANT QUESTIONS:

2 Mark Questions:
1. Define {topic} and its importance.
2. List the types of {topic}.
3. What are the advantages of {topic}?

5 Mark Questions:
1. Explain the architecture of {topic} with a diagram.
2. Describe the working principles of {topic}.

10 Mark Questions:
1. Explain {topic} in detail with examples and diagrams.
2. Discuss the advantages and disadvantages of {topic}.

{"=" * 60}

💡 EXAM TIPS:
✓ Read all definitions clearly
✓ Practice diagrams 3-4 times
✓ Manage time — 1 mark = 1 minute

✅ ALL THE BEST FOR YOUR EXAM! 🌟
"""
    return {"topic": topic, "type": type, "level": level, "notes": notes}

# -------------------------
# 🗺️ CONCEPT MAP (was missing — mindmap.js was 404'ing into demo data)
# -------------------------
@router.post("/mindmap")
def mindmap(topic: str):
    if not topic:
        raise HTTPException(status_code=400, detail="Topic required")

    concept_map = f"""
🗺️ CONCEPT MAP : {topic.upper()}

{topic}
│
├── Definition
│   ├── Meaning
│   └── Overview
│
├── Types
│   ├── Type 1
│   ├── Type 2
│   └── Type 3
│
├── Features
│   ├── Feature 1
│   ├── Feature 2
│   └── Feature 3
│
├── Advantages
│   ├── Easy to Learn
│   ├── High Performance
│   └── Real World Usage
│
└── Applications
    ├── Education
    ├── Industry
    └── Research
"""
    return {"topic": topic, "map": concept_map}
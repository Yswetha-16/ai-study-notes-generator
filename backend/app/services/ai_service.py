import json

def generate_mcq(topic: str):
    prompt = f"""
Generate exactly 5 multiple-choice questions about {topic}.

Return ONLY valid JSON.

Format:

[
  {{
    "question": "Question text",
    "options": [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    "correct": 0,
    "explanation": "Short explanation"
  }}
]

Rules:
- Exactly 5 questions.
- Exactly 4 options per question.
- "correct" must be the index (0,1,2,3).
- Return ONLY JSON.
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    text = response.text.strip()

    if text.startswith("```json"):
        text = text.replace("```json", "").replace("```", "").strip()
    elif text.startswith("```"):
        text = text.replace("```", "").strip()

    try:
        questions = json.loads(text)
    except Exception:
        questions = [
            {
                "question": f"What is {topic}?",
                "options": [
                    f"{topic} is a concept",
                    "Programming Language",
                    "Operating System",
                    "Database"
                ],
                "correct": 0,
                "explanation": f"{topic} is an important concept."
            }
        ]

    return questions
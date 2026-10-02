import json

def generate_mcq(topic: str, difficulty: str = "medium", count: int = 5) -> list:
    """Generate MCQ questions - uses Gemini if available, else demo questions"""
    
    # Demo MCQ for now (switch to Gemini when quota resets)
    demo_mcq = [
        {
            "question": f"What is the primary purpose of {topic}?",
            "options": [
                f"To manage and organize {topic} efficiently",
                f"To create random data structures",
                f"To delete all existing data",
                f"None of the above"
            ],
            "correct": 0,
            "explanation": f"{topic} is primarily used to manage and organize data efficiently."
        },
        {
            "question": f"Which of the following is a key feature of {topic}?",
            "options": [
                "Random access only",
                "Sequential access only", 
                f"Structured organization of {topic} data",
                "No data storage"
            ],
            "correct": 2,
            "explanation": f"A key feature of {topic} is its structured organization of data."
        },
        {
            "question": f"What is the time complexity of basic operations in {topic}?",
            "options": [
                "O(n²)",
                "O(1) or O(log n) for optimized operations",
                "O(n!)",
                "O(2^n)"
            ],
            "correct": 1,
            "explanation": f"Basic operations in {topic} typically run in O(1) or O(log n) time."
        },
        {
            "question": f"Which real-world application uses {topic}?",
            "options": [
                "Social media platforms",
                "Banking systems",
                "E-commerce websites",
                "All of the above"
            ],
            "correct": 3,
            "explanation": f"{topic} is widely used across social media, banking, and e-commerce."
        },
        {
            "question": f"What is a disadvantage of {topic}?",
            "options": [
                "It is too simple",
                "It requires proper implementation and maintenance",
                "It cannot store data",
                "It only works offline"
            ],
            "correct": 1,
            "explanation": f"Like any system, {topic} requires proper implementation and maintenance."
        }
    ]
    
    return demo_mcq[:count]
@router.post("/generate")
def generate(request: Request, topic: str, level: str = "intermediate", style: str = "structured", db: Session = Depends(get_db)):

    try:
        content = generate_notes(topic, level, style)

        return {"notes": content}

    except Exception as e:
        print("ERROR generate:", e)
        return {"detail": str(e)}
        @router.post("/flashcards")
def flashcards(topic: str):

    try:
        cards = generate_flashcards(topic)
        return {"flashcards": cards}

    except Exception as e:
        print("ERROR flashcards:", e)
        return {"detail": str(e)}
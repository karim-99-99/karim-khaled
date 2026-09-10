"""Flatten mixed font sizes in stored question HTML (Quill sizes, headings, inline CSS)."""

from lxml import html as lhtml

SIZE_CLASSES = {"ql-size-small", "ql-size-large", "ql-size-huge"}
KATEX_SIZE_CLASSES = {"size-sm", "size-md", "size-lg", "size-xl", "size-2xl"}
HEADINGS = {"h1", "h2", "h3", "h4", "h5", "h6", "big", "small", "font"}
SKIP_TAGS = {"svg", "img", "br", "hr", "path"}
STYLE_DROP = {"font-size", "line-height", "font"}


def _class_list(el):
    return [c for c in (el.get("class") or "").split() if c]


def _set_classes(el, classes):
    if classes:
        el.set("class", " ".join(classes))
    elif "class" in el.attrib:
        del el.attrib["class"]


def _strip_size_style(el):
    style = el.get("style")
    if not style:
        return
    kept = []
    for piece in style.split(";"):
        piece = piece.strip()
        if not piece or ":" not in piece:
            continue
        key = piece.split(":", 1)[0].strip().lower()
        if key in STYLE_DROP:
            continue
        kept.append(piece)
    if kept:
        el.set("style", "; ".join(kept))
    elif "style" in el.attrib:
        del el.attrib["style"]


def normalize_question_typography(raw):
    """Return HTML with a single body text size. Leaves KaTeX internals and images alone."""
    if not raw or not isinstance(raw, str):
        return raw
    if "<" not in raw:
        return raw
    try:
        wrapper = lhtml.fragment_fromstring(raw, create_parent="div")
    except Exception:
        return raw

    for el in list(wrapper.iter()):
        if el is wrapper:
            continue
        if not isinstance(el.tag, str):
            continue
        tag = el.tag.lower()
        if tag in SKIP_TAGS:
            continue

        classes = _class_list(el)
        is_katex_internal = any(
            c == "katex" or c.startswith("katex-") for c in classes
        ) and "math-equation" not in classes

        if is_katex_internal:
            _set_classes(el, [c for c in classes if c not in KATEX_SIZE_CLASSES])
            continue

        if tag in HEADINGS:
            el.tag = "span"
            if "size" in el.attrib:
                del el.attrib["size"]
            if "face" in el.attrib:
                del el.attrib["face"]

        classes = _class_list(el)
        _set_classes(
            el,
            [c for c in classes if c not in SIZE_CLASSES and c not in KATEX_SIZE_CLASSES],
        )
        _strip_size_style(el)

    body = wrapper.text or ""
    for child in wrapper:
        body += lhtml.tostring(child, encoding="unicode", with_tail=True)
    return body


def normalize_passage_questions(items):
    if not isinstance(items, list):
        return items
    out = []
    for item in items:
        if not isinstance(item, dict):
            out.append(item)
            continue
        row = dict(item)
        if isinstance(row.get("question"), str):
            row["question"] = normalize_question_typography(row["question"])
        answers = row.get("answers")
        if isinstance(answers, list):
            next_answers = []
            for ans in answers:
                if isinstance(ans, dict) and isinstance(ans.get("text"), str):
                    next_answers.append({**ans, "text": normalize_question_typography(ans["text"])})
                else:
                    next_answers.append(ans)
            row["answers"] = next_answers
        out.append(row)
    return out


def normalize_all_stored_questions(apply=True):
    """Rewrite stored question/answer HTML so mixed sizes are flattened."""
    from .models import Answer, Question

    questions_updated = 0
    answers_updated = 0
    html_fields = ("question", "question_en", "explanation", "passage_text")

    for question in Question.objects.all().iterator(chunk_size=100):
        fields = []
        for name in html_fields:
            current = getattr(question, name, None)
            if not isinstance(current, str) or not current:
                continue
            normalized = normalize_question_typography(current)
            if normalized != current:
                setattr(question, name, normalized)
                fields.append(name)
        if question.passage_questions:
            normalized_pq = normalize_passage_questions(question.passage_questions)
            if normalized_pq != question.passage_questions:
                question.passage_questions = normalized_pq
                fields.append("passage_questions")
        if fields:
            if apply:
                question.save(update_fields=fields)
            questions_updated += 1

    for answer in Answer.objects.all().iterator(chunk_size=200):
        if not isinstance(answer.text, str) or not answer.text:
            continue
        normalized = normalize_question_typography(answer.text)
        if normalized != answer.text:
            if apply:
                answer.text = normalized
                answer.save(update_fields=["text"])
            answers_updated += 1

    return {
        "questions_updated": questions_updated,
        "answers_updated": answers_updated,
        "applied": bool(apply),
    }

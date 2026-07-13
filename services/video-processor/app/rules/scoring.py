HOOK_WORDS = [
    "como", "por que", "porque", "segredo", "importante", "nunca",
    "sempre", "todo mundo", "você sabia", "-descubra", "método",
    "resultado", "transformação", "antes e depois", "dica",
]

KEYWORD_WORDS = [
    "dinheiro", "renda", "negócio", "sucesso", "estratégia",
    "vendas", "marketing", "clientes", "crescimento", "meta",
    "saúde", "treino", "dieta", "emagrecer", "musculação",
    "relacionamento", "comunicação", "liderança", "produtividade",
]


def score_clip(segments: list) -> float:
    if not segments:
        return 0

    full_text = " ".join(s["text"] for s in segments).lower()
    total_duration = segments[-1]["end"] - segments[0]["start"]

    hook_score = 0
    first_text = segments[0]["text"].lower()
    for hw in HOOK_WORDS:
        if hw in first_text:
            hook_score += 2
            break

    speech_duration = sum(s["end"] - s["start"] for s in segments)
    speech_density = speech_duration / total_duration if total_duration > 0 else 0

    keyword_count = sum(1 for kw in KEYWORD_WORDS if kw in full_text)
    keyword_score = min(keyword_count * 0.5, 3)

    complete_start = not segments[0]["text"].strip().endswith(("...", "…", "-"))
    complete_end = not segments[-1]["text"].strip().endswith(("...", "…", "-"))
    completeness = (1 if complete_start else 0) + (1 if complete_end else 0)

    total_text_len = len(full_text.split())
    words_per_second = total_text_len / total_duration if total_duration > 0 else 0
    intensity = min(words_per_second, 3)

    score = (
        hook_score
        + speech_density * 3
        + keyword_score
        + completeness
        + intensity
    )

    return round(score, 2)

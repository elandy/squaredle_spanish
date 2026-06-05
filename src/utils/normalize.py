import unicodedata


def normalize(word):
    word = word.upper()

    out = []

    for c in word:
        if c in ("Ñ",):
            out.append("Ñ")
            continue

        decomposed = unicodedata.normalize("NFKD", c)

        for d in decomposed:
            if unicodedata.category(d) == "Mn":
                continue
            out.append(d)

    return "".join(out)

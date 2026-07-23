import os
from functools import cache

import httpx


@cache
def get_definition(word: str) -> dict:
    word = word.upper()

    url = f"https://rae-api.com/api/words/{word}"

    headers = {
        "accept": "application/json"
    }

    api_key = os.getenv("RAE_API_KEY")
    if api_key:
        headers["X-API-KEY"] = api_key

    try:
        with httpx.Client(headers=headers, timeout=5.0) as client:
            r = client.get(url)

        if r.status_code != 200:
            return {
                "word": word,
                "definitions": ["La definición no fue encontrada."]
            }

        data = r.json()

        definitions = []

        for meaning in data.get("data", {}).get("meanings", []):
            for sense in meaning.get("senses", []):
                desc = sense.get("description")

                if not desc:
                    continue

                if len(desc.split()) == 1 and any(c.isdigit() for c in desc):
                    continue

                definitions.append(desc)

        if not definitions:
            definitions = ["La definición no fue encontrada."]
        else:
            definitions = [
                f"{i}. {definition}"
                for i, definition in enumerate(definitions, start=1)
            ]

        return {
            "word": word,
            "definitions": definitions
        }

    except Exception:
        return {
            "word": word,
            "definitions": ["La definición no fue encontrada."]
        }
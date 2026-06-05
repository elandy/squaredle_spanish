from wordfreq import zipf_frequency

INPUT_FILE = "Spanish_full.txt"
OUTPUT_FILE = "Spanish_cleaned.txt"

MIN_LENGTH = 4
MIN_ZIPF = 2.54

words = set()

kept = 0
removed_length = 0
removed_zipf = 0

with open(INPUT_FILE, encoding="utf-16") as f:

    for line in f:

        word = line.strip()

        if not word:
            continue

        if len(word) < MIN_LENGTH:
            removed_length += 1
            continue

        es_freq = zipf_frequency(word.lower(), "es")
        en_freq = zipf_frequency(word.lower(), "en")
        if es_freq < MIN_ZIPF:
            removed_zipf += 1
            continue

        if en_freq > es_freq:
            if en_freq > 5 and es_freq < 3.67:
                removed_zipf += 1
                continue
            if es_freq < 3.51:
                removed_zipf += 1
                continue

        words.add(word.upper())

with open(OUTPUT_FILE, "w", encoding="utf-16") as f:

    for word in sorted(words):
        f.write(word + "\n")

print()
print(f"Kept: {len(words):,}")
print(f"Removed (<{MIN_LENGTH} chars): {removed_length:,}")
print(f"Removed (Zipf < {MIN_ZIPF}): {removed_zipf:,}")
print(f"Saved: {OUTPUT_FILE}")
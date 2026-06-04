from wordfreq import zipf_frequency

from generate_puzzle import normalize

words = ["abdominal", "simple", "again", "album", "puño"]
for word in words:
    print(word, zipf_frequency(word, "es"), zipf_frequency(word, "en"))


from wordfreq import zipf_frequency

with open("Spanish.txt", encoding="utf-16") as f:
    words = [line.strip() for line in f]

more_english = []
for word in sorted(words):
    en_freq = zipf_frequency(word.lower(), "en")
    es_freq = zipf_frequency(word.lower(), "es")
    if en_freq > es_freq:
        if en_freq > 5 and es_freq < 3.67:
            more_english.append(word)
        if es_freq < 3.51:
            more_english.append(word)
print(len(more_english))
print(more_english)


print("TEST Ñ SUPPORT")

tests = ["PUÑO", "AÑO", "NIÑO", "BAÑO"]

for t in tests:
    n = normalize(t)
    print(t, "→", n)
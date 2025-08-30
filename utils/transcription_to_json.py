import json

# traditional->tungdzih mapping
transcription_dict = {}


with open("data/transcription.txt", "r", encoding="utf-8") as file:
    for line in file:
        tung, trad = line.strip().split("\t")
        tung, trad = tung.strip(), trad.strip()

        if trad in transcription_dict:
            transcription_dict[trad].append(tung)
        else:
            transcription_dict[trad] = [tung]

del transcription_dict['*']
print(transcription_dict)

with open("data/transcription.json", "w", encoding="utf-8") as json_file:
    json.dump(transcription_dict, json_file, ensure_ascii=False, indent=2)

print("Traditional->Tungdzih mapping saved to data/transcription.json")
let transcriptionTable = {};

async function loadTables() {
    try {
        const response = await fetch("data/transcription.json");
        transcriptionTable = await response.json();
    } catch (error) {
        console.error("Error loading transcription data:", error);
    }
}



function convertSimplifiedToTraditional(input) {
    const converter = OpenCC.Converter({ from: 'cn', to: 't' }); // convert Simplified to Traditional
    return converter(input);
}

function convertKanjiToTraditional(input) {
    const converter = OpenCC.Converter({ from: 'jp', to: 't' }); // convert Kanji to Traditional
    return converter(input);
}


async function translate_to_tungdzih() {
    if (Object.keys(transcriptionTable).length === 0) {
        await loadTables();
    }

    let input = document.getElementById("inputText").value;
    
    // check if the toggle for Simplified input is checked
    const useSimplified = document.getElementById("toggleSimplified").checked;

    if (useSimplified) {
        input = convertSimplifiedToTraditional(input);
    }

    let output = "";

    // translate using the transcription table
    for (let char of input) {
        translation = transcriptionTable[char] ? transcriptionTable[char].join(", ") : char;
        translation += " ";
        output += translation;
    }

    document.getElementById("outputText").value = output.trim();
}

function saveTranslation() {
    const inputText = document.getElementById("inputText").value;
    const outputText = document.getElementById("outputText").value;

    if (inputText && outputText) {
        const savedTranslationsList = document.getElementById("savedTranslations");
        const listItem = document.createElement("li");
        listItem.textContent = `Input: ${inputText} => Output: ${outputText}`;
        savedTranslationsList.appendChild(listItem);
    }
}
// make sure loadTables is run
document.addEventListener("DOMContentLoaded", loadTables);

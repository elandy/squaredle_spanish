import { spawnWordAnimation } from "../ui/animation.js";
import { submitWord } from "../services/api";
import {playBuffer, correctBuffer, wrongBuffer, foundBuffer} from "../audio/audio.js";
import { renderFoundWords } from "../ui/foundWords.js";
import { updateProgress } from "../ui/progressUI.js";
import { state } from "./state";
import { updateCurrentWord } from "./selection";
import {showVictoryModal} from "../ui/victory.ts";

async function sha256(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function calculateWordScore(word: string) {
    return Math.max(1, word.length - 3);
}

export async function submitCurrentWord() {
    if (!state.puzzle || !state.sessionId) {
        throw new Error("Game is not initialized");
    }
    if (!state.currentWord) return;

    const submittedWord = state.currentWord;
    const wordWithSalt = submittedWord + state.puzzle.id;
    const wordHash = await sha256(wordWithSalt);
    const isValid = wordHash in state.puzzle.words;
    const isBonus = state.puzzle.words[wordHash];

    if (!isValid) {
        playBuffer(wrongBuffer);
        spawnWordAnimation(submittedWord, "wrong");
        state.currentWord = "";
        updateCurrentWord();
        return;
    }

    if (
        state.normalizedFoundWords.has(submittedWord) ||
        state.normalizedBonusWords.has(submittedWord)
    ) {
        playBuffer(foundBuffer);
        spawnWordAnimation(submittedWord, "found");
        state.currentWord = "";
        updateCurrentWord();
        return;
    }

    if (isBonus) {
        state.normalizedBonusWords.add(submittedWord);
        state.foundBonusWords.add(submittedWord);
    } else {
        state.normalizedFoundWords.add(submittedWord);
        state.foundWords.add(submittedWord);
        state.score += calculateWordScore(submittedWord);
    }

    renderFoundWords();
    updateProgress();
    spawnWordAnimation(submittedWord, "correct");
    playBuffer(correctBuffer);
    if (
        !isBonus &&
        state.normalizedFoundWords.size === state.puzzle.word_count
    ) {
        showVictoryModal();
    }

    submitWord(state.sessionId, state.puzzle.id, submittedWord)
        .then(result => {
            if (!result.success) {
                return;
            }
            if (isBonus) {
                state.foundBonusWords.delete(submittedWord);
                state.foundBonusWords.add(result.display);
            } else {
                state.foundWords.delete(submittedWord);
                state.foundWords.add(result.display);
            }
            renderFoundWords();
        })
        .catch(error => {
            console.error("submit failed", error);
        });

    state.currentWord = "";
    updateCurrentWord();
}

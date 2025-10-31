const startButton = document.getElementById("start-button");
const compareButton = document.getElementById("compare-button");
const textToCompare = document.getElementById("result");
const feedbackText = document.getElementById("image-description-feedback");
const typingInput = document.getElementById("typing-input");
const switchToTyping = document.getElementById("switch-to-typing");
const typingContainer = document.getElementById("typing-container");
const result = document.getElementById("result");
const modeIcon = document.getElementById("mode-icon");
const canvas = document.getElementById("waveform");
const canvasCtx = canvas.getContext("2d");

// Frequency resolution and canvas styling
const frequencyResolution = 256;
const canvasFillStyle = "rgb(255, 255, 255)";
const canvasStrokeStyle = "rgb(0, 0, 0)";
const canvasLineWidth = 1.5;

let currentMode = "speech"; // Default mode
let recognition;
let audioStream = null;
let animationFrameId = null;
let audioContext = null;


// Preset sentences to compare against
const bestTexts = [
  "sunshine on yellow flowers",
  "three yellow flowers in the sun",
  "rays of sunshine on yellow flowers",
  "sun shining on three yellow flowers",
  "yellow daisies in the sunshine",
  "perrenial flowers in the sun",
  "sun shining on several yellow daisies"
];

// Feedback based on similarity levels
const feedbackLevels = [
  "Excellent! That's a fantastic description of the image.",
  "That's good. You're on the right track. Well done. Would you like to try again?",
  "OK that's a start. But you may want to try and be a bit more descriptive. The more specific you are, the better.",
  "Your description definitely needs work - but don't give up! Try it again."
];

// Calculate similarity between two strings
function calculateSimilarity(str1, str2) {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const commonWords = [...set1].filter((word) => set2.has(word));
  const totalUniqueWords = new Set([...set1, ...set2]).size;
  return commonWords.length / totalUniqueWords;
}

function showStartButton() {
  startButton.style.display = "block";
  compareButton.style.display = "none";
}

function showCompareButton() {
  compareButton.style.display = "block";
  startButton.style.display = "none";
}

// Start speech recognition
function startRecognition() {
  if (currentMode !== "speech") return;

  textToCompare.textContent = "";
  feedbackText.textContent = "";

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  showCompareButton(); // Show Compare button as speech begins

  recognition.onstart = () => {
    startAudioVisualizer().catch(console.error);
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    textToCompare.textContent = transcript;
    compareButton.disabled = false;
  };

  recognition.onerror = (event) => {
    console.error("Recognition error:", event.error);
    showStartButton(); // Reset on error
  };

  recognition.onend = () => {
    // If nothing is captured, revert
    if (!textToCompare.textContent.trim()) {
      showStartButton();
    }
  };

  recognition.start();
}

// Get user text from typing or speech
function getUserText() {
  return currentMode === "typing" ? typingInput.value.trim() : textToCompare.textContent.trim();
}

// Enable Compare button when typing
typingInput.addEventListener("input", () => {
  compareButton.disabled = typingInput.value.trim() === "";
});


// Compare button click handler
compareButton.addEventListener("click", () => {

  const userText = getUserText();
  if (!userText) return;

	if (currentMode === "speech") {
    stopAudioVisualizer();
     showStartButton(); // Revert to Start button after compare
  }

  let highestSimilarity = 0;
  let bestMatch = "";

  bestTexts.forEach((bestText) => {
    const similarity = calculateSimilarity(userText, bestText);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = bestText;
    }
  });

  let similarityLevel = "";
  if (highestSimilarity > 0.8) {
    similarityLevel = feedbackLevels[0];
  } else if (highestSimilarity > 0.5) {
    similarityLevel = feedbackLevels[1];
  } else if (highestSimilarity > 0.3) {
    similarityLevel = feedbackLevels[2];
  } else {
    similarityLevel = feedbackLevels[3];
  }

  feedbackText.innerHTML = `<br><p>${similarityLevel}</p>`;
;
  compareButton.disabled = true;
});

// Switch between speech and typing modes
switchToTyping.addEventListener("click", () => {
  if (currentMode === "speech") {
    currentMode = "typing";

    typingContainer.style.display = "flex";
    result.style.display = "none";

    startButton.style.display = "none";
    compareButton.style.display = "block";
    compareButton.disabled = typingInput.value.trim() === "";
    textToCompare.textContent = "";
    feedbackText.textContent = "";

    canvas.style.display = "none";

    switchToTyping.textContent = "I prefer to speak";
    modeIcon.textContent = "⌨";

  } else {
    currentMode = "speech";

    typingContainer.style.display = "none";
    result.style.display = "flex";

    startButton.style.display = "block";
    compareButton.style.display = "none";
    compareButton.disabled = true;
    textToCompare.textContent = "";
    feedbackText.textContent = "";

    canvas.style.display = "block";

    switchToTyping.textContent = "I prefer to type";
    modeIcon.textContent = "🎙";
  }
});

// Start audio waveform visualizer
async function startAudioVisualizer() {
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = frequencyResolution;
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  source.connect(analyser);

  function draw() {
    animationFrameId = requestAnimationFrame(draw); // Track the frame ID

    analyser.getByteTimeDomainData(dataArray);
    canvasCtx.fillStyle = canvasFillStyle;
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    canvasCtx.lineWidth = canvasLineWidth;
    canvasCtx.strokeStyle = canvasStrokeStyle;
    canvasCtx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }

  draw();
}

function stopAudioVisualizer() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Clear canvas
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

  // Stop audio context if active
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
    audioContext = null;
  }

  // Stop microphone stream
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
}
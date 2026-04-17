const STORAGE_KEY = "quiz-web-progress-v1";

const state = {
  quizzes: [],
  currentIndex: 0,
  answers: []
};

const screenEls = {
  intro: document.getElementById("intro-screen"),
  quiz: document.getElementById("quiz-screen"),
  result: document.getElementById("result-screen")
};

const totalCountEl = document.getElementById("total-count");
const resumeStateEl = document.getElementById("resume-state");
const progressTextEl = document.getElementById("progress-text");
const progressFillEl = document.getElementById("progress-fill");
const questionTextEl = document.getElementById("question-text");
const optionsContainerEl = document.getElementById("options-container");
const nextBtnEl = document.getElementById("next-btn");
const accuracyValueEl = document.getElementById("accuracy-value");
const startBtnEl = document.getElementById("start-btn");
const restartBtnEl = document.getElementById("restart-btn");
const resetBtnEl = document.getElementById("reset-btn");

function showScreen(name) {
  Object.entries(screenEls).forEach(([key, element]) => {
    element.classList.toggle("active", key === name);
  });
}

function saveProgress() {
  const payload = {
    currentIndex: state.currentIndex,
    answers: state.answers
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function clearProgress() {
  localStorage.removeItem(STORAGE_KEY);
}

function loadProgress() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    clearProgress();
    return null;
  }
}

function updateIntro() {
  totalCountEl.textContent = String(state.quizzes.length);
  const saved = loadProgress();
  const hasResume = saved && Array.isArray(saved.answers) && saved.answers.length > 0;

  resumeStateEl.textContent = hasResume ? "이어서 풀기 가능" : "새로 시작";
  startBtnEl.textContent = hasResume ? "이어 풀기" : "시작하기";
}

function renderQuestion() {
  const quiz = state.quizzes[state.currentIndex];
  const selected = state.answers[state.currentIndex] ?? null;
  const progress = ((state.currentIndex + 1) / state.quizzes.length) * 100;

  progressTextEl.textContent = `${state.currentIndex + 1} / ${state.quizzes.length}`;
  progressFillEl.style.width = `${progress}%`;
  questionTextEl.textContent = quiz.question;
  optionsContainerEl.innerHTML = "";

  Object.entries(quiz.options).forEach(([key, value]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-btn";
    button.innerHTML = `<strong>${key.toUpperCase()}.</strong> ${value}`;

    if (selected === key) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      state.answers[state.currentIndex] = key;
      saveProgress();
      renderQuestion();
    });

    optionsContainerEl.appendChild(button);
  });

  nextBtnEl.disabled = selected === null;
  nextBtnEl.textContent = state.currentIndex === state.quizzes.length - 1 ? "결과 보기" : "다음";
}

function calculateAccuracy() {
  let correct = 0;

  state.quizzes.forEach((quiz, index) => {
    if (state.answers[index] === quiz.answer) {
      correct += 1;
    }
  });

  return (correct / state.quizzes.length) * 100;
}

function renderResult() {
  const accuracy = calculateAccuracy();
  accuracyValueEl.textContent = `${accuracy.toFixed(1)}%`;
  clearProgress();
  showScreen("result");
}

function startQuiz() {
  const saved = loadProgress();

  if (saved && Array.isArray(saved.answers)) {
    state.answers = saved.answers.slice(0, state.quizzes.length);
    state.currentIndex = Math.min(saved.currentIndex ?? 0, state.quizzes.length - 1);
  } else {
    state.answers = new Array(state.quizzes.length).fill(null);
    state.currentIndex = 0;
    saveProgress();
  }

  renderQuestion();
  showScreen("quiz");
}

function resetQuiz() {
  state.currentIndex = 0;
  state.answers = new Array(state.quizzes.length).fill(null);
  clearProgress();
  saveProgress();
  renderQuestion();
  showScreen("quiz");
}

async function init() {
  try {
    const response = await fetch("./quiz.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("quiz.json load failed");
    }

    state.quizzes = await response.json();
    updateIntro();
    showScreen("intro");
  } catch (error) {
    console.error(error);
    totalCountEl.textContent = "-";
    resumeStateEl.textContent = "불러오기 실패";
    startBtnEl.disabled = true;
  }
}

startBtnEl.addEventListener("click", startQuiz);

nextBtnEl.addEventListener("click", () => {
  if (state.answers[state.currentIndex] == null) {
    return;
  }

  if (state.currentIndex === state.quizzes.length - 1) {
    renderResult();
    return;
  }

  state.currentIndex += 1;
  saveProgress();
  renderQuestion();
});

restartBtnEl.addEventListener("click", () => {
  clearProgress();
  updateIntro();
  showScreen("intro");
});

resetBtnEl.addEventListener("click", resetQuiz);

init();

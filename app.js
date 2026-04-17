const STORAGE_KEY = "quiz-web-progress-v2";
const QUIZ_SOURCE = "./quiz_combined.json";
const WEEK_COUNT = 6;

const state = {
  allQuizzes: [],
  weeks: [],
  selectedWeekId: null,
  currentIndex: 0,
  answers: [],
  order: []
};

const screenEls = {
  intro: document.getElementById("intro-screen"),
  quiz: document.getElementById("quiz-screen"),
  result: document.getElementById("result-screen")
};

const weekNavEl = document.getElementById("week-nav");
const introTitleEl = document.getElementById("intro-title");
const selectedWeekLabelEl = document.getElementById("selected-week-label");
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
const quizWeekLabelEl = document.getElementById("quiz-week-label");
const resultWeekLabelEl = document.getElementById("result-week-label");

function showScreen(name) {
  Object.entries(screenEls).forEach(([key, element]) => {
    element.classList.toggle("active", key === name);
  });
}

function loadAllProgress() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return {};
  }
}

function saveWeekProgress() {
  if (!state.selectedWeekId) {
    return;
  }

  const allProgress = loadAllProgress();
  allProgress[state.selectedWeekId] = {
    currentIndex: state.currentIndex,
    answers: state.answers,
    order: state.order
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
}

function clearWeekProgress(weekId = state.selectedWeekId) {
  if (!weekId) {
    return;
  }

  const allProgress = loadAllProgress();
  delete allProgress[weekId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
}

function getSelectedWeek() {
  return state.weeks.find((week) => week.id === state.selectedWeekId) ?? null;
}

function getWeekProgress(weekId) {
  const allProgress = loadAllProgress();
  return allProgress[weekId] ?? null;
}

function shuffleArray(items) {
  const next = [...items];

  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }

  return next;
}

function splitIntoWeeks(quizzes) {
  const baseSize = Math.floor(quizzes.length / WEEK_COUNT);
  const remainder = quizzes.length % WEEK_COUNT;
  const weeks = [];
  let start = 0;

  for (let i = 0; i < WEEK_COUNT; i += 1) {
    const size = baseSize + (i < remainder ? 1 : 0);
    const items = quizzes.slice(start, start + size);
    weeks.push({
      id: `week-${i + 1}`,
      label: `${i + 1}주차`,
      rangeLabel: `${start + 1}번 - ${start + size}번`,
      quizzes: items
    });
    start += size;
  }

  return weeks;
}

function renderWeekNav() {
  const allProgress = loadAllProgress();
  weekNavEl.innerHTML = "";

  state.weeks.forEach((week) => {
    const button = document.createElement("button");
    const saved = allProgress[week.id];
    const answeredCount = Array.isArray(saved?.answers)
      ? saved.answers.filter((answer) => answer != null).length
      : 0;

    button.type = "button";
    button.className = "week-btn";
    if (state.selectedWeekId === week.id) {
      button.classList.add("active");
    }

    button.innerHTML = `
      <span class="week-btn-title">${week.label}</span>
      <span class="week-btn-meta">${answeredCount}/${week.quizzes.length}</span>
    `;

    button.addEventListener("click", () => {
      selectWeek(week.id);
    });

    weekNavEl.appendChild(button);
  });
}

function updateIntro() {
  const week = getSelectedWeek();

  if (!week) {
    introTitleEl.textContent = "주차를 선택해 주세요";
    selectedWeekLabelEl.textContent = "-";
    totalCountEl.textContent = "-";
    resumeStateEl.textContent = "주차 선택 필요";
    startBtnEl.textContent = "시작하기";
    startBtnEl.disabled = true;
    return;
  }

  const saved = getWeekProgress(week.id);
  const answeredCount = Array.isArray(saved?.answers)
    ? saved.answers.filter((answer) => answer != null).length
    : 0;
  const hasResume = answeredCount > 0 && answeredCount < week.quizzes.length;

  introTitleEl.textContent = `${week.label} 퀴즈`;
  selectedWeekLabelEl.textContent = week.label;
  totalCountEl.textContent = String(week.quizzes.length);
  resumeStateEl.textContent = hasResume ? `${answeredCount}개까지 풀이` : "새로 시작";
  startBtnEl.textContent = hasResume ? "이어 풀기" : "시작하기";
  startBtnEl.disabled = false;
}

function selectWeek(weekId) {
  state.selectedWeekId = weekId;
  state.currentIndex = 0;
  state.answers = [];
  state.order = [];
  renderWeekNav();
  updateIntro();
  showScreen("intro");
}

function getCurrentQuiz() {
  const week = getSelectedWeek();
  return week.quizzes[state.order[state.currentIndex]];
}

function renderQuestion() {
  const week = getSelectedWeek();
  const quiz = getCurrentQuiz();
  const selected = state.answers[state.currentIndex] ?? null;
  const progress = ((state.currentIndex + 1) / week.quizzes.length) * 100;

  quizWeekLabelEl.textContent = week.label;
  progressTextEl.textContent = `${state.currentIndex + 1} / ${week.quizzes.length}`;
  progressFillEl.style.width = `${progress}%`;
  questionTextEl.textContent = quiz.question;
  optionsContainerEl.innerHTML = "";

  Object.entries(quiz.options).forEach(([key, value]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-btn";
    button.innerHTML = `<strong>${key.toUpperCase()}.</strong> ${value}`;

    if (selected !== null) {
      button.disabled = true;

      if (key === quiz.answer) {
        button.classList.add("correct");
      }

      if (selected === key && selected !== quiz.answer) {
        button.classList.add("incorrect");
      }
    } else {
      button.addEventListener("click", () => {
        state.answers[state.currentIndex] = key;
        saveWeekProgress();
        renderQuestion();
        renderWeekNav();
        updateIntro();
      });
    }

    optionsContainerEl.appendChild(button);
  });

  nextBtnEl.disabled = selected === null;
  nextBtnEl.textContent = state.currentIndex === week.quizzes.length - 1 ? "결과 보기" : "다음";
}

function calculateAccuracy() {
  const week = getSelectedWeek();
  let correct = 0;

  state.order.forEach((quizIndex, index) => {
    const quiz = week.quizzes[quizIndex];
    if (state.answers[index] === quiz.answer) {
      correct += 1;
    }
  });

  return (correct / week.quizzes.length) * 100;
}

function renderResult() {
  const week = getSelectedWeek();
  const accuracy = calculateAccuracy();
  accuracyValueEl.textContent = `${accuracy.toFixed(1)}%`;
  resultWeekLabelEl.textContent = `${week.label} 완료`;
  clearWeekProgress();
  renderWeekNav();
  updateIntro();
  showScreen("result");
}

function startQuiz() {
  const week = getSelectedWeek();

  if (!week) {
    return;
  }

  const saved = getWeekProgress(week.id);

  if (
    saved &&
    Array.isArray(saved.answers) &&
    Array.isArray(saved.order) &&
    saved.order.length === week.quizzes.length
  ) {
    state.answers = saved.answers.slice(0, week.quizzes.length);
    while (state.answers.length < week.quizzes.length) {
      state.answers.push(null);
    }
    state.order = saved.order.slice(0, week.quizzes.length);
    state.currentIndex = Math.min(saved.currentIndex ?? 0, week.quizzes.length - 1);
  } else {
    state.answers = new Array(week.quizzes.length).fill(null);
    state.order = shuffleArray(week.quizzes.map((_, index) => index));
    state.currentIndex = 0;
    saveWeekProgress();
  }

  renderQuestion();
  showScreen("quiz");
}

function resetQuiz() {
  const week = getSelectedWeek();

  if (!week) {
    return;
  }

  state.currentIndex = 0;
  state.answers = new Array(week.quizzes.length).fill(null);
  state.order = shuffleArray(week.quizzes.map((_, index) => index));
  clearWeekProgress();
  saveWeekProgress();
  renderQuestion();
  renderWeekNav();
  updateIntro();
  showScreen("quiz");
}

async function init() {
  try {
    const response = await fetch(QUIZ_SOURCE, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("quiz source load failed");
    }

    state.allQuizzes = await response.json();
    state.weeks = splitIntoWeeks(state.allQuizzes);
    state.selectedWeekId = state.weeks[0]?.id ?? null;
    renderWeekNav();
    updateIntro();
    showScreen("intro");
  } catch (error) {
    console.error(error);
    introTitleEl.textContent = "불러오기 실패";
    resumeStateEl.textContent = "quiz 파일을 확인해 주세요";
    startBtnEl.disabled = true;
  }
}

startBtnEl.addEventListener("click", startQuiz);

nextBtnEl.addEventListener("click", () => {
  const week = getSelectedWeek();

  if (!week || state.answers[state.currentIndex] == null) {
    return;
  }

  if (state.currentIndex === week.quizzes.length - 1) {
    renderResult();
    return;
  }

  state.currentIndex += 1;
  saveWeekProgress();
  renderQuestion();
});

restartBtnEl.addEventListener("click", () => {
  state.currentIndex = 0;
  state.answers = [];
  state.order = [];
  renderWeekNav();
  updateIntro();
  showScreen("intro");
});

resetBtnEl.addEventListener("click", resetQuiz);

init();

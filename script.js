const root = document.documentElement;
const book = document.querySelector("#book");
const scene = document.querySelector(".scene");
const closeFocusButton = document.querySelector(".close-focus");
const ownerProfile = document.querySelector(".keeper-profile");
const ownerPage = document.querySelector(".page-1 .page-front");
const ownerFields = document.querySelectorAll(".keeper-profile input, .keeper-profile textarea, .keeper-profile button");
const backgroundButtons = document.querySelectorAll(".background-choice");
const backgroundStorageKey = "friendship-diary-background";
let progress = 0;
let target = 0;
let raf = 0;
let isFocused = false;
let focusScrollY = 0;
let focusProgress = 0;

function scrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

function paint() {
  progress += (target - progress) * 0.12;
  if (Math.abs(target - progress) < 0.0005) progress = target;
  const coverTurn = Math.min(1, progress * 5);
  const centeringPhase = Math.max(0, Math.min(1, (coverTurn - .5) * 2));
  const smoothCentering = centeringPhase * centeringPhase * (3 - 2 * centeringPhase);
  root.style.setProperty("--progress", progress.toFixed(4));
  root.style.setProperty("--cover-turn", coverTurn.toFixed(4));
  root.style.setProperty("--center-shift", (.46 * smoothCentering).toFixed(4));
  ownerProfile.setAttribute("aria-hidden", String(progress < .16 || progress >= .3));
  document.body.classList.toggle("has-scrolled", progress > 0.025);
  if (progress !== target) raf = requestAnimationFrame(paint);
  else raf = 0;
}

function update() {
  if (isFocused) return;
  target = scrollProgress();
  if (!raf) raf = requestAnimationFrame(paint);
}

function openFirstSpread() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: .2 * max, behavior: "smooth" });
}

function applyBackground(color, pattern, remember = true) {
  const colors = ["rose", "sky", "leaf", "sun"];
  const patterns = ["dots", "grid", "stripes"];
  const nextColor = colors.includes(color) ? color : "rose";
  const nextPattern = patterns.includes(pattern) ? pattern : "dots";
  ownerPage.dataset.bgColor = nextColor;
  ownerPage.dataset.bgPattern = nextPattern;
  backgroundButtons.forEach((button) => {
    const selected = button.dataset.bgColor === nextColor || button.dataset.bgPattern === nextPattern;
    button.setAttribute("aria-pressed", String(selected));
  });
  if (!remember) return;
  try {
    localStorage.setItem(backgroundStorageKey, JSON.stringify({ color: nextColor, pattern: nextPattern }));
  } catch {}
}

backgroundButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyBackground(
      button.dataset.bgColor || ownerPage.dataset.bgColor,
      button.dataset.bgPattern || ownerPage.dataset.bgPattern
    );
  });
});

try {
  const savedBackground = JSON.parse(localStorage.getItem(backgroundStorageKey));
  applyBackground(savedBackground?.color, savedBackground?.pattern, false);
} catch {
  applyBackground("rose", "dots", false);
}

function enterFocus() {
  if (isFocused || progress < .18 || Math.abs(progress - target) > .008) return;
  focusScrollY = window.scrollY;
  focusProgress = progress;
  isFocused = true;
  root.classList.add("is-focused");
  book.setAttribute("role", "group");
  book.tabIndex = -1;
  book.setAttribute("aria-expanded", "true");
  book.setAttribute("aria-label", "Увеличенный разворот книги");
  if (progress >= .16 && progress < .3) {
    ownerFields.forEach((field) => { field.disabled = false; });
  }
  closeFocusButton.focus({ preventScroll: true });
}

function leaveFocus() {
  if (!isFocused) return;
  isFocused = false;
  root.classList.remove("is-focused");
  ownerFields.forEach((field) => { field.disabled = true; });
  book.setAttribute("role", "button");
  book.tabIndex = 0;
  book.setAttribute("aria-expanded", "false");
  book.setAttribute("aria-label", "Книга; прокручивайте, чтобы листать, или нажмите, чтобы приблизить разворот");
  book.focus({ preventScroll: true });
  window.scrollTo({ top: focusScrollY, behavior: "auto" });
  progress = focusProgress;
  target = scrollProgress();
  root.style.setProperty("--progress", progress.toFixed(4));
  if (!raf && progress !== target) raf = requestAnimationFrame(paint);
}

window.addEventListener("scroll", update, { passive: true });
window.addEventListener("resize", update, { passive: true });

book.addEventListener("click", () => {
  if (isFocused) return;
  if (progress < .18) {
    openFirstSpread();
    return;
  }
  enterFocus();
});

closeFocusButton.addEventListener("click", (event) => {
  event.stopPropagation();
  leaveFocus();
});

scene.addEventListener("click", (event) => {
  if (!isFocused || book.contains(event.target) || closeFocusButton.contains(event.target)) return;
  leaveFocus();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isFocused) {
    event.preventDefault();
    leaveFocus();
    return;
  }

  if ((event.key === "Enter" || event.key === " ") && event.target === book) {
    event.preventDefault();
    if (progress < .18) openFirstSpread();
    else enterFocus();
    return;
  }

  if (isFocused) return;
  if (!["ArrowRight", "ArrowLeft", " "].includes(event.key)) return;
  event.preventDefault();
  const direction = event.key === "ArrowLeft" ? -1 : 1;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const next = Math.min(1, Math.max(0, target + direction * .2));
  window.scrollTo({ top: next * max, behavior: "smooth" });
});

update();

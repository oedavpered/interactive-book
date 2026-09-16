const pages = [
  { id: 1, kicker: "Вступление", title: "Место, где остаются моменты", text: "Некоторые истории хочется держать рядом — не громко, а бережно, между плотными страницами." },
  { id: 2, kicker: "Глава первая", title: "Случайный свет", text: "Утро задержалось на занавеске и на несколько минут сделало комнату совсем другой." },
  { id: 3, kicker: "Заметка", title: "Дорога к морю", text: "Мы не запомнили названий улиц, зато помним запах соли и нагретого камня." },
  { id: 4, kicker: "Глава вторая", title: "Тёплый сентябрь", text: "Вечер был длинным, разговор — простым, а время будто перестало торопиться." },
  { id: 5, kicker: "Наблюдение", title: "Маленькие вещи", text: "Билет в кармане, засушенный лист и записка на полях иногда помнят больше фотографий." },
  { id: 6, kicker: "Глава третья", title: "В окнах напротив", text: "По одному зажигался свет, и город становился большой книгой без последней страницы." },
  { id: 7, kicker: "Письмо", title: "До скорой встречи", text: "Пусть всё важное находит дорогу обратно — через годы, города и случайные воспоминания." },
  { id: 8, kicker: "Послесловие", title: "Продолжение следует", text: "Последняя страница — это просто тихое место перед следующей историей." }
];

const book = document.querySelector("#book");
const stage = document.querySelector("#bookStage");
const cover = document.querySelector("#frontCover");
const backCover = document.querySelector("#backCover");
const leftPage = document.querySelector("#leftPage");
const rightPage = document.querySelector("#rightPage");
const flipping = document.querySelector("#flippingPage");
const flipFront = flipping.querySelector(".face-front .paper-content");
const flipBack = flipping.querySelector(".face-back .paper-content");
const hint = document.querySelector("#hint");
const progress = document.querySelector("#progress");
const leftStack = document.querySelector("#leftStack");
const rightStack = document.querySelector("#rightStack");

let spread = 0;
let isOpen = false;
let isAnimating = false;
let drag = null;
let suppressClickUntil = 0;
const spreadCount = pages.length / 2;

function pageMarkup(page) {
  if (!page) return "";
  return `<span class="page-kicker">${page.kicker}</span><h2>${page.title}</h2><p>${page.text}</p><span class="ornament"></span><span class="page-number">${String(page.id).padStart(2, "0")}</span>`;
}

function renderSpread() {
  const left = pages[spread * 2];
  const right = pages[spread * 2 + 1];
  leftPage.querySelector(".paper-content").innerHTML = pageMarkup(left);
  rightPage.querySelector(".paper-content").innerHTML = pageMarkup(right);
  progress.textContent = isOpen ? `${spread + 1} / ${spreadCount}` : "";
  const ratio = spread / Math.max(1, spreadCount - 1);
  leftStack.style.transform = `translate(${-3 - ratio * 7}px, ${3 + ratio * 3}px)`;
  rightStack.style.transform = `translate(${10 - ratio * 7}px, ${6 - ratio * 3}px)`;
  leftStack.style.filter = `brightness(${.91 + ratio * .05})`;
  rightStack.style.filter = `brightness(${.96 - ratio * .05})`;
}

function openBook() {
  if (isOpen || isAnimating) return;
  isAnimating = true;
  cover.classList.add("opening");
  hint.style.opacity = "0";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { book.dataset.state = "opening"; });
  });
  window.setTimeout(() => {
    cover.classList.remove("opening");
    cover.classList.add("opened");
    book.dataset.state = "open";
    isOpen = true;
    isAnimating = false;
    hint.textContent = "Потяните страницу за край или используйте клавиши ← →";
    hint.style.opacity = "1";
    renderSpread();
  }, 900);
}

function turn(direction) {
  if (Date.now() < suppressClickUntil) return;
  if (!isOpen || isAnimating) return;
  const next = spread + direction;
  if (direction > 0 && next >= spreadCount) {
    closeToBack();
    return;
  }
  if (next < 0) return;
  isAnimating = true;
  flipping.className = `flipping-page active ${direction > 0 ? "forward" : "backward"}`;

  if (direction > 0) {
    flipFront.innerHTML = pageMarkup(pages[spread * 2 + 1]);
    flipBack.innerHTML = pageMarkup(pages[next * 2]);
  } else {
    flipFront.innerHTML = pageMarkup(pages[next * 2 + 1]);
    flipBack.innerHTML = pageMarkup(pages[spread * 2]);
  }

  window.setTimeout(() => {
    spread = next;
    renderSpread();
    flipping.className = "flipping-page";
    isAnimating = false;
  }, 820);
}

function prepareFlip(direction) {
  const next = spread + direction;
  flipping.className = `flipping-page active dragging ${direction > 0 ? "drag-forward" : "drag-backward"}`;
  if (direction > 0) {
    flipFront.innerHTML = pageMarkup(pages[spread * 2 + 1]);
    flipBack.innerHTML = pageMarkup(pages[next * 2]);
  } else {
    flipFront.innerHTML = pageMarkup(pages[next * 2 + 1]);
    flipBack.innerHTML = pageMarkup(pages[spread * 2]);
  }
}

function dragProgress(clientX, direction) {
  const rect = book.getBoundingClientRect();
  const spine = rect.left + rect.width / 2;
  const pageWidth = rect.width / 2;
  return direction > 0
    ? Math.max(0, Math.min(1, (spine + pageWidth - clientX) / (pageWidth * 2)))
    : Math.max(0, Math.min(1, (clientX - (spine - pageWidth)) / (pageWidth * 2)));
}

function applyDrag(progressValue, direction) {
  const angle = direction > 0 ? -180 * progressValue : -180 + 180 * progressValue;
  flipping.style.transform = `rotateY(${angle}deg)`;
  flipping.style.setProperty("--drag-shade", Math.sin(Math.PI * progressValue).toFixed(3));
}

function beginPointerDrag(event, direction) {
  if (!isOpen || isAnimating || drag) return;
  const next = spread + direction;
  if (next < 0 || next >= spreadCount) return;
  drag = { pointerId: event.pointerId, direction, startX: event.clientX, progress: 0, active: false };
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function movePointerDrag(event) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  if (!drag.active && Math.abs(event.clientX - drag.startX) < 5) return;
  if (!drag.active) {
    drag.active = true;
    isAnimating = true;
    prepareFlip(drag.direction);
    document.body.classList.add("is-dragging");
  }
  event.preventDefault();
  drag.progress = dragProgress(event.clientX, drag.direction);
  applyDrag(drag.progress, drag.direction);
}

function endPointerDrag(event) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  const current = drag;
  drag = null;
  if (!current.active) return;
  suppressClickUntil = Date.now() + 450;
  document.body.classList.remove("is-dragging");
  const complete = current.progress >= .34;
  const targetProgress = complete ? 1 : 0;
  const distance = Math.abs(targetProgress - current.progress);
  const duration = Math.max(180, Math.round(460 * distance));
  flipping.classList.remove("dragging");
  flipping.classList.add("settling");
  flipping.style.setProperty("--settle-time", `${duration}ms`);
  requestAnimationFrame(() => applyDrag(targetProgress, current.direction));
  window.setTimeout(() => {
    if (complete) spread += current.direction;
    renderSpread();
    flipping.className = "flipping-page";
    flipping.removeAttribute("style");
    isAnimating = false;
  }, duration + 30);
}

function reactToPointer(event) {
  if (!isOpen || isAnimating) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - .5;
  event.currentTarget.style.filter = `brightness(${1 + Math.abs(x) * .018})`;
}

function clearPointerReaction(event) {
  event.currentTarget.style.removeProperty("filter");
}

function closeToBack() {
  if (isAnimating) return;
  isAnimating = true;
  backCover.classList.add("closing");
  hint.style.opacity = "0";
  window.setTimeout(() => {
    backCover.classList.remove("closing");
    book.dataset.state = "back";
    isOpen = false;
    isAnimating = false;
    progress.textContent = "";
    hint.textContent = "Нажмите на заднюю обложку, чтобы вернуться";
    hint.style.opacity = "1";
  }, 900);
}

function reopenFromBack() {
  if (book.dataset.state !== "back" || isAnimating) return;
  isAnimating = true;
  book.dataset.state = "open";
  window.setTimeout(() => {
    isOpen = true;
    isAnimating = false;
    hint.textContent = "Потяните страницу за край или используйте клавиши ← →";
    renderSpread();
  }, 900);
}

function resizeBook() {
  const scale = Math.min(1, (window.innerWidth - 28) / 700, (window.innerHeight - 112) / 538);
  stage.style.setProperty("--book-scale", Math.max(.44, scale).toFixed(3));
}

cover.addEventListener("click", openBook);
backCover.addEventListener("click", reopenFromBack);
rightPage.addEventListener("click", () => turn(1));
leftPage.addEventListener("click", () => turn(-1));
rightPage.addEventListener("pointerdown", (event) => beginPointerDrag(event, 1));
leftPage.addEventListener("pointerdown", (event) => beginPointerDrag(event, -1));
rightPage.addEventListener("pointermove", reactToPointer);
leftPage.addEventListener("pointermove", reactToPointer);
rightPage.addEventListener("pointerleave", clearPointerReaction);
leftPage.addEventListener("pointerleave", clearPointerReaction);
window.addEventListener("pointermove", movePointerDrag, { passive: false });
window.addEventListener("pointerup", endPointerDrag);
window.addEventListener("pointercancel", endPointerDrag);
window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" && book.dataset.state === "back") {
    reopenFromBack();
    return;
  }
  if (event.key === "ArrowRight") turn(1);
  if (event.key === "ArrowLeft") turn(-1);
  if ((event.key === "Enter" || event.key === " ") && !isOpen) openBook();
});
window.addEventListener("resize", resizeBook);

renderSpread();
resizeBook();

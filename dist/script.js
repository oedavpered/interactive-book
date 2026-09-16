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
  book.dataset.state = "open";
  cover.classList.add("opening");
  hint.style.opacity = "0";
  window.setTimeout(() => {
    cover.classList.remove("opening");
    cover.classList.add("opened");
    isOpen = true;
    isAnimating = false;
    hint.textContent = "Листайте кликом по странице или клавишами ← →";
    hint.style.opacity = "1";
    renderSpread();
  }, 900);
}

function turn(direction) {
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
    hint.textContent = "Листайте кликом по странице или клавишами ← →";
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

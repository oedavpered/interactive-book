const root = document.documentElement;
const book = document.querySelector("#book");
const scene = document.querySelector(".scene");
const closeFocusButton = document.querySelector(".close-focus");
const ownerProfile = document.querySelector(".keeper-profile");
const ownerPage = document.querySelector(".page-1 .page-front");
const ownerFields = document.querySelectorAll(".keeper-profile input, .keeper-profile textarea, .keeper-profile button");
const backgroundButtons = document.querySelectorAll(".background-choice");
const backgroundStorageKey = "friendship-diary-background";
const avatarSlot = document.querySelector(".avatar-slot");
const avatarImage = document.querySelector(".avatar-image");
const avatarFrameArt = document.querySelector(".avatar-frame-art");
const photoEditor = document.querySelector(".photo-editor");
const photoEditorClose = document.querySelector(".photo-editor-close");
const photoCancel = document.querySelector(".photo-cancel");
const photoApply = document.querySelector(".photo-apply");
const photoFile = document.querySelector(".photo-file");
const frameCarousel = document.querySelector(".frame-carousel");
const frameOptions = [...document.querySelectorAll(".frame-option")];
const frameImages = [...document.querySelectorAll(".frame-image")];
const frameEmpties = [...document.querySelectorAll(".frame-empty")];
const photoZoom = document.querySelector(".photo-zoom");
let progress = 0;
let target = 0;
let raf = 0;
let isFocused = false;
let focusScrollY = 0;
let focusProgress = 0;
let appliedPhoto = { src: "", shape: "instax", zoom: 1, x: 0, y: 0 };
let draftPhoto = { ...appliedPhoto };
let dragStart = null;
let swipeStart = null;
let suppressFrameClick = false;
let lastCarouselWheel = 0;
const assetFrames = {
  camera: "./assets/frames/camera-frame.png",
  phone: "./assets/frames/phone-frame.png",
  lovers: "./assets/frames/lovers-card-frame.png",
  locket: "./assets/frames/heart-locket-frame.png",
  "star-polaroid": "./assets/frames/star-polaroid-frame.png",
  "silver-heart": "./assets/frames/silver-heart-frame.png",
  holographic: "./assets/frames/holographic-frame.png",
  cats: "./assets/frames/cat-polaroid-frame.png",
  "lace-heart": "./assets/frames/lace-heart-frame.png",
  "lace-oval": "./assets/frames/lace-oval-frame.png"
};

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

function setPhotoTransform(element, state) {
  element.style.setProperty("--photo-x", `${state.x}%`);
  element.style.setProperty("--photo-y", `${state.y}%`);
  element.style.setProperty("--photo-zoom", state.zoom);
}

function renderPhotoEditor() {
  const selectedIndex = frameOptions.findIndex((option) => option.dataset.shape === draftPhoto.shape);
  const tilts = {
    rectangle: "-5deg", circle: "4deg", instax: "5deg", camera: "-4deg", phone: "3deg", lovers: "-3deg", locket: "5deg",
    "star-polaroid": "-4deg", "silver-heart": "4deg", holographic: "-3deg", cats: "4deg", "lace-heart": "-5deg", "lace-oval": "3deg"
  };
  frameOptions.forEach((option, index) => {
    const selected = index === selectedIndex;
    const rawOffset = (index - selectedIndex + frameOptions.length) % frameOptions.length;
    const offset = rawOffset <= Math.floor(frameOptions.length / 2) ? rawOffset : rawOffset - frameOptions.length;
    const distance = Math.abs(offset);
    option.setAttribute("aria-selected", String(selected));
    option.style.setProperty("--offset", offset);
    option.style.setProperty("--lift", selected ? "-145px" : distance === 1 ? "-120px" : distance === 2 ? "-108px" : "-102px");
    option.style.setProperty("--scale", selected ? "1" : distance === 1 ? ".72" : distance === 2 ? ".56" : ".46");
    option.style.setProperty("--opacity", "1");
    option.style.setProperty("--layer", selected ? "8" : distance === 1 ? "5" : distance === 2 ? "3" : "2");
    option.style.setProperty("--tilt", tilts[option.dataset.shape] || "0deg");
    const image = frameImages[index];
    const empty = frameEmpties[index];
    image.src = draftPhoto.src;
    image.hidden = !draftPhoto.src;
    empty.hidden = Boolean(draftPhoto.src) || !selected;
    empty.innerHTML = "ВЫБРАТЬ<br>ФОТО";
    setPhotoTransform(image, draftPhoto);
  });
  photoApply.disabled = !draftPhoto.src;
  photoZoom.value = draftPhoto.zoom;
  photoZoom.disabled = !draftPhoto.src;
}

function selectAdjacentFrame(direction) {
  const current = frameOptions.findIndex((option) => option.dataset.shape === draftPhoto.shape);
  const next = (current + direction + frameOptions.length) % frameOptions.length;
  draftPhoto.shape = frameOptions[next].dataset.shape;
  renderPhotoEditor();
  frameOptions[next].focus({ preventScroll: true });
}

function openPhotoEditor() {
  if (photoEditor.open) return;
  draftPhoto = { ...appliedPhoto };
  renderPhotoEditor();
  photoEditor.classList.remove("is-closing");
  photoEditor.showModal();
}

function closePhotoEditor() {
  if (!photoEditor.open || photoEditor.classList.contains("is-closing")) return;
  photoEditor.classList.add("is-closing");
}

photoEditor.addEventListener("animationend", (event) => {
  if (event.animationName !== "photo-sheet-out" || !photoEditor.classList.contains("is-closing")) return;
  photoEditor.classList.remove("is-closing");
  photoEditor.close();
});

avatarSlot.addEventListener("click", openPhotoEditor);
photoEditorClose.addEventListener("click", closePhotoEditor);
photoCancel.addEventListener("click", closePhotoEditor);
photoEditor.addEventListener("click", (event) => {
  if (event.target === photoEditor) closePhotoEditor();
});
photoEditor.addEventListener("cancel", (event) => {
  event.preventDefault();
  closePhotoEditor();
});

photoFile.addEventListener("change", () => {
  const file = photoFile.files?.[0];
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    draftPhoto = { ...draftPhoto, src: String(reader.result), zoom: 1, x: 0, y: 0 };
    renderPhotoEditor();
    photoFile.value = "";
  });
  reader.readAsDataURL(file);
});

frameOptions.forEach((option) => {
  option.addEventListener("click", () => {
    if (suppressFrameClick) return;
    if (option.dataset.shape !== draftPhoto.shape) {
      draftPhoto.shape = option.dataset.shape;
      renderPhotoEditor();
      option.focus({ preventScroll: true });
      return;
    }
    photoFile.click();
  });
  option.addEventListener("keydown", (event) => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    selectAdjacentFrame(event.key === 'ArrowRight' ? 1 : -1);
  });
});

frameCarousel.addEventListener("wheel", (event) => {
  const amount = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (Math.abs(amount) < 8) return;
  event.preventDefault();
  const now = performance.now();
  if (now - lastCarouselWheel < 360) return;
  lastCarouselWheel = now;
  selectAdjacentFrame(amount > 0 ? 1 : -1);
}, { passive: false });

photoZoom.addEventListener("input", () => {
  draftPhoto.zoom = Number(photoZoom.value);
  const limit = (draftPhoto.zoom - 1) * 30;
  draftPhoto.x = Math.max(-limit, Math.min(limit, draftPhoto.x));
  draftPhoto.y = Math.max(-limit, Math.min(limit, draftPhoto.y));
  frameImages.forEach((image) => setPhotoTransform(image, draftPhoto));
});

frameCarousel.addEventListener("pointerdown", (event) => {
  const option = event.target.closest(".frame-option");
  if (!option) return;
  if (option.dataset.shape === draftPhoto.shape && draftPhoto.src) {
    dragStart = { pointerId: event.pointerId, option, x: event.clientX, y: event.clientY, photoX: draftPhoto.x, photoY: draftPhoto.y, moved: false };
    option.setPointerCapture(event.pointerId);
    option.classList.add("is-dragging");
    return;
  }
  swipeStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  option.setPointerCapture(event.pointerId);
});

frameCarousel.addEventListener("pointermove", (event) => {
  if (dragStart && dragStart.pointerId === event.pointerId) {
    const bounds = dragStart.option.getBoundingClientRect();
    const limit = (draftPhoto.zoom - 1) * 30;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    if (Math.hypot(dx,dy) > 4) dragStart.moved = true;
    draftPhoto.x = Math.max(-limit, Math.min(limit, dragStart.photoX + (dx / bounds.width) * 100));
    draftPhoto.y = Math.max(-limit, Math.min(limit, dragStart.photoY + (dy / bounds.height) * 100));
    frameImages.forEach((image) => setPhotoTransform(image, draftPhoto));
  }
});

function finishFramePointer(event) {
  if (dragStart && dragStart.pointerId === event.pointerId) {
    const moved = dragStart.moved;
    dragStart.option.classList.remove("is-dragging");
    dragStart = null;
    if (moved) {
      suppressFrameClick = true;
      setTimeout(() => { suppressFrameClick = false; }, 0);
    }
    return;
  }
  if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;
  const dx = event.clientX - swipeStart.x;
  swipeStart = null;
  if (Math.abs(dx) < 34) return;
  suppressFrameClick = true;
  selectAdjacentFrame(dx < 0 ? 1 : -1);
  setTimeout(() => { suppressFrameClick = false; }, 0);
}

frameCarousel.addEventListener("pointerup", finishFramePointer);
frameCarousel.addEventListener("pointercancel", finishFramePointer);

photoApply.addEventListener("click", () => {
  if (!draftPhoto.src) return;
  appliedPhoto = { ...draftPhoto };
  avatarImage.src = appliedPhoto.src;
  avatarSlot.dataset.hasPhoto = "true";
  avatarSlot.dataset.photoShape = appliedPhoto.shape;
  avatarFrameArt.src = assetFrames[appliedPhoto.shape] || "";
  avatarSlot.setAttribute("aria-label", "Изменить фотографию");
  setPhotoTransform(avatarImage, appliedPhoto);
  closePhotoEditor();
});

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

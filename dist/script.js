const root = document.documentElement;
const book = document.querySelector("#book");
const scene = document.querySelector(".scene");
const closeFocusButton = document.querySelector(".close-focus");
const ownerProfile = document.querySelector(".keeper-profile");
const ownerFields = document.querySelectorAll(".keeper-profile input, .keeper-profile textarea, .keeper-profile button");
const avatarSlot = document.querySelector(".avatar-slot");
const avatarPhotoFrame = document.querySelector(".avatar-photo-frame");
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
let appliedPhoto = { src: "", originalSrc: "", cutoutSrc: "", shape: "instax", zoom: 1, x: 0, y: 0 };
let draftPhoto = { ...appliedPhoto };
let dragStart = null;
let swipeStart = null;
let suppressFrameClick = false;
let lastCarouselWheel = 0;
let isApplyingPhoto = false;
let stickerAudioContext = null;
let personSegmenterPromise = null;
let cutoutJob = 0;
let isCutoutProcessing = false;
let cutoutError = false;
let cutoutErrorMessage = "";
const visionModuleUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";
const visionWasmUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const personModelUrl = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
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
  const coverTurn = Math.min(1, progress * 5.5);
  const hingeFold = Math.sin(Math.PI * coverTurn);
  const centeringPhase = Math.max(0, Math.min(1, (coverTurn - .5) * 2));
  const smoothCentering = centeringPhase * centeringPhase * (3 - 2 * centeringPhase);
  root.style.setProperty("--progress", progress.toFixed(4));
  root.style.setProperty("--cover-turn", coverTurn.toFixed(4));
  root.style.setProperty("--cover-depth", `${(10 - smoothCentering * 30).toFixed(2)}px`);
  root.style.setProperty("--hinge-fold", hingeFold.toFixed(4));
  root.style.setProperty("--center-shift", (.46 * smoothCentering).toFixed(4));
  book.classList.toggle("is-cover-open", coverTurn > .5);
  ownerProfile.setAttribute("aria-hidden", String(progress < .15 || progress >= .46));
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

function setPhotoTransform(element, state) {
  element.style.setProperty("--photo-x", `${state.x}%`);
  element.style.setProperty("--photo-y", `${state.y}%`);
  element.style.setProperty("--photo-zoom", state.zoom);
}

function loadPhotoImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error("photo-load-failed")), { once: true });
    image.src = src;
  });
}

async function getPersonSegmenter() {
  if (!personSegmenterPromise) {
    personSegmenterPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import(visionModuleUrl);
      const vision = await FilesetResolver.forVisionTasks(visionWasmUrl);
      return ImageSegmenter.createFromOptions(vision, {
        baseOptions: { modelAssetPath: personModelUrl },
        runningMode: "IMAGE",
        outputCategoryMask: false,
        outputConfidenceMasks: true
      });
    })().catch((error) => {
      personSegmenterPromise = null;
      throw error;
    });
  }
  return personSegmenterPromise;
}

async function createPersonCutout(src) {
  const [image, segmenter] = await Promise.all([loadPhotoImage(src), getPersonSegmenter()]);
  const result = segmenter.segment(image);
  const personMask = result.confidenceMasks?.[1];
  if (!personMask) {
    result.close();
    throw new Error("person-mask-missing");
  }

  const values = personMask.getAsFloat32Array();
  const maskWidth = personMask.width;
  const maskHeight = personMask.height;
  let minX = maskWidth;
  let minY = maskHeight;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < maskHeight; y += 1) {
    for (let x = 0; x < maskWidth; x += 1) {
      if (values[y * maskWidth + x] < .22) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) {
    result.close();
    throw new Error("person-not-found");
  }

  const marginX = Math.round((maxX - minX + 1) * .06);
  const marginY = Math.round((maxY - minY + 1) * .04);
  minX = Math.max(0, minX - marginX);
  minY = Math.max(0, minY - marginY);
  maxX = Math.min(maskWidth - 1, maxX + marginX);
  maxY = Math.min(maskHeight - 1, maxY + marginY);

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = maskWidth;
  maskCanvas.height = maskHeight;
  const maskContext = maskCanvas.getContext("2d");
  const maskImage = maskContext.createImageData(maskWidth, maskHeight);
  for (let i = 0; i < values.length; i += 1) {
    const alpha = Math.max(0, Math.min(255, Math.round((values[i] - .08) * 300)));
    const offset = i * 4;
    maskImage.data[offset] = 255;
    maskImage.data[offset + 1] = 255;
    maskImage.data[offset + 2] = 255;
    maskImage.data[offset + 3] = alpha;
  }
  maskContext.putImageData(maskImage, 0, 0);
  result.close();

  const sourceX = minX / maskWidth * image.naturalWidth;
  const sourceY = minY / maskHeight * image.naturalHeight;
  const sourceWidth = (maxX - minX + 1) / maskWidth * image.naturalWidth;
  const sourceHeight = (maxY - minY + 1) / maskHeight * image.naturalHeight;
  const maxSide = 820;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const alphaCanvas = document.createElement("canvas");
  alphaCanvas.width = width;
  alphaCanvas.height = height;
  const alphaContext = alphaCanvas.getContext("2d");
  alphaContext.imageSmoothingEnabled = true;
  alphaContext.drawImage(maskCanvas, minX, minY, maxX - minX + 1, maxY - minY + 1, 0, 0, width, height);

  const cutoutCanvas = document.createElement("canvas");
  cutoutCanvas.width = width;
  cutoutCanvas.height = height;
  const cutoutContext = cutoutCanvas.getContext("2d");
  cutoutContext.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  cutoutContext.globalCompositeOperation = "destination-in";
  cutoutContext.drawImage(alphaCanvas, 0, 0);

  const outline = Math.max(8, Math.round(Math.max(width, height) * .022));
  const padding = outline + Math.max(8, Math.round(outline * .7));
  const stickerCanvas = document.createElement("canvas");
  stickerCanvas.width = width + padding * 2;
  stickerCanvas.height = height + padding * 2;
  const stickerContext = stickerCanvas.getContext("2d");
  const silhouetteCanvas = document.createElement("canvas");
  silhouetteCanvas.width = width;
  silhouetteCanvas.height = height;
  const silhouetteContext = silhouetteCanvas.getContext("2d");
  silhouetteContext.fillStyle = "#fff";
  silhouetteContext.fillRect(0, 0, width, height);
  silhouetteContext.globalCompositeOperation = "destination-in";
  silhouetteContext.drawImage(alphaCanvas, 0, 0);

  stickerContext.save();
  stickerContext.shadowColor = "rgba(48,54,57,.28)";
  stickerContext.shadowBlur = outline * 1.25;
  stickerContext.shadowOffsetY = Math.max(3, outline * .35);
  stickerContext.drawImage(silhouetteCanvas, padding, padding);
  stickerContext.restore();
  for (let step = 0; step < 32; step += 1) {
    const angle = step / 32 * Math.PI * 2;
    stickerContext.drawImage(
      silhouetteCanvas,
      padding + Math.cos(angle) * outline,
      padding + Math.sin(angle) * outline
    );
  }
  stickerContext.drawImage(silhouetteCanvas, padding, padding);
  stickerContext.drawImage(cutoutCanvas, padding, padding);
  return stickerCanvas.toDataURL("image/png");
}

async function prepareCutout(source) {
  const job = ++cutoutJob;
  isCutoutProcessing = true;
  cutoutError = false;
  cutoutErrorMessage = "";
  draftPhoto = { ...draftPhoto, originalSrc: source, cutoutSrc: "", src: "" };
  renderPhotoEditor();
  try {
    const cutoutSrc = await createPersonCutout(source);
    if (job !== cutoutJob) return;
    draftPhoto = {
      ...draftPhoto,
      cutoutSrc,
      src: draftPhoto.shape === "cutout" ? cutoutSrc : draftPhoto.originalSrc
    };
  } catch (error) {
    if (job === cutoutJob) {
      cutoutError = true;
      cutoutErrorMessage = ["person-not-found", "person-mask-missing"].includes(error?.message)
        ? "НЕ НАШЛА<br>ЧЕЛОВЕКА"
        : "НЕ УДАЛОСЬ<br>ОБРАБОТАТЬ";
      draftPhoto = { ...draftPhoto, src: "", cutoutSrc: "" };
    }
  } finally {
    if (job === cutoutJob) {
      isCutoutProcessing = false;
      renderPhotoEditor();
    }
  }
}

function selectFrameShape(shape) {
  draftPhoto.shape = shape;
  if (shape === "cutout") {
    if (draftPhoto.cutoutSrc) draftPhoto.src = draftPhoto.cutoutSrc;
    else if (draftPhoto.originalSrc && !isCutoutProcessing) {
      prepareCutout(draftPhoto.originalSrc);
      return;
    } else draftPhoto.src = "";
  } else if (draftPhoto.originalSrc) {
    draftPhoto.src = draftPhoto.originalSrc;
  }
  renderPhotoEditor();
}

function renderPhotoEditor() {
  const selectedIndex = frameOptions.findIndex((option) => option.dataset.shape === draftPhoto.shape);
  const tilts = {
    rectangle: "-5deg", circle: "4deg", cutout: "-4deg", instax: "5deg", camera: "-4deg", phone: "3deg", lovers: "-3deg", locket: "5deg",
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
    const previewSrc = option.dataset.shape === "cutout" ? draftPhoto.cutoutSrc : (draftPhoto.originalSrc || draftPhoto.src);
    image.src = previewSrc;
    image.hidden = !previewSrc;
    option.classList.toggle("has-photo", Boolean(previewSrc));
    option.classList.toggle("is-processing", option.dataset.shape === "cutout" && isCutoutProcessing);
    empty.hidden = Boolean(previewSrc) || !selected;
    empty.innerHTML = option.dataset.shape === "cutout" && isCutoutProcessing
      ? "ВЫРЕЗАЮ…"
      : option.dataset.shape === "cutout" && cutoutError
        ? cutoutErrorMessage
        : "ВЫБРАТЬ<br>ФОТО";
    setPhotoTransform(image, draftPhoto);
  });
  photoApply.disabled = !draftPhoto.src || (draftPhoto.shape === "cutout" && isCutoutProcessing);
  photoZoom.value = draftPhoto.zoom;
  photoZoom.disabled = !draftPhoto.src;
}

function selectAdjacentFrame(direction) {
  const current = frameOptions.findIndex((option) => option.dataset.shape === draftPhoto.shape);
  const next = (current + direction + frameOptions.length) % frameOptions.length;
  selectFrameShape(frameOptions[next].dataset.shape);
  frameOptions[next].focus({ preventScroll: true });
}

function openPhotoEditor() {
  if (photoEditor.open) return;
  draftPhoto = { ...appliedPhoto };
  renderPhotoEditor();
  frameOptions.forEach((option) => option.classList.remove("is-flight-source"));
  photoEditor.classList.remove("is-sticking");
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
  photoEditor.classList.remove("is-sticking");
  frameOptions.forEach((option) => option.classList.remove("is-flight-source"));
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
    const source = String(reader.result);
    cutoutError = false;
    cutoutErrorMessage = "";
    draftPhoto = { ...draftPhoto, originalSrc: source, cutoutSrc: "", src: source, zoom: 1, x: 0, y: 0 };
    if (draftPhoto.shape === "cutout") prepareCutout(source);
    else renderPhotoEditor();
    photoFile.value = "";
  });
  reader.readAsDataURL(file);
});

frameOptions.forEach((option) => {
  option.addEventListener("click", () => {
    if (suppressFrameClick) return;
    if (option.dataset.shape !== draftPhoto.shape) {
      selectFrameShape(option.dataset.shape);
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

function setAvatarPhoto(state) {
  appliedPhoto = { ...state };
  avatarImage.src = state.src;
  avatarSlot.dataset.hasPhoto = "true";
  avatarSlot.dataset.photoShape = state.shape;
  avatarFrameArt.src = assetFrames[state.shape] || "";
  avatarSlot.setAttribute("aria-label", "Изменить фотографию");
  setPhotoTransform(avatarImage, state);
}

function playStickerSlap() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    stickerAudioContext ||= new AudioContextClass();
    const context = stickerAudioContext;
    if (context.state === "suspended") context.resume().catch(() => {});
    const now = context.currentTime;
    const noiseLength = Math.floor(context.sampleRate * .11);
    const buffer = context.createBuffer(1, noiseLength, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i += 1) {
      const envelope = Math.pow(1 - i / noiseLength, 3.4);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1250, now);
    filter.frequency.exponentialRampToValueAtTime(360, now + .11);
    noiseGain.gain.setValueAtTime(.18, now);
    noiseGain.gain.exponentialRampToValueAtTime(.001, now + .11);
    noise.connect(filter).connect(noiseGain).connect(context.destination);

    const pop = context.createOscillator();
    const popGain = context.createGain();
    pop.type = "sine";
    pop.frequency.setValueAtTime(165, now);
    pop.frequency.exponentialRampToValueAtTime(76, now + .12);
    popGain.gain.setValueAtTime(.13, now);
    popGain.gain.exponentialRampToValueAtTime(.001, now + .13);
    pop.connect(popGain).connect(context.destination);
    noise.start(now);
    pop.start(now);
    pop.stop(now + .14);
  } catch {}
}

function prepareStickerSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    stickerAudioContext ||= new AudioContextClass();
    if (stickerAudioContext.state === "suspended") stickerAudioContext.resume().catch(() => {});
  } catch {}
}

async function animateStickerToAvatar() {
  const selectedOption = frameOptions.find((option) => option.dataset.shape === draftPhoto.shape);
  const sourceCard = selectedOption?.querySelector(".frame-card");
  if (!sourceCard) return;
  const sourceRect = sourceCard.getBoundingClientRect();
  const sourceCenter = {
    x: sourceRect.left + sourceRect.width / 2,
    y: sourceRect.top + sourceRect.height / 2
  };
  const sourceMatrix = new DOMMatrixReadOnly(getComputedStyle(selectedOption).transform);
  const sourceScale = Math.hypot(sourceMatrix.a, sourceMatrix.b) || 1;
  const sourceAngle = Math.atan2(sourceMatrix.b, sourceMatrix.a) * 180 / Math.PI;
  setAvatarPhoto(draftPhoto);
  avatarSlot.classList.add("is-awaiting-sticker");
  const targetRect = avatarPhotoFrame.getBoundingClientRect();
  const targetCenter = {
    x: targetRect.left + targetRect.width / 2,
    y: targetRect.top + targetRect.height / 2
  };
  const targetTransform = getComputedStyle(avatarPhotoFrame).transform;
  const targetMatrix = new DOMMatrixReadOnly(targetTransform === "none" ? undefined : targetTransform);
  const targetPoseScale = Math.hypot(targetMatrix.a, targetMatrix.b) || 1;
  const targetAngle = Math.atan2(targetMatrix.b, targetMatrix.a) * 180 / Math.PI;
  const cardWidth = sourceCard.offsetWidth;
  const cardHeight = sourceCard.offsetHeight;
  const editorRect = photoEditor.getBoundingClientRect();
  const flyer = document.createElement("div");
  flyer.className = `photo-sticker-flight frame-option${selectedOption.classList.contains("frame-option-asset") ? " frame-option-asset" : ""}`;
  flyer.dataset.shape = draftPhoto.shape;
  flyer.append(sourceCard.cloneNode(true));
  Object.assign(flyer.style, {
    left: `${sourceCenter.x - editorRect.left}px`, top: `${sourceCenter.y - editorRect.top}px`,
    width: `${cardWidth}px`, height: `${cardHeight}px`,
    marginLeft: `${-cardWidth / 2}px`, marginTop: `${-cardHeight / 2}px`
  });
  photoEditor.append(flyer);
  selectedOption.classList.add("is-flight-source");
  photoEditor.classList.add("is-sticking");

  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  const targetScale = Math.min(
    avatarPhotoFrame.offsetWidth / cardWidth,
    avatarPhotoFrame.offsetHeight / cardHeight
  ) * targetPoseScale;
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const direction = dx >= 0 ? 1 : -1;
    const flight = flyer.animate([
      { transform: `translate3d(0,0,0) rotate(${sourceAngle}deg) scale(${sourceScale})`, opacity: 1, offset: 0 },
      { transform: `translate3d(${dx * .34 + 54 * direction}px,${dy * .24 - 76}px,0) rotate(${sourceAngle - 8 * direction}deg) scale(${sourceScale * 1.13})`, opacity: 1, offset: .34 },
      { transform: `translate3d(${dx * .78 - 18 * direction}px,${dy * .72 - 42}px,0) rotate(${targetAngle + 5 * direction}deg) scale(${Math.max(targetScale * 1.12,.34)})`, opacity: 1, offset: .72 },
      { transform: `translate3d(${dx}px,${dy}px,0) rotate(${targetAngle - 3 * direction}deg) scale(${targetScale * .93})`, opacity: 1, offset: .9 },
      { transform: `translate3d(${dx}px,${dy}px,0) rotate(${targetAngle}deg) scale(${targetScale})`, opacity: 1, offset: 1 }
    ], { duration: 920, easing: "cubic-bezier(.18,.76,.24,1)", fill: "forwards" });
    await flight.finished.catch(() => {});
  }
  flyer.remove();
  avatarSlot.classList.remove("is-awaiting-sticker");
  avatarSlot.classList.add("just-stuck");
  playStickerSlap();
  setTimeout(() => avatarSlot.classList.remove("just-stuck"), 420);
}

photoApply.addEventListener("click", async () => {
  if (!draftPhoto.src || isApplyingPhoto) return;
  prepareStickerSound();
  isApplyingPhoto = true;
  photoApply.disabled = true;
  await animateStickerToAvatar();
  closePhotoEditor();
  isApplyingPhoto = false;
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
  if (progress >= .15 && progress < .46) {
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

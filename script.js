const root = document.documentElement;
const book = document.querySelector("#book");
let progress = 0;
let target = 0;
let raf = 0;

function scrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

function paint() {
  progress += (target - progress) * 0.12;
  if (Math.abs(target - progress) < 0.0005) progress = target;
  root.style.setProperty("--progress", progress.toFixed(4));
  document.body.classList.toggle("has-scrolled", progress > 0.025);
  if (progress !== target) raf = requestAnimationFrame(paint);
  else raf = 0;
}

function update() {
  target = scrollProgress();
  if (!raf) raf = requestAnimationFrame(paint);
}

window.addEventListener("scroll", update, { passive: true });
window.addEventListener("resize", update, { passive: true });

book.addEventListener("click", () => {
  const stops = [0, .2, .4, .6, .8, 1];
  const next = stops.find((stop) => stop > target + .04) ?? 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: next * max, behavior: "smooth" });
});

window.addEventListener("keydown", (event) => {
  if (!["ArrowRight", "ArrowLeft", " "].includes(event.key)) return;
  event.preventDefault();
  const direction = event.key === "ArrowLeft" ? -1 : 1;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const next = Math.min(1, Math.max(0, target + direction * .2));
  window.scrollTo({ top: next * max, behavior: "smooth" });
});

update();

// A made-up figure for the docs of the engine: the order flow of a small roastery, drawn as a line of machines.
const STEPS = ["Order placed", "In stock?", "Buy green beans", "Roast batch", "Cool and rest", "Pack bags", "Ship order", "Coffee delivered"];
const W = 110;

const boxes = STEPS.map((label, index) => {
  const x = 10 + index * W;
  return `<g class="roast-line-step" data-step="${index}"><rect x="${x}" y="30" width="96" height="44" rx="6"/><text x="${x + 48}" y="56">${label}</text></g>`;
}).join("");

const html = `<figure class="roast-line">
<svg viewBox="0 0 ${10 + STEPS.length * W} 104" role="img" aria-label="The order flow as a line of machines">${boxes}</svg>
<figcaption>Click the line to light the next machine. <output id="roast-line-step">${STEPS[0]}</output></figcaption>
</figure>`;

const script = `
const steps = ${JSON.stringify(STEPS)};
const svg = document.querySelector(".roast-line svg");
const output = document.getElementById("roast-line-step");
let current = 0;
const show = () => {
  for (const step of svg.querySelectorAll(".roast-line-step")) step.classList.toggle("on", Number(step.dataset.step) === current);
  output.textContent = steps[current];
};
svg.addEventListener("click", () => { current = (current + 1) % steps.length; show(); });
show();
`;

const css = `
.roast-line svg { width: 100%; height: auto; cursor: pointer; }
.roast-line rect { fill: #f4efe6; stroke: #6b4f3a; }
.roast-line text { font: 10px system-ui, sans-serif; text-anchor: middle; fill: #2b1d12; }
.roast-line .on rect { fill: #6b4f3a; }
.roast-line .on text { fill: #fff; }
`;

export default { html, script, css };

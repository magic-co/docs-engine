// On a narrow screen the nav tree is closed until the reader opens it with the Menu button.
for (const button of document.querySelectorAll<HTMLButtonElement>(".docs-nav-toggle")) {
  const nav = button.closest(".docs-nav");
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    nav?.toggleAttribute("data-open", open);
  });
}

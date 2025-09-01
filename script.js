// Example animation for "hearts assembling"
document.addEventListener("DOMContentLoaded", () => {
  const logo = document.querySelector(".logo");

  setTimeout(() => {
    logo.style.transform = "scale(1.1)";
    setTimeout(() => (logo.style.transform = "scale(1)"), 500);
  }, 2000);
});

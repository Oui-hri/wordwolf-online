function showScreen(screenId) {

  const screens =
    document.querySelectorAll(".screen");

  screens.forEach(screen => {

    screen.classList.add("hidden");

  });

  document
    .getElementById(screenId)
    .classList.remove("hidden");
}

showScreen("title-screen");

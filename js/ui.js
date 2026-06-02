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

function startTopicCountdown() {

  let time = 10;

  const countdown =
    document.getElementById("countdown");

  countdown.textContent = time;

  const timer = setInterval(() => {

    time--;

    countdown.textContent = time;

    if (time <= 0) {

      clearInterval(timer);

      showScreen("discussion-screen");

    }

  }, 1000);

}

showScreen("title-screen");

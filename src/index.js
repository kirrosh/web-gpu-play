import { updateSnake, setDirection } from "./snake";

const UPDATE_INTERVAL = 500; // Update every 200ms (5 times/sec)

setInterval(updateSnake, UPDATE_INTERVAL);

// add eventlistener for keypress to change direction
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") {
    setDirection(1);
  } else if (event.key === "ArrowDown") {
    setDirection(3);
  } else if (event.key === "ArrowLeft") {
    setDirection(2);
  } else if (event.key === "ArrowRight") {
    setDirection(0);
  }
});

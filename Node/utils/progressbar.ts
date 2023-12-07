/**
 * @author lei.liang
 * @example
    // Example usage
    const progressBar = createProgressBar(100);

    // Simulate progress by incrementing the count
    for (let i = 1; i <= 100; i++) {
    setTimeout(() => {
        progressBar.updateCompleted(1);
    }, i * 100); // Delay each increment for visualization purposes
    }

 */
// import readline from "readline"
const readline = require('readline')

function createProgressBar(total, label = "Progress: ") {
  const progressBarWidth = 30; // Width of the progress bar in characters
  let completed = 0;

  // Create a writable stream for stdout
  const outputStream = process.stdout;

  // Create a readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: outputStream,
    terminal: true
  });

  // Update the progress bar
  function updateProgressBar() {
    const progress = Math.round((completed / total) * progressBarWidth);
    const emptyProgress = progressBarWidth - progress;

    const bar = "\x1b[32m" + '█'.repeat(progress)+ "\x1b[39m" + '-'.repeat(emptyProgress);
    const percentage = Math.round((completed / total) * 100);

    outputStream.clearLine && outputStream.clearLine();
    outputStream.cursorTo && outputStream.cursorTo(0);
    outputStream.write(`${label} [${bar}] ${percentage}%`);
  }

  // Update the completed count and progress bar
  function updateCompleted(count) {
    completed += count;
    updateProgressBar();

    if (completed >= total) {
      outputStream.write('\n');
      rl.close();
    }
  }

  return { updateCompleted };
}

    // // Example usage
    // const progressBar = createProgressBar(651);

    // // Simulate progress by incrementing the count
    // for (let i = 1; i <= 100; i++) {
    // setTimeout(() => {
    //     progressBar.updateCompleted(1);
    // }, i * 100); // Delay each increment for visualization purposes
    // }
// export default createProgressBar
module.exports = {
  createProgressBar
}
// Developed by Sydney Edwards
const TEMPLATES = {
  start_stop_continue: {
    id: "start_stop_continue",
    name: "Start / Stop / Continue",
    description: "Reflect on behaviors to begin, stop, and keep doing next sprint.",
    columns: [
      { key: "start", label: "Start", color: "--color-success" },
      { key: "stop", label: "Stop", color: "--color-danger" },
      { key: "continue", label: "Continue", color: "--color-accent" }
    ]
  },
  "4ls": {
    id: "4ls",
    name: "4Ls",
    description: "Explore what the team liked, learned, lacked, and longed for.",
    columns: [
      { key: "liked", label: "Liked", color: "--color-success" },
      { key: "learned", label: "Learned", color: "--color-accent" },
      { key: "lacked", label: "Lacked", color: "--color-warning" },
      { key: "longed_for", label: "Longed For", color: "--color-danger" }
    ]
  },
  mad_sad_glad: {
    id: "mad_sad_glad",
    name: "Mad / Sad / Glad",
    description: "Capture emotional signals and sentiment to drive meaningful improvements.",
    columns: [
      { key: "mad", label: "Mad", color: "--color-danger" },
      { key: "sad", label: "Sad", color: "--color-warning" },
      { key: "glad", label: "Glad", color: "--color-success" }
    ]
  }
};

module.exports = { TEMPLATES };

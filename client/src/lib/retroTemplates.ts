// Developed by Sydney Edwards
export type RetroTemplateId = "start_stop_continue" | "4ls" | "mad_sad_glad";

export const RETRO_TEMPLATES: Record<
  RetroTemplateId,
  {
    id: RetroTemplateId;
    name: string;
    description: string;
    columns: Array<{ key: string; label: string; color: string }>;
  }
> = {
  start_stop_continue: {
    id: "start_stop_continue",
    name: "Start / Stop / Continue",
    description: "Reflect on what to begin, stop, and keep doing in the next sprint.",
    columns: [
      { key: "start", label: "Start", color: "--color-success" },
      { key: "stop", label: "Stop", color: "--color-danger" },
      { key: "continue", label: "Continue", color: "--color-accent" }
    ]
  },
  "4ls": {
    id: "4ls",
    name: "4Ls",
    description: "Capture what the team liked, learned, lacked, and longed for.",
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
    description: "Highlight emotional signals and sentiment from the sprint.",
    columns: [
      { key: "mad", label: "Mad", color: "--color-danger" },
      { key: "sad", label: "Sad", color: "--color-warning" },
      { key: "glad", label: "Glad", color: "--color-success" }
    ]
  }
};

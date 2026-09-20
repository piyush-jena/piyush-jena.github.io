// Shared, editable config. Change the GYM_API_BASE once the backend is
// reachable at its Tailscale Funnel URL.
window.SITE = {
  githubUser: "piyush-jena",
  linkedin: "https://www.linkedin.com/in/piyush-jena",

  // Curated, not auto-generated: real projects worth surfacing.
  // `feature: true` gets the large card. Live stats are fetched client-side
  // in github.js and fall back to these values if the API call fails.
  featuredRepos: [
    {
      owner: "bottlerocket-os",
      repo: "bottlerocket",
      feature: true,
      blurb: "The container-optimized Linux OS I work on day to day at AWS: minimal, update-atomic, API-driven instead of SSH-and-pray.",
    },
    {
      owner: "piyush-jena",
      repo: "vector-math-performance",
      blurb: "Leans on Intel's BLAS-focused CPU instructions to push vector math throughput in C.",
    },
    {
      owner: "piyush-jena",
      repo: "tinyinference",
      blurb: "A from-scratch C++ framework for running language model inference without a Python runtime in the way.",
    },
    {
      owner: "piyush-jena",
      repo: "arch-hyprland",
      blurb: "My Arch + Hyprland rice: the dotfiles this very laptop runs.",
    },
    {
      owner: "piyush-jena",
      repo: "cuda-essentials",
      blurb: "A starting point for learning CUDA fundamentals, from kernels up.",
    },
    {
      owner: "piyush-jena",
      repo: "media-server",
      blurb: "Self-hosted media stack config, the same homelab machine that now also runs the Gym API below.",
    },
  ],

  // GitHub org/repo whose branches can be previewed on the Bottlerocket tab.
  bottlerocketPreview: {
    owner: "piyush-jena",
    repo: "bottlerocket-project-website",
  },

  // Filled in once the Tailscale Funnel URL for backend/gym-server exists.
  // Left blank on purpose: the Gym tab shows an honest "not connected" state
  // until this is set.
  gymApiBase: "",
};

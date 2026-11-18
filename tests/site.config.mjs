// Settings for the site tests. Change these deliberately, never to make a failing test pass.

// Set to true on launch day. From then on, no public page may carry a noindex tag.
export const LAUNCHED = false;

// Folders that must always stay hidden from Google (noindex), launched or not.
export const PRIVATE = ['/members/'];

// Most a page may download on first load (images below the fold load lazily, so they don't count).
export const PAGE_WEIGHT_KB = 1500;

// Pages the tests skip, each with a reason. Keep this list as short as possible.
export const SKIP_PAGES = [
  // The old volunteer map tool. It needs the 1GB tomb photos, which are not in git (see .gitignore), so it can never pass on GitHub.
  "/graveyard/churchyard.html",
];

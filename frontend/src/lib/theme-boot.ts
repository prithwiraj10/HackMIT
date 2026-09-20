export const THEME_STORAGE_KEY = "flu-u-theme";
export const DARK_CLASS = "theme-dark";

/* Inlined in <head> before hydration so the first paint already has the class.
   Stored preference wins; otherwise follow the OS setting. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add(${JSON.stringify(
  DARK_CLASS,
)})}catch(e){}`;

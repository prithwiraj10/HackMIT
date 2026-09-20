export type CheckIn = {
  id: number;
  date: string;
  symptoms: string[];
  energy: number;
  severity: number;
  note: string;
};

export const SYMPTOMS = ["Sore throat", "Stomach upset", "Fatigue", "Fever"];

export const FOOD_AREAS = ["MIT campus", "Cambridge", "Boston"] as const;
export type FoodArea = (typeof FOOD_AREAS)[number];

export const FOOD_SPOTS: Record<FoodArea, string[]> = {
  "MIT campus": [
    "MIT Student Center: soup, bagels, tea",
    "Clover Food Lab: grain bowls and smoothies",
    "Flour Bakery: soup and soft baked goods",
  ],
  Cambridge: [
    "Clover Food Lab, Kendall Square",
    "Life Alive, Central Square",
    "Tatte Bakery, Harvard Square",
  ],
  Boston: ["Sweetgreen, Back Bay", "Pressed Café, Seaport", "Bon Me, Fenway"],
};

export function foodGuidance(symptoms: string[]) {
  return symptoms.includes("Stomach upset")
    ? "Try bland, low-effort options such as rice, toast, bananas, applesauce, broth, and water."
    : "Consider soft, simple options such as soup, oatmeal, tea, smoothies, fruit, or a grain bowl.";
}

export const DEEPGRAM_VOICES = [
  { id: "aura-2-helena-en", label: "Helena — caring and natural" },
  { id: "aura-2-andromeda-en", label: "Andromeda — expressive" },
  { id: "aura-2-arcas-en", label: "Arcas — smooth and clear" },
  { id: "aura-2-aries-en", label: "Aries — warm and energetic" },
];

export const today = () => new Date().toLocaleDateString("en-CA");

type RecognitionResult = { results: { 0: { transcript: string } }[] };
type Recognition = {
  lang: string;
  onresult: ((event: RecognitionResult) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};
type RecognitionWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

/** Runs the browser's speech recognizer once; returns false when unsupported. */
export function recognizeSpeech(
  onResult: (transcript: string) => void,
  onError: () => void,
) {
  const w = window as RecognitionWindow;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return false;
  const recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.onresult = (e) => onResult(e.results[0][0].transcript);
  recognition.onerror = onError;
  recognition.start();
  return true;
}

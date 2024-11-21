// types.d.ts
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  interface SpeechRecognitionEvent {
    results: {
      [index: number]: {
        [index: number]: {
          transcript: string;
        };
      };
    };
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: Event) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
    abort: () => void;
  }

  // Types pour l'historique
  interface User {
    id: string;
    email: string;
    name: string | null;
  }

  interface HistoryItem {
    id: number;
    user_id: string;
    question: string;
    answer: string;
    created_at: string;
    users: User | null;
  }

  interface ChatbotResponse {
    text: string;
    error?: string;
    questionsUsed?: number;
  }
}

export {};
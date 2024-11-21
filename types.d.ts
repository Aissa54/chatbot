declare global {
  // Interfaces pour les tables
  interface User {
    id: string;
    email: string;
    name?: string | null;
    questions_used: number;
    last_question_date?: string | null;
    created_at: string;
    updated_at: string;
  }

  interface QuestionHistory {
    id?: string;
    user_id: string;
    question: string;
    answer: string;
    created_at: string;
  }

  // Speech Recognition types
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

  interface ChatbotResponse {
    text: string;
    error?: string;
    questionsUsed?: number;
  }
}

export {};
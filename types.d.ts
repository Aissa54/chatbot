// types.d.ts

// Interfaces de fenêtre pour la reconnaissance vocale
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

// Interfaces pour le chatbot
interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface ChatbotResponse {
  text: string;
  error?: string;
  questionsUsed?: number;
}

interface ChatbotConfig {
  apiUrl: string;
  apiKey: string;
  maxTokens: number;
}
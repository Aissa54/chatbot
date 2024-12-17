// Les types de base pour chaque table

export interface Conversation {
    id: string;                    // uuid
    user_id: string;              // uuid, foreign key to auth.users.id
    title: string;                // text
    created_at: string;           // timestamptz
    updated_at: string;           // timestamptz
  }
  
  export interface QuestionHistory {
    id: string;                   // uuid
    user_id: string;              // uuid, foreign key to auth.users.id
    conversation_id: string;      // uuid, foreign key to conversations.id
    question: string;             // text
    answer: string;              // text
    created_at: string;           // timestamptz
  }
  
  export interface MessageFeedback {
    id: string;                   // uuid
    message_id: string;           // uuid, foreign key to question_history.id
    user_id: string;              // uuid, foreign key to auth.users.id
    is_positive: boolean;         // bool
    reason: string | null;        // varchar
    comment: string | null;       // text
    created_at: string;           // timestamptz
  }
  
  export interface UserProfile {
    id: string;                   // uuid, foreign key to auth.users.id
    email: string;                // text
    role: string | null;          // text
    company: string | null;       // text
    created_at: string;           // timestamptz
    last_seen: string | null;     // timestamptz
    metadata: Record<string, any> | null; // jsonb
  }
  
  // Types pour l'interface utilisateur
  
  export interface Message {
    id: string;
    type: 'user' | 'bot';
    content: string;
    timestamp: Date;
  }
  
  // Types pour le feedback
  export type FeedbackReason = 
    | 'incomplete' 
    | 'incorrect' 
    | 'unclear' 
    | 'irrelevant' 
    | 'outdated' 
    | 'other';
  
  export interface FeedbackSubmission {
    message_id: string;
    is_positive: boolean;
    reason?: FeedbackReason;
    comment?: string;
  }
  
  // Types pour la reconnaissance vocale
  export interface SpeechRecognitionResult {
    transcript: string;
  }
  
  export interface SpeechRecognitionEvent {
    results: {
      [key: number]: {
        [key: number]: SpeechRecognitionResult;
      };
    };
  }
  
  export interface IWindow extends Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
  
  // Types utilitaires
  
  export interface PaginationParams {
    page: number;
    limit: number;
  }
  
  export interface DateRange {
    startDate?: string;
    endDate?: string;
  }
  
  export interface SearchParams extends PaginationParams {
    query?: string;
    dateRange?: DateRange;
    userId?: string;
  }
  
  // Types pour les réponses API
  export interface ApiResponse<T> {
    data?: T;
    error?: string;
  }
  
  export interface ChatResponse {
    text: string;
    conversationId: string;
    error?: string;
  }
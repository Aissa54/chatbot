// types/feedback.ts
export interface MessageFeedback {
    id: string;  // UUID
    message_id: string;  // UUID
    user_id: string;  // UUID
    is_positive: boolean;
    reason?: string;
    comment?: string;
    created_at: string;
  }
  
  export type FeedbackReason = 
    | 'incomplete'  // Réponse incomplète
    | 'incorrect'   // Information incorrecte
    | 'unclear'     // Réponse peu claire
    | 'irrelevant'  // Réponse hors sujet
    | 'outdated'    // Information obsolète
    | 'other';      // Autre raison
  
  export interface FeedbackSubmission {
    message_id: string;
    is_positive: boolean;
    reason?: FeedbackReason;
    comment?: string;
  }
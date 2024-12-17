// types.d.ts
interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface QuestionHistory {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  created_at: string;
  conversation_id: string;
}

interface UserProfile {
  id: string;
  email: string;
  role: string;
  company: string;
  created_at: string;
  last_seen: string;
  metadata: Record<string, any>;
}

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}
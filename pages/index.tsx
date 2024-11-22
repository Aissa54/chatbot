import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import {
  Send,
  Loader2,
  Moon,
  Sun,
  Mic,
  MicOff,
  Trash2,
  PanelLeftOpen,
  PanelLeftClose,
  Clock,
  MessageSquare,
  Settings,
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session } from '@supabase/supabase-js';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "Quel est le prix d'une amende de classe 3 ?",
  "Quelles sont les obligations d'entretien ?",
] as const;

const formatDate = (date: Date | string | number) => {
  try {
    const dateObject = new Date(date);
    if (isNaN(dateObject.getTime())) throw new Error('Invalid Date');
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObject);
  } catch (e) {
    console.error('Erreur de formatage de date:', e);
    return 'Date non disponible';
  }
};

const formatTime = (date: Date | string | number) => {
  try {
    const dateObject = new Date(date);
    if (isNaN(dateObject.getTime())) throw new Error('Invalid Date');
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObject);
  } catch (e) {
    console.error("Erreur de formatage de l'heure:", e);
    return '';
  }
};

const Home = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const router = useRouter();
  const supabase = createClientComponentClient();

  const groupedMessages = useMemo(() => {
    return messages.reduce<{ [key: string]: Message[] }>((groups, message) => {
      const date = formatDate(message.timestamp);
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
      return groups;
    }, {});
  }, [messages]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (!session) {
          router.push('/login');
        }
      } catch (error) {
        console.error('Erreur de vérification de session:', error);
        router.push('/login');
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      if (typeof window !== 'undefined') {
        localStorage.removeItem('chatHistory');
        localStorage.removeItem('darkMode');
      }

      router.push('/login').then(() => {
        window.location.reload();
      });
    } catch (err) {
      console.error('Erreur lors de la déconnexion:', err);
      alert('Erreur lors de la déconnexion. Veuillez réessayer.');
    }
  };

  const handleSubmit = useCallback(
    async (event: React.FormEvent | Event, suggestedMessage?: string) => {
      event.preventDefault();
      const messageToSend = suggestedMessage || message;
      if (!messageToSend.trim()) return;

      const newUserMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: messageToSend.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newUserMessage]);
      setMessage('');
      setLoading(true);
      setError(null);
      setShowSuggestions(false);

      try {
        const res = await fetch('/api/chatbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageToSend }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Une erreur est survenue');

        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: data.text || "Désolé, je n'ai pas compris la question.",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, botResponse]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  const clearHistory = () => {
    setMessages([]);
    if (isClient) {
      localStorage.removeItem('chatHistory');
    }
    setShowSuggestions(true);
  };
  const toggleVoiceRecognition = () => {
    try {
      if (!recognitionRef.current) {
        alert("La reconnaissance vocale n'est pas supportée par votre navigateur");
        return;
      }

      if (isListening) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
      }
      setIsListening(!isListening);
    } catch (error) {
      console.error('Erreur lors du basculement de la reconnaissance vocale:', error);
      setIsListening(false);
    }
  };

  if (!isClient) {
    return <div className="min-h-screen bg-gray-50"></div>;
  }

  return (
    <div className={`flex flex-col min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm py-3 sm:py-4 px-3 sm:px-6 fixed w-full top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Image
              src="/images/logo.png"
              alt="ColdBot Logo"
              width={32}
              height={32}
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
              priority
            />
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white truncate">
              ColdBot - Spécialiste du froid
            </h1>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Voir l'historique"
            >
              <PanelLeftOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={clearHistory}
              className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Effacer l'historique"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Changer le thème"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
            {session?.user?.email === 'aissa.moustaine@gmail.com' && (
              <button
                onClick={() => router.push('/admin/history')}
                className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Administration"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Se déconnecter"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 sm:w-5 sm:h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto mt-16 sm:mt-20 mb-20 sm:mb-24 px-3 sm:px-4 md:px-6">
        <div className="space-y-4 py-4">
          {messages.length === 0 && showSuggestions ? (
            <div className="space-y-4">
              <div className="text-center text-gray-500 dark:text-gray-400 py-6 sm:py-8">
                <p className="text-sm sm:text-base">Comment puis-je vous aider aujourd'hui ?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSubmit(new Event('submit'), question)}
                    className="p-2 sm:p-3 text-left text-sm bg-white dark:bg-gray-800 rounded-lg shadow-sm 
                             hover:shadow-md transition-shadow duration-200 border border-gray-200 
                             dark:border-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} 
                          animate-[fadeIn_0.3s_ease-in-out_forwards]`}
              >
                <div
                  className={`rounded-lg px-3 py-2 sm:px-4 sm:py-2 ${
                    msg.type === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm rounded-bl-none'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs mt-1 opacity-70">{formatTime(msg.timestamp)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Input */}
      <form
        onSubmit={handleSubmit}
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg px-3 py-3 sm:px-4 sm:py-4"
      >
        <div className="max-w-7xl mx-auto flex items-center space-x-2 sm:space-x-4">
          <button
            type="button"
            onClick={toggleVoiceRecognition}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              isListening
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
            title="Activer/désactiver la reconnaissance vocale"
          >
            {isListening ? (
              <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Posez votre question..."
            className="flex-1 px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base border border-gray-300 
                     dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 
                     focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 
                     dark:text-white transition-colors"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="px-4 py-2 sm:px-6 sm:py-2 bg-blue-500 text-white rounded-lg 
                     hover:bg-blue-600 disabled:bg-gray-300 
                     dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors
                     flex-shrink-0"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Home;

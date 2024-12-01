// pages/index.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import {
  Send,
  Moon,
  Sun,
  Mic,
  MicOff,
  Trash2,
  Clock,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

interface SpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
}

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

const Home = () => {
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true);
  const [isClient, setIsClient] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const router = useRouter();
  const { session, signOut } = useAuth();
  const isAdmin = session?.user?.email === 'aissa.moustaine@gmail.com';

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

  useEffect(() => {
    setIsClient(true);

    // Initialisation de la reconnaissance vocale
    if (typeof window !== 'undefined') {
      try {
        const windowWithSpeech = window as unknown as IWindow;
        const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = 'fr-FR';

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = event.results[0][0].transcript;
            setMessage(transcript);
          };

          recognition.onerror = (event: any) => {
            console.error('Erreur de reconnaissance vocale:', event.error);
            setIsListening(false);
          };

          recognition.onend = () => {
            setIsListening(false);
          };

          recognitionRef.current = recognition;
        }
      } catch (error) {
        console.error('La reconnaissance vocale n\'est pas supportée:', error);
      }
    }

    // Mode sombre
    const savedDarkMode = typeof window !== 'undefined' 
      ? localStorage.getItem('darkMode') === 'true'
      : false;
    setDarkMode(savedDarkMode);
    
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', String(darkMode));
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [darkMode]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Une erreur est survenue');
        }

        const data = await res.json();
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
    setShowSuggestions(true);
    setError(null);
  };

  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur");
      return;
    }

    try {
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

  if (!isClient || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm py-3 px-6 fixed w-full top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Image
              src="/images/logo.png"
              alt="ColdBot Logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
              priority
            />
            <h1 className="text-xl font-bold text-gray-800 dark:text-white truncate">
              ColdBot - Spécialiste du froid
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            {/* Bouton Historique pour tous les utilisateurs */}
            <button
              onClick={() => router.push('/admin/history')}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Historique"
            >
              <Clock className="w-5 h-5" />
            </button>

            {isAdmin && (
              <button
                onClick={() => router.push('/admin/history')}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Administration"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title={darkMode ? 'Mode clair' : 'Mode sombre'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={clearHistory}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Effacer l'historique"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <button
              onClick={signOut}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 max-w-7xl w-full mx-auto mt-20 mb-24 px-4">
        <div className="space-y-4 py-4">
          {messages.length === 0 && showSuggestions ? (
            <div className="space-y-4">
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <p className="text-base">Comment puis-je vous aider aujourd'hui ?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSubmit(new Event('click'), question)}
                    className="p-3 text-left bg-white dark:bg-gray-800 rounded-lg shadow-sm 
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
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    msg.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className="text-xs mt-1 opacity-70">{formatTime(msg.timestamp)}</p>
                </div>
              </div>
            ))
          )}
          {error && (
            <div className="text-center text-red-500 dark:text-red-400 py-2">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg px-4 py-4"
      >
        <div className="max-w-7xl mx-auto flex items-center space-x-4">
          <button
            type="button"
            onClick={toggleVoiceRecognition}
            className={`p-2 rounded-lg transition-colors ${
              isListening
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
            title="Activer/désactiver la reconnaissance vocale"
          >
            {isListening ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Posez votre question..."
            className="flex-1 px-4 py-2 text-base border border-gray-300 
                     dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 
                     focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 
                     dark:text-white transition-colors"
          />
          <button
            type="submit"
            disabled={!message.trim() || loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg 
                     hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 
                     disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Home;
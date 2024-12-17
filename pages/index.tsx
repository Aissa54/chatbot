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
  MessageSquare,
  ArrowLeft,
  Settings,
  LogOut
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Composants
import ChatSidebar from '@/components/ChatSidebar';
import MessageFeedback from '@/components/MessageFeedback';

// Hooks
import { useAuth } from '../hooks/useAuth';

// Types
import type { Message, IWindow, SpeechRecognitionEvent } from '@/types/index.ts';

// Questions suggérées constantes
const SUGGESTED_QUESTIONS = [
  "Quel est le prix d'une amende de classe 3 ?",
  "Quelles sont les obligations d'entretien ?",
] as const;

const Home = () => {
  // États
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isViewingHistory, setIsViewingHistory] = useState<boolean>(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Références
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Hooks
  const router = useRouter();
  const { session, signOut } = useAuth();
  const supabase = createClientComponentClient();

  // Vérification si l'utilisateur est admin
  const isAdmin = session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',')[0];

  // Utilitaire de formatage du temps
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

  // Effet pour l'initialisation du client et de la reconnaissance vocale
  useEffect(() => {
    setIsClient(true);

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

    const savedDarkMode = typeof window !== 'undefined' 
      ? localStorage.getItem('darkMode') === 'true'
      : false;
    setDarkMode(savedDarkMode);
    
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Effet pour la gestion du mode sombre
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

  // Effet pour le scroll automatique
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Gestionnaire de soumission des messages
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
          body: JSON.stringify({ 
            message: messageToSend,
            conversationId: activeConversationId 
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Une erreur est survenue');
        }

        const data = await res.json();
        if (data.conversationId) {
          setActiveConversationId(data.conversationId);
        }

        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: data.text,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, botResponse]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    },
    [message, activeConversationId]
  );

  // Gestionnaires d'événements
  const handleConversationSelect = (selectedMessages: Message[]) => {
    setMessages(selectedMessages);
    setShowSuggestions(false);
    setIsViewingHistory(true);
    setIsSidebarOpen(false);
  };

  const handleReturnToHome = () => {
    setMessages([]);
    setShowSuggestions(true);
    setIsViewingHistory(false);
    setError(null);
    setActiveConversationId(null);
  };

  const clearHistory = () => {
    setMessages([]);
    setShowSuggestions(true);
    setError(null);
    setActiveConversationId(null);
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

  // Affichage du loader pendant le chargement initial
  if (!isClient || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Rendu principal
  return (
    <div className={`flex flex-col min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm py-3 px-6 fixed w-full top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {isViewingHistory && (
              <button
                onClick={handleReturnToHome}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 
                         dark:hover:bg-gray-700 rounded-full transition-colors mr-2"
                title="Retour à l'accueil"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
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
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 
                       dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Historique des conversations"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={clearHistory}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 
                       dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Effacer l'historique"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 
                       dark:hover:bg-gray-700 rounded-full transition-colors"
              title={darkMode ? 'Mode clair' : 'Mode sombre'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 
                         dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Administration"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={signOut}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 
                       dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Chat Sidebar */}
      <ChatSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onMessageSelect={handleConversationSelect}
        darkMode={darkMode}
      />

      {/* Main Content */}
      <main className="flex-1 mt-20 mb-24 mx-auto w-full max-w-3xl px-4">
        {showSuggestions && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h2 className="text-2xl font-semibold mb-8 text-gray-700 dark:text-gray-300">
              Comment puis-je vous aider ?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
              {SUGGESTED_QUESTIONS.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSubmit(new Event('click'), question)}
                  className="p-4 text-left bg-white dark:bg-gray-800 rounded-lg shadow-sm 
                           hover:shadow-md transition-shadow duration-200 border border-gray-200 
                           dark:border-gray-700 text-gray-700 dark:text-gray-300"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.type === 'user' ? 'justify-end' : 'justify-start'
                } animate-[fadeIn_0.3s_ease-in-out_forwards]`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {formatTime(msg.timestamp)}
                  </p>
                  {msg.type === 'bot' && (
                    <MessageFeedback 
                      messageId={msg.id}
                      onFeedbackSubmitted={() => {
                        // On pourrait ajouter une notification ou actualiser les stats
                        console.log('Feedback soumis pour le message:', msg.id);
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
            {error && (
              <div className="text-center text-red-500 dark:text-red-400">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Zone de saisie du message */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={toggleVoiceRecognition}
              className={`p-2 rounded-lg transition-colors ${
                isListening
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
              title={isListening ? 'Arrêter la dictée' : 'Dicter votre message'}
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
                       dark:border-gray-600 rounded-lg focus:outline-none 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                       dark:bg-gray-700 dark:text-white transition-colors"
            />
            
            <button
              type="submit"
              disabled={!message.trim() || loading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg 
                       hover:bg-blue-600 disabled:bg-gray-300 
                       dark:disabled:bg-gray-600 disabled:cursor-not-allowed 
                       transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Home;
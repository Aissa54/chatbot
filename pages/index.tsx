import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { 
  Send, Loader2, Moon, Sun, 
  Download, Mic, MicOff, Trash2
} from 'lucide-react';
import '../styles/globals.css';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface ChatbotResponse {
  text: string;
  error?: string;
}

const suggestedQuestions = [
  "Quelles sont les normes F-Gas ?",
  "Comment calculer la puissance frigorifique ?",
  "Quel est le prix d'une amende de classe 3 ?",
  "Quelles sont les obligations d'entretien ?"
];

export default function Home() {
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

  // Indique que nous sommes côté client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Charge l'historique depuis localStorage
  useEffect(() => {
    if (isClient) {
      const savedMessages = localStorage.getItem('chatHistory');
      const savedDarkMode = localStorage.getItem('darkMode');
      
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          setMessages(parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
          setShowSuggestions(parsedMessages.length === 0);
        } catch (e) {
          console.error('Erreur lors du chargement de l\'historique:', e);
        }
      }

      if (savedDarkMode) {
        setDarkMode(savedDarkMode === 'true');
      }
    }
  }, [isClient]);

  // Sauvegarde l'historique dans localStorage
  useEffect(() => {
    if (isClient && messages.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    }
  }, [messages, isClient]);

  // Gestion du mode sombre
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('darkMode', darkMode.toString());
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [darkMode, isClient]);

  // Initialisation de la reconnaissance vocale
  useEffect(() => {
    if (isClient && (window.SpeechRecognition || (window as any).webkitSpeechRecognition)) {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'fr-FR';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [isClient]);

  const handleSubmit = useCallback(async (event: React.FormEvent | Event, suggestedMessage?: string) => {
    event.preventDefault();
    const messageToSend = suggestedMessage || message;
    if (!messageToSend.trim()) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageToSend.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setMessage('');
    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageToSend }),
      });

      const data: ChatbotResponse = await res.json();
      if (!res.ok) throw new Error(data.error || 'Une erreur est survenue');

      const botResponse: Message = {
        id: Date.now().toString(),
        type: 'bot',
        content: data.text || 'Désolé, je n\'ai pas compris la question.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && message.trim()) {
        e.preventDefault();
        handleSubmit(new Event('submit'));
      }
      if (e.key === 'Escape') {
        setMessage('');
      }
    };

    if (isClient) {
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [message, isClient, handleSubmit]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    if (isClient) {
      localStorage.removeItem('chatHistory');
    }
    setShowSuggestions(true);
  };

  const exportHistory = () => {
    const exportData = messages.map(msg => ({
      type: msg.type,
      content: msg.content,
      timestamp: msg.timestamp
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatbot-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSuggestedQuestion = (question: string) => {
    setMessage(question);
    setShowSuggestions(false);
    handleSubmit(new Event('submit'), question);
  };

  if (!isClient) {
    return <div className="min-h-screen bg-gray-50"></div>;
  }

  return (
    <div className={`flex flex-col min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm py-4 px-6 fixed w-full top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Image
              src="/images/logo.png"
              alt="ColdBot Logo"
              width={32}
              height={32}
              className="object-contain"
            />
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              ColdBot - Spécialiste du froid
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearHistory}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Effacer l'historique"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={exportHistory}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Exporter l'historique"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Changer le thème"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Messages Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto mt-20 mb-24 px-4">
        <div className="space-y-4 py-4">
          {messages.length === 0 && showSuggestions ? (
            <div className="space-y-4">
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <p>Comment puis-je vous aider aujourd'hui ?</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="p-3 text-left text-sm bg-white dark:bg-gray-800 rounded-lg shadow-sm 
                             hover:shadow-md transition-shadow duration-200 border border-gray-200 
                             dark:border-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} 
                          opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start space-x-2">
                  {msg.type === 'bot' && (
                    <div className="flex-shrink-0 animate-[slideIn_0.3s_ease-in-out]">
                      <Image
                        src="/images/bot-avatar.png"
                        alt="Bot Avatar"
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 
                              ${msg.type === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm rounded-bl-none'
                      }
                              animate-[slideIn_0.3s_ease-in-out]`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {msg.type === 'user' && (
                    <div className="flex-shrink-0 animate-[slideIn_0.3s_ease-in-out]">
                      <Image
                        src="/images/user-avatar.png"
                        alt="User Avatar"
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start items-start space-x-2 animate-[fadeIn_0.3s_ease-in-out]">
              <div className="flex-shrink-0">
                <Image
                  src="/images/bot-avatar.png"
                  alt="Bot Avatar"
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 shadow-sm">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-center animate-[fadeIn_0.3s_ease-in-out]">
              <div className="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200 rounded-lg px-4 py-2">
                {error}
              </div>
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
        <div className="max-w-4xl mx-auto flex space-x-4">
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
          placeholder="Posez votre question... (Appuyez sur Entrée pour envoyer)"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                   dark:bg-gray-700 dark:text-white transition-colors"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg flex items-center space-x-2 
                   hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 
                   disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Envoyer</span>
            </>
          )}
        </button>
      </div>
    </form>
  </div>
);
}
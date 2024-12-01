// pages/admin/history.tsx
import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Search, Calendar, Users } from 'lucide-react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../hooks/useAuth';

// Types
interface Message {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  created_at: string;
  user: {
    email: string;
  };
}

interface Analytics {
  totalQuestions: number;
  questionsToday: number;
  topQuestions: Array<{
    question: string;
    count: number;
  }>;
  userStats: Array<{
    email: string;
    count: number;
  }>;
}

const History = () => {
  // États
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewAllUsers, setViewAllUsers] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Hooks
  const supabase = createClientComponentClient();
  const { session } = useAuth();

  // Vérifier si l'utilisateur est admin
  const isAdmin = session?.user?.email === 'aissa.moustaine@gmail.com';

  // Charger les messages
  const loadMessages = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('question_history')
        .select(`
          *,
          user:users (
            email
          )
        `)
        .order('created_at', { ascending: false });

      // Appliquer les filtres
      if (searchQuery) {
        query = query.or(`question.ilike.%${searchQuery}%,answer.ilike.%${searchQuery}%`);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }

      // Filtrer par utilisateur si ce n'est pas l'admin ou si l'admin ne veut pas tout voir
      if (!isAdmin || (isAdmin && !viewAllUsers)) {
        query = query.eq('user_id', session?.user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);

    } catch (error) {
      console.error('Erreur de chargement des messages:', error);
      alert("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  };

  // Charger les statistiques (admin uniquement)
  const loadAnalytics = async () => {
    if (!isAdmin) return;

    try {
      // Total des questions
      const { count: totalQuestions } = await supabase
        .from('question_history')
        .select('*', { count: 'exact' });

      // Questions aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      const { count: questionsToday } = await supabase
        .from('question_history')
        .select('*', { count: 'exact' })
        .gte('created_at', today);

      // Questions les plus fréquentes
      const { data: questions } = await supabase
        .from('question_history')
        .select('question')
        .order('created_at', { ascending: false });

      const questionCounts = questions?.reduce((acc: Record<string, number>, curr) => {
        acc[curr.question] = (acc[curr.question] || 0) + 1;
        return acc;
      }, {});

      const topQuestions = Object.entries(questionCounts || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([question, count]) => ({ question, count }));

      // Statistiques par utilisateur
      const { data: users } = await supabase
        .from('users')
        .select(`
          email,
          question_history (count)
        `);

      const userStats = users?.map(user => ({
        email: user.email,
        count: (user.question_history as any)?.length || 0
      }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5) || [];

      setAnalytics({
        totalQuestions: totalQuestions || 0,
        questionsToday: questionsToday || 0,
        topQuestions,
        userStats
      });

    } catch (error) {
      console.error('Erreur de chargement des statistiques:', error);
    }
  };

  // Charger les données au montage et lors des changements de filtres
  useEffect(() => {
    loadMessages();
    if (isAdmin) {
      loadAnalytics();
    }
  }, [searchQuery, startDate, endDate, viewAllUsers]);

  // Formatage de la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Export CSV
  const exportToCsv = () => {
    const csv = [
      ['Date', 'Utilisateur', 'Question', 'Réponse'],
      ...messages.map(message => [
        formatDate(message.created_at),
        message.user?.email || '',
        message.question.replace(/"/g, '""'),
        message.answer.replace(/"/g, '""')
      ])
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historique-conversations-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Rendu du composant
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link 
              href="/"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Historique des conversations</h1>
          </div>
          <div className="flex space-x-2">
            {isAdmin && (
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`px-4 py-2 rounded-lg ${
                  showAnalytics ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {showAnalytics ? 'Masquer statistiques' : 'Afficher statistiques'}
              </button>
            )}
            <button
              onClick={exportToCsv}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </button>
          </div>
        </div>
      </header>

      {/* Statistiques (admin uniquement) */}
      {isAdmin && showAnalytics && analytics && (
        <div className="max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Statistiques globales</h2>
              <div className="space-y-2">
                <p>Total des questions : {analytics.totalQuestions}</p>
                <p>Questions aujourd'hui : {analytics.questionsToday}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Top 5 questions</h2>
              <div className="space-y-2">
                {analytics.topQuestions.map((q, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium">{q.question.substring(0, 50)}...</p>
                    <p className="text-gray-500">{q.count} fois</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Utilisateurs actifs</h2>
              <div className="space-y-2">
                {analytics.userStats.map((user, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{user.email}</span>
                    <span>{user.count} questions</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />

            {isAdmin && (
              <button
                onClick={() => setViewAllUsers(!viewAllUsers)}
                className={`w-full p-2 rounded-lg flex items-center justify-center ${
                  viewAllUsers
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                {viewAllUsers ? 'Tous les utilisateurs' : 'Mes messages'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Liste des messages */}
      <div className="max-w-7xl mx-auto p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune conversation trouvée
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
              >
                <div className="mb-4">
                  <p className="text-sm text-gray-500">
                    {formatDate(message.created_at)}
                  </p>
                  <p className="text-sm text-blue-500">
                    {message.user?.email}
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">Question:</h3>
                    <p className="text-gray-700 dark:text-gray-300 ml-4">
                      {message.question}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Réponse:</h3>
                    <p className="text-gray-700 dark:text-gray-300 ml-4">
                      {message.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
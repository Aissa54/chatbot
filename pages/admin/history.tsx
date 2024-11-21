import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/router';
import { 
  Loader2, 
  ArrowLeft, 
  Trash2, 
  Download,
  Search,
  Calendar,
  User
} from 'lucide-react';

interface HistoryItem {
  id: number;
  user_id: string;
  question: string;
  repondre: string;
  created_at: string;
  users: {
    email: string;
  } | null;
  user_email?: string;
}

const HistoryPage = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [uniqueUsers, setUniqueUsers] = useState<string[]>([]);

  const router = useRouter();
  const supabase = createClientComponentClient();

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Vérifier si l'utilisateur est admin
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
      if (!adminEmails.includes(session.user.email || '')) {
        router.push('/');
        return;
      }

      // Récupérer l'historique avec les emails des utilisateurs
      const { data, error: historyError } = await supabase
        .from('question_history')
        .select(`
          id,
          user_id,
          question,
          repondre,
          created_at,
          users(email)
        `)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;

      // Transformation des données pour inclure l'email de l'utilisateur
      const formattedData = data?.map(item => ({
        ...item,
        user_email: item.users?.email || null
      })) || [];

      setHistory(formattedData);

      // Extraire les emails uniques pour le filtre
      const emails = [...new Set(formattedData.map(item => item.user_email))].filter(Boolean) as string[];
      setUniqueUsers(emails);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      console.error('Erreur lors de la récupération de l\'historique:', err);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;

    try {
      const { error } = await supabase
        .from('question_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression');
    }
  };

  const handleExport = () => {
    try {
      const filteredData = filterHistory();
      const csv = [
        ['Date', 'Utilisateur', 'Question', 'Réponse'],
        ...filteredData.map(item => [
          new Date(item.created_at).toLocaleString('fr-FR'),
          item.user_email || 'Inconnu',
          item.question,
          item.repondre
        ])
      ]
        .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `historique_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erreur lors de l\'export:', err);
      alert('Erreur lors de l\'export');
    }
  };

  const filterHistory = () => {
    return history.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.repondre.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDateRange = (!startDate || new Date(item.created_at) >= new Date(startDate)) &&
        (!endDate || new Date(item.created_at) <= new Date(endDate));

      const matchesUser = !userFilter || item.user_email === userFilter;

      return matchesSearch && matchesDateRange && matchesUser;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="flex items-center space-x-2 text-blue-500 hover:text-blue-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'accueil</span>
        </button>
      </div>
    );
  }

  const filteredHistory = filterHistory();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div className="flex items-center mb-4 sm:mb-0">
            <button
              onClick={() => router.push('/')}
              className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Historique des conversations
            </h1>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg 
                     hover:bg-blue-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exporter CSV</span>
          </button>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 
                           dark:text-white transition-colors"
                />
              </div>
            </div>

            {/* Filtre par utilisateur */}
            <div className="sm:w-64">
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 
                           dark:text-white transition-colors appearance-none"
                >
                  <option value="">Tous les utilisateurs</option>
                  {uniqueUsers.map((email) => (
                    <option key={email} value={email}>
                      {email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Filtres de date */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 
                           dark:text-white transition-colors"
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 
                           dark:text-white transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Liste des conversations */}
        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">Aucune conversation trouvée</p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(item.created_at)}
                    </p>
                    <p className="text-sm text-blue-500">
                      {item.user_email || 'Utilisateur inconnu'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Question:
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      {item.question}
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Réponse:
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      {item.repondre}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
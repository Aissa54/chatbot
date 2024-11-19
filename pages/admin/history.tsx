// pages/admin/history.tsx
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/router';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  Calendar,
  Download,
  Filter,
  Users,
  MessageSquare,
  BarChart2
} from 'lucide-react';

interface QuestionHistory {
  id: string;
  user_id: string;
  question: string;
  repondre: string;
  created_at: string;
  user: {
    Messagerie_electroni: string;
  }
}

interface Stats {
  totalQuestions: number;
  totalUsers: number;
  averageQuestionsPerUser: number;
  questionsPerDay: { date: string; count: number }[];
  topQuestions: { question: string; count: number }[];
}

export default function HistoryAdmin() {
  const [history, setHistory] = useState<QuestionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dateRange, setDateRange] = useState<{start: string; end: string}>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [userFilter, setUserFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const router = useRouter();
  const supabase = createClientComponentClient();

  // Couleurs pour les graphiques
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const fetchData = async () => {
    try {
      // Récupérer l'historique filtré
      let query = supabase
        .from('question_history')
        .select(`
          *,
          user:Utilisateurs(Messagerie_electroni)
        `)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: false });

      if (userFilter) {
        query = query.eq('user_id', userFilter);
      }

      if (searchTerm) {
        query = query.or(`question.ilike.%${searchTerm}%,repondre.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setHistory(data || []);

      // Calculer les statistiques
      const statsData: Stats = {
        totalQuestions: data?.length || 0,
        totalUsers: new Set(data?.map(item => item.user_id)).size,
        averageQuestionsPerUser: (data?.length || 0) / (new Set(data?.map(item => item.user_id)).size || 1),
        questionsPerDay: Object.entries(
          (data || []).reduce((acc: {[key: string]: number}, item) => {
            const date = new Date(item.created_at).toLocaleDateString();
            acc[date] = (acc[date] || 0) + 1;
            return acc;
          }, {})
        ).map(([date, count]) => ({ date, count })),
        topQuestions: Object.entries(
          (data || []).reduce((acc: {[key: string]: number}, item) => {
            acc[item.question] = (acc[item.question] || 0) + 1;
            return acc;
          }, {})
        )
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([question, count]) => ({ question, count }))
      };
      setStats(statsData);

    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, userFilter, searchTerm]);

  // Export CSV
  const exportCSV = () => {
    const headers = ['Date', 'Utilisateur', 'Question', 'Réponse'];
    const data = history.map(item => [
      new Date(item.created_at).toLocaleString('fr-FR'),
      item.user?.Messagerie_electroni,
      item.question,
      item.repondre
    ]);
    
    const csvContent = [headers, ...data]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `coldbot-history-${new Date().toISOString()}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* En-tête avec stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center space-x-2">
            <MessageSquare className="text-blue-500" />
            <span className="text-gray-500">Questions totales</span>
          </div>
          <div className="text-2xl font-bold mt-2">{stats?.totalQuestions}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center space-x-2">
            <Users className="text-green-500" />
            <span className="text-gray-500">Utilisateurs actifs</span>
          </div>
          <div className="text-2xl font-bold mt-2">{stats?.totalUsers}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center space-x-2">
            <BarChart2 className="text-purple-500" />
            <span className="text-gray-500">Moy. questions/utilisateur</span>
          </div>
          <div className="text-2xl font-bold mt-2">
            {stats?.averageQuestionsPerUser.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-8">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date début
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date fin
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rechercher
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="border rounded p-2"
            />
          </div>
          <div className="flex-1 flex justify-end items-end">
            <button
              onClick={exportCSV}
              className="bg-green-500 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-green-600"
            >
              <Download className="w-4 h-4" />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Questions par jour */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Questions par jour</h3>
          <BarChart width={500} height={300} data={stats?.questionsPerDay}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#0088FE" />
          </BarChart>
        </div>

        {/* Top questions */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Questions les plus fréquentes</h3>
          <PieChart width={500} height={300}>
            <Pie
              data={stats?.topQuestions}
              dataKey="count"
              nameKey="question"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {stats?.topQuestions.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
      </div>

      {/* Table des questions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Utilisateur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Question
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Réponse
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
            {history.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(item.created_at).toLocaleString('fr-FR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {item.user?.Messagerie_electroni || 'Anonyme'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {item.question}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {item.repondre}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
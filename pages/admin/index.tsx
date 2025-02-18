import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ArrowLeft, Users, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';

// Types
import type { 
  QuestionHistory, 
  MessageFeedback, 
  UserProfile,
  Conversation 
} from '@/types/index.ts';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  totalQuestions: number;
  feedbackStats: {
    positive: number;
    negative: number;
    reasons: Record<string, number>;
  };
  userActivity: {
    date: string;
    count: number;
  }[];
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email || 
            session.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',')[0]) {
          router.push('/');
          return;
        }
        loadStats();
      } catch (error) {
        console.error('Erreur vérification admin:', error);
        router.push('/');
      }
    };

    checkAdmin();
  }, [router, supabase]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Charger les utilisateurs
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('*');
      if (usersError) throw usersError;

      // Charger les conversations
      const { data: conversations, error: convsError } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });
      if (convsError) throw convsError;

      // Charger les questions
      const { data: questions, error: questionsError } = await supabase
        .from('question_history')
        .select('*')
        .order('created_at', { ascending: false });
      if (questionsError) throw questionsError;

      // Charger les feedbacks
      const { data: feedbacks, error: feedbackError } = await supabase
        .from('message_feedback')
        .select('*');
      if (feedbackError) throw feedbackError;

      // Calculer les statistiques
      const activeUsers = users?.filter(u => 
        u.last_seen && new Date(u.last_seen) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length || 0;

      const feedbackStats = {
        positive: feedbacks?.filter(f => f.is_positive).length || 0,
        negative: feedbacks?.filter(f => !f.is_positive).length || 0,
        reasons: feedbacks?.reduce((acc, f) => {
          if (f.reason) {
            acc[f.reason] = (acc[f.reason] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>) || {}
      };

      // Calculer l'activité des utilisateurs par jour
      const lastWeekActivity = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        return {
          date: dateStr,
          count: questions?.filter(q => 
            q.created_at.startsWith(dateStr)
          ).length || 0
        };
      }).reverse();

      setStats({
        totalUsers: users?.length || 0,
        activeUsers,
        totalConversations: conversations?.length || 0,
        totalQuestions: questions?.length || 0,
        feedbackStats,
        userActivity: lastWeekActivity
      });

    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="flex items-center space-x-2 text-blue-500 hover:text-blue-600"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour à l'accueil</span>
        </button>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tableau de bord administrateur
          </h1>
          <button
            onClick={() => router.push('/')}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 
                     hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </button>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Utilisateurs totaux
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats?.totalUsers}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Utilisateurs actifs (7j)
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats?.activeUsers}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Conversations totales
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats?.totalConversations}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Retours positifs
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats?.feedbackStats.positive}
                </p>
              </div>
              <ThumbsUp className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Feedback Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">
              Distribution des retours
            </h2>
            {stats && (
              <PieChart width={400} height={300}>
                <Pie
                  data={[
                    { name: 'Positifs', value: stats.feedbackStats.positive },
                    { name: 'Négatifs', value: stats.feedbackStats.negative }
                  ]}
                  cx={200}
                  cy={150}
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.feedbackStats.reasons && Object.entries(stats.feedbackStats.reasons).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            )}
          </div>

          {/* User Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">
              Activité des utilisateurs (7 derniers jours)
            </h2>
            {stats && (
              <BarChart
                width={400}
                height={300}
                data={stats.userActivity}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Questions" />
              </BarChart>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

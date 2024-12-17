import { useState, useEffect } from 'react';
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

interface FeedbackStats {
  positiveCount: number;
  negativeCount: number;
  reasonBreakdown: {
    [key: string]: number;
  };
  totalResponses: number;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  averageMessagesPerUser: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AdminDashboard = () => {
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClientComponentClient();

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Charger les statistiques de feedback
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('message_feedback')
          .select('*');

        if (feedbackError) throw feedbackError;

        const stats: FeedbackStats = {
          positiveCount: feedbackData.filter(f => f.isPositive).length,
          negativeCount: feedbackData.filter(f => !f.isPositive).length,
          reasonBreakdown: feedbackData.reduce((acc, feedback) => {
            if (feedback.reason) {
              acc[feedback.reason] = (acc[feedback.reason] || 0) + 1;
            }
            return acc;
          }, {} as { [key: string]: number }),
          totalResponses: feedbackData.length
        };

        setFeedbackStats(stats);

        // Charger les statistiques utilisateurs
        const { data: userData, error: userError } = await supabase
          .from('users_profiles')
          .select('*');

        if (userError) throw userError;

        const { data: conversationData, error: convError } = await supabase
          .from('conversations')
          .select('*');

        if (convError) throw convError;

        const userStatsData: UserStats = {
          totalUsers: userData.length,
          activeUsers: userData.filter(u => u.last_seen && 
            new Date(u.last_seen).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length,
          totalConversations: conversationData.length,
          averageMessagesPerUser: conversationData.length / (userData.length || 1)
        };

        setUserStats(userStatsData);

      } catch (error) {
        console.error('Erreur chargement statistiques:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const feedbackPieData = feedbackStats ? [
    { name: 'Positif', value: feedbackStats.positiveCount },
    { name: 'Négatif', value: feedbackStats.negativeCount }
  ] : [];

  const reasonBarData = feedbackStats ? 
    Object.entries(feedbackStats.reasonBreakdown).map(([key, value]) => ({
      name: key,
      count: value
    })) : [];

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-8">Tableau de bord</h1>

      {/* Statistiques générales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Utilisateurs total</h3>
          <p className="text-3xl font-bold text-blue-500">
            {userStats?.totalUsers || 0}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Utilisateurs actifs (7j)</h3>
          <p className="text-3xl font-bold text-green-500">
            {userStats?.activeUsers || 0}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Total conversations</h3>
          <p className="text-3xl font-bold text-purple-500">
            {userStats?.totalConversations || 0}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Messages par utilisateur</h3>
          <p className="text-3xl font-bold text-orange-500">
            {userStats?.averageMessagesPerUser.toFixed(1) || 0}
          </p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Distribution des retours */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Distribution des retours</h3>
          <div className="h-80">
            <PieChart width={400} height={300}>
              <Pie
                data={feedbackPieData}
                cx={200}
                cy={150}
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label
              >
                {feedbackPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </div>
        </div>

        {/* Raisons des retours négatifs */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Raisons des retours négatifs</h3>
          <div className="h-80">
            <BarChart
              width={500}
              height={300}
              data={reasonBarData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
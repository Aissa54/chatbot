import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { message } = req.body;
    try {
      const response = await fetch('https://flowiseai-railway-production-1649.up.railway.app/api/v1/prediction/f0f32691-94d8-4083-9407-9b447062a718', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from('COLDORG:Test_BOT*007!').toString('base64'),
          'Origin': 'https://chatbot-j5vmjxbff-aisas-projects.vercel.app',
        },
        body: JSON.stringify({ question: message }),
      });

      const data = await response.json();
      console.log('Réponse de Flowise:', data);

      // Modification ici pour renvoyer directement la réponse de Flowise
      res.status(200).json(data);
    } catch (error) {
      console.error('Erreur lors de la communication avec Flowise:', error);
      res.status(500).json({ error: 'Erreur lors de la communication avec Flowise' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Méthode ${req.method} non autorisée`);
  }
}
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { message } = req.body;

    try {
      const response = await fetch('https://flowiseai-railway-production-1649.up.railway.app/api/v1/prediction/f0f32691-94d8-4083-9407-9b447062a718', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from('COLDORG:Test_BOT*007!').toString('base64'), // Remplacez par vos identifiants encodés en base64
          'Origin': 'http://localhost:3000',
        },
        body: JSON.stringify({ question: message }), // Envoyer la question en format JSON
      });

      const data = await response.json();
      res.status(200).json({ reply: data.reply || 'Aucune réponse disponible' });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la communication avec Flowise' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Méthode ${req.method} non autorisée`);
  }
}

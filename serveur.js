const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Chemin ABSOLU vers le dossier public
const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir));

// Chemin ABSOLU vers les fichiers de données (adapté pour Windows)
const dataDir = path.join(process.cwd(), 'data');
const articlesFile = path.join(dataDir, 'articles.json');

// Créer le dossier data s'il n'existe pas
async function initDataDirectory() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    console.log(`Dossier data créé: ${dataDir}`);
    
    // Vérifier/créer le fichier articles.json
    try {
      await fs.access(articlesFile);
      console.log('Fichier articles.json existe déjà');
    } catch {
      const initialData = [
        // Vos articles initiaux ici
        {
          "title": "La diaspora guinéenne soutient la candidature de Mamadi Doumbouya",
          "summary": "À Bruxelles, la diaspora guinéenne s'est mobilisée...",
          "date": "2025-05-29",
          "category": "politique",
          "image": "/images/doumbouya.jpg"
        }
      ];
      await fs.writeFile(articlesFile, JSON.stringify(initialData, null, 2));
      console.log('Fichier articles.json créé avec données initiales');
    }
  } catch (err) {
    console.error('Erreur initialisation:', err);
    process.exit(1);
  }
}

// Route pour récupérer les articles
app.get('/articles', async (req, res) => {
  console.log(`Tentative de lecture depuis: ${articlesFile}`);
  
  try {
    const data = await fs.readFile(articlesFile, 'utf8');
    console.log('Données lues:', data.substring(0, 100) + '...'); // Log partiel
    const articles = JSON.parse(data);
    res.json(articles);
  } catch (err) {
    console.error('Erreur complète:', err);
    res.status(500).json({ 
      error: 'Erreur de chargement',
      details: {
        path: articlesFile,
        currentDir: process.cwd(),
        error: err.message
      }
    });
  }
});

// Démarrer le serveur
initDataDirectory().then(() => {
  app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
    console.log('Dossier courant:', process.cwd());
    console.log('Chemin des données:', dataDir);
    console.log('Structure recommandée:');
    console.log(`
      ${process.cwd()}
      ├── data/
      │   └── articles.json
      ├── public/
      │   └── images/
      └── serveur.js
    `);
  });
});
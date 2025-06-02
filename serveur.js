const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fichiers de données avec chemins absolus
const articlesFile = path.join(__dirname, 'articles.json');
const usersFile = path.join(__dirname, 'users.json');

// Configuration de multer pour le téléchargement d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'images'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (/\.(jpg|jpeg|png|gif)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers .jpg, .jpeg, .png et .gif sont autorisés'));
    }
  }
});

// Initialiser les fichiers JSON
async function initFiles() {
  try {
    await fs.access(articlesFile);
    console.log('articles.json existe');
  } catch {
    console.log('Création de articles.json');
    await fs.writeFile(articlesFile, JSON.stringify([]));
  }
  try {
    await fs.access(usersFile);
    console.log('users.json existe');
  } catch {
    console.log('Création de users.json');
    const defaultUser = [{
      username: 'admin',
      password: 'admin123'
    }];
    await fs.writeFile(usersFile, JSON.stringify(defaultUser));
  }
}

initFiles().catch(err => {
  console.error('Erreur lors de l\'initialisation:', err);
});

// Middleware d'authentification basique
function authenticate(req, res, next) {
  const { username, password } = req.body;
  
  fs.readFile(usersFile, 'utf8')
    .then(data => {
      const users = JSON.parse(data);
      const user = users.find(u => u.username === username && u.password === password);
      if (!user) {
        return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });
      }
      next();
    })
    .catch(err => {
      res.status(500).json({ error: 'Erreur serveur' });
    });
}

// Route de connexion simplifiée
app.post('/login', authenticate, (req, res) => {
  res.json({ message: 'Connexion réussie' });
});

// Récupérer tous les articles
app.get('/articles', async (req, res) => {
  try {
    const data = await fs.readFile(articlesFile, 'utf8');
    const articles = JSON.parse(data);
    res.json(articles);
  } catch (error) {
    console.error('Erreur lecture articles:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des articles' });
  }
});

// Ajouter un nouvel article avec image (protégé par authentification basique)
app.post('/articles', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { title, summary, date, category } = req.body;
    if (!title || !summary || !date || !category || !req.file) {
      return res.status(400).json({ error: 'Tous les champs sont requis, y compris l\'image' });
    }
    
    const image = `/images/${req.file.filename}`;
    const data = await fs.readFile(articlesFile, 'utf8');
    const articles = JSON.parse(data);
    articles.push({ title, summary, date, category, image });
    
    await fs.writeFile(articlesFile, JSON.stringify(articles, null, 2));
    res.json({ message: 'Article ajouté' });
  } catch (error) {
    console.error('Erreur ajout article:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'article' });
  }
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
  console.log('Répertoire courant:', process.cwd());
});
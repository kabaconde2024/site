const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Clé secrète pour JWT
const JWT_SECRET = 'votre_cle_secrete_tres_securisee_1234567890'; // Changez en production

// Fichiers de données
const articlesFile = 'articles.json';
const usersFile = 'users.json';

// Configuration de multer pour le téléchargement d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images');
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
  } catch {
    await fs.writeFile(articlesFile, JSON.stringify([]));
  }
  try {
    await fs.access(usersFile);
  } catch {
    const defaultUser = [{
      username: 'admin',
      password: 'admin123'
    }];
    await fs.writeFile(usersFile, JSON.stringify(defaultUser));
  }
}
initFiles();

// Middleware pour vérifier le token JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Accès non autorisé' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalide' });
    req.user = user;
    next();
  });
}

// Route de connexion
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const data = await fs.readFile(usersFile, 'utf8');
    const users = JSON.parse(data);
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour vérifier le token
app.get('/verify-token', authenticateToken, (req, res) => {
  res.json({ valid: true });
});

// Récupérer tous les articles
app.get('/articles', async (req, res) => {
  try {
    const data = await fs.readFile(articlesFile, 'utf8');
    const articles = JSON.parse(data);
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la lecture des articles' });
  }
});

// Ajouter un nouvel article avec image (protégé)
app.post('/articles', authenticateToken, upload.single('image'), async (req, res) => {
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
    res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'article' });
  }
});

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
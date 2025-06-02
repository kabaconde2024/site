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

// Chemins absolus des fichiers
const dataDir = path.join(__dirname, 'data');
const articlesFile = path.join(dataDir, 'articles.json');
const usersFile = path.join(dataDir, 'users.json');

// Créer le répertoire data s'il n'existe pas
async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    console.log(`Répertoire data créé à: ${dataDir}`);
  } catch (err) {
    console.error('Erreur création répertoire data:', err);
  }
}

// Configuration multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'images');
    fs.mkdir(uploadDir, { recursive: true })
      .then(() => cb(null, uploadDir))
      .catch(err => cb(err));
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
      cb(new Error('Seuls les fichiers image sont autorisés'));
    }
  }
});

// Initialisation des fichiers
async function initFiles() {
  await ensureDataDir();
  
  try {
    await fs.access(articlesFile);
    console.log('Fichier articles.json existe');
  } catch {
    console.log('Création de articles.json');
    await fs.writeFile(articlesFile, JSON.stringify([], null, 2));
  }
  
  try {
    await fs.access(usersFile);
    console.log('Fichier users.json existe');
  } catch {
    console.log('Création de users.json');
    await fs.writeFile(usersFile, JSON.stringify([
      { username: 'admin', password: 'admin123' }
    ], null, 2));
  }
}

// Middleware d'authentification
async function authenticate(req, res, next) {
  try {
    const { username, password } = req.body;
    const users = JSON.parse(await fs.readFile(usersFile, 'utf8'));
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    next();
  } catch (err) {
    console.error('Erreur authentification:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Routes
app.post('/login', authenticate, (req, res) => {
  res.json({ message: 'Connexion réussie' });
});

app.get('/articles', async (req, res) => {
  try {
    const data = await fs.readFile(articlesFile, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    console.error('Erreur GET /articles:', err);
    res.status(500).json({ 
      error: 'Erreur de chargement des articles',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.post('/articles', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { title, summary, date, category } = req.body;
    
    if (!title || !summary || !date || !category || !req.file) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    const articles = JSON.parse(await fs.readFile(articlesFile, 'utf8'));
    const newArticle = {
      title,
      summary,
      date,
      category,
      image: `/images/${req.file.filename}`
    };

    articles.push(newArticle);
    await fs.writeFile(articlesFile, JSON.stringify(articles, null, 2));
    
    res.status(201).json(newArticle);
  } catch (err) {
    console.error('Erreur POST /articles:', err);
    res.status(500).json({ 
      error: "Erreur lors de l'ajout de l'article",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Démarrer le serveur
initFiles()
  .then(() => {
    app.listen(port, () => {
      console.log(`Serveur démarré sur http://localhost:${port}`);
      console.log('Répertoire data:', dataDir);
    });
  })
  .catch(err => {
    console.error('Échec de l\'initialisation:', err);
    process.exit(1);
  });
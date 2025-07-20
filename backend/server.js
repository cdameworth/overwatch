const express = require('express');
const { parseTerraform, parseMultipleTerraform } = require('./terraform-parser');
const { parseMultipleTerraformFromGitHub } = require('./terraform-github-parser');
const { inferDependencies } = require('./dependency-engine');
const GitHubService = require('./github-service');
const AuthService = require('./auth-service');
const low = require('lowdb');
const path = require('path');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
require('dotenv').config();

// Debug: log before requiring FileSync
console.log('About to require lowdb/adapters/FileSync');
let FileSync;
try {
  FileSync = require('lowdb/adapters/FileSync');
  console.log('FileSync after require:', FileSync);
} catch (e) {
  console.error('Error requiring lowdb/adapters/FileSync:', e);
}

// Debug logging
const dbPath = path.join(__dirname, 'db.json');
console.log('dbPath:', dbPath);
const adapter = new FileSync(dbPath);
const db = low(adapter);
db.defaults({ maps: [], users: [], repositories: [], apps: [] }).write();

// Initialize auth service
const authService = new AuthService(db);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Authentication Routes (only if auth is enabled)
if (authService.authEnabled) {
  app.get('/auth/github', passport.authenticate('github', { scope: ['repo', 'user:email'] }));

  app.get('/auth/github/callback', 
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res) => {
      const token = authService.generateJWT(req.user);
      res.redirect(`http://localhost:3000?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: req.user.id,
        username: req.user.profile.username,
        displayName: req.user.profile.displayName,
        avatarUrl: req.user.profile.avatarUrl
      }))}`);
    }
  );

  app.post('/auth/login', async (req, res) => {
    const { githubToken } = req.body;
    
    if (!githubToken) {
      return res.status(400).json({ error: 'GitHub token is required' });
    }

    try {
      const githubUser = await authService.validateGitHubToken(githubToken);
      const user = await authService.findOrCreateUser({
        id: githubUser.id,
        username: githubUser.login,
        displayName: githubUser.name,
        emails: githubUser.email ? [{ value: githubUser.email }] : [],
        photos: githubUser.avatar_url ? [{ value: githubUser.avatar_url }] : []
      }, githubToken);

      const token = authService.generateJWT(user);
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.profile.username,
          displayName: user.profile.displayName,
          avatarUrl: user.profile.avatarUrl
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ error: 'Invalid GitHub token' });
    }
  });

  app.get('/auth/me', authService.requireAuth.bind(authService), (req, res) => {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.profile.username,
        displayName: req.user.profile.displayName,
        avatarUrl: req.user.profile.avatarUrl
      }
    });
  });

  app.post('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });
} else {
  console.log('Authentication disabled - GitHub OAuth credentials not provided');
}

// GitHub Integration Endpoints (Protected)
app.post('/api/github/repositories', authService.requireAuth.bind(authService), async (req, res) => {
  const userId = req.user.id;
  const accessToken = req.user.accessToken;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token is required' });
  }
  
  try {
    const githubService = new GitHubService(accessToken);
    const repositories = await githubService.getRepositories(userId);
    
    // Store user and repositories in database
    const user = db.get('users').find({ id: userId }).value();
    if (!user) {
      db.get('users').push({ 
        id: userId, 
        accessToken, 
        repositories: repositories.map(r => r.id),
        createdAt: new Date().toISOString() 
      }).write();
    } else {
      db.get('users').find({ id: userId }).assign({ 
        accessToken, 
        repositories: repositories.map(r => r.id),
        updatedAt: new Date().toISOString() 
      }).write();
    }
    
    // Store repositories
    repositories.forEach(repo => {
      const existingRepo = db.get('repositories').find({ id: repo.id }).value();
      if (!existingRepo) {
        db.get('repositories').push({ ...repo, userId, syncedAt: null }).write();
      } else {
        db.get('repositories').find({ id: repo.id }).assign({ ...repo, userId }).write();
      }
    });
    
    res.json({ repositories });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories', details: error.message });
  }
});

app.post('/api/github/sync', authService.requireAuth.bind(authService), async (req, res) => {
  const { repositoryId, owner, repo, branch = 'main' } = req.body;
  const userId = req.user.id;
  const accessToken = req.user.accessToken;
  
  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }
  
  try {
    const githubService = new GitHubService(accessToken);
    const syncResult = await githubService.syncRepository(userId, owner, repo, branch);
    
    if (!syncResult.success) {
      return res.status(400).json({ error: syncResult.message });
    }
    
    // Parse Terraform files from GitHub
    const parsedApps = await parseMultipleTerraformFromGitHub(syncResult);
    
    // Store apps in database
    parsedApps.forEach(app => {
      const existingApp = db.get('apps').find({ id: app.id }).value();
      if (!existingApp) {
        db.get('apps').push({ ...app, userId }).write();
      } else {
        db.get('apps').find({ id: app.id }).assign({ ...app, userId }).write();
      }
    });
    
    // Update repository sync status
    db.get('repositories').find({ id: repositoryId }).assign({ 
      syncedAt: new Date().toISOString(),
      appCount: parsedApps.length 
    }).write();
    
    res.json({ 
      success: true, 
      apps: parsedApps,
      repository: syncResult.repository 
    });
  } catch (error) {
    console.error('Error syncing repository:', error);
    res.status(500).json({ error: 'Failed to sync repository', details: error.message });
  }
});

app.get('/api/github/apps', authService.requireAuth.bind(authService), async (req, res) => {
  const userId = req.user.id;
  
  try {
    const apps = db.get('apps').filter({ userId }).value();
    
    // Prepare data for visualization
    const mergedResources = { resource: {} };
    const resourceGroupMap = {};
    const appList = [];
    
    apps.forEach(app => {
      if (app.error) return;
      
      appList.push({ id: app.id, name: app.name, repository: app.repository });
      
      for (const [type, resources] of Object.entries(app.resources)) {
        if (!mergedResources.resource[type]) mergedResources.resource[type] = {};
        for (const [name, config] of Object.entries(resources)) {
          mergedResources.resource[type][name] = config;
          resourceGroupMap[`${type}.${name}`] = { 
            appId: app.id, 
            appName: app.name,
            repository: app.repository 
          };
        }
      }
    });
    
    const dependencies = inferDependencies(mergedResources);
    
    res.json({
      resources: mergedResources,
      dependencies,
      groups: resourceGroupMap,
      apps: appList
    });
  } catch (error) {
    console.error('Error fetching user apps:', error);
    res.status(500).json({ error: 'Failed to fetch user apps', details: error.message });
  }
});

app.get('/api/parse', async (req, res) => {
  const tfPaths = [
    path.join(__dirname, 'data', 'example.tf'),
    path.join(__dirname, 'data', 'example2.tf'),
  ];
  const appNames = ['App 1', 'App 2'];
  const appIds = ['app1', 'app2'];
  console.log('Parsing Terraform files at:', tfPaths);
  try {
    // Parse each app separately
    const parsedApps = await Promise.all(tfPaths.map(parseTerraform));
    // Store each app in the db with name and id
    const appEntries = parsedApps.map((parsed, i) => ({
      id: appIds[i],
      name: appNames[i],
      resources: parsed.resource || {},
    }));
    // Save/replace apps in db
    db.set('apps', appEntries).write();

    // Merge resources for dependency analysis
    const merged = parsedApps.reduce((acc, parsed) => {
      if (!parsed.resource) return acc;
      for (const [type, resources] of Object.entries(parsed.resource)) {
        if (!acc.resource[type]) acc.resource[type] = {};
        for (const [name, config] of Object.entries(resources)) {
          acc.resource[type][name] = config;
        }
      }
      return acc;
    }, { resource: {} });

    // Map resource type/name to app id and name
    const resourceGroupMap = {};
    parsedApps.forEach((parsed, i) => {
      if (!parsed.resource) return;
      for (const [type, resources] of Object.entries(parsed.resource)) {
        for (const name of Object.keys(resources)) {
          resourceGroupMap[`${type}.${name}`] = { appId: appIds[i], appName: appNames[i] };
        }
      }
    });
    const deps = inferDependencies(merged);
    res.json({
      resources: merged,
      dependencies: deps,
      groups: resourceGroupMap,
      apps: appEntries.map(a => ({ id: a.id, name: a.name }))
    });
  } catch (err) {
    console.error('Error in /api/parse:', err);
    res.status(500).json({ error: 'Failed to parse Terraform files', details: err.message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend running at http://localhost:${port}`));

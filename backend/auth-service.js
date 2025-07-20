const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthService {
  constructor(db) {
    this.db = db;
    this.authEnabled = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    this.setupPassport();
  }

  setupPassport() {
    // Only setup GitHub strategy if credentials are provided
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:4000/auth/github/callback"
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await this.findOrCreateUser(profile, accessToken);
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }));
    } else {
      console.warn('GitHub OAuth credentials not provided. Authentication features will be disabled.');
    }

    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
      try {
        const user = this.db.get('users').find({ id }).value();
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  async findOrCreateUser(profile, accessToken) {
    const existingUser = this.db.get('users').find({ githubId: profile.id }).value();
    
    if (existingUser) {
      // Update access token
      this.db.get('users')
        .find({ githubId: profile.id })
        .assign({ 
          accessToken,
          lastLogin: new Date().toISOString(),
          profile: {
            username: profile.username,
            displayName: profile.displayName,
            email: profile.emails?.[0]?.value,
            avatarUrl: profile.photos?.[0]?.value
          }
        })
        .write();
      return this.db.get('users').find({ githubId: profile.id }).value();
    }

    // Create new user
    const newUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      githubId: profile.id,
      accessToken,
      profile: {
        username: profile.username,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value,
        avatarUrl: profile.photos?.[0]?.value
      },
      repositories: [],
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    this.db.get('users').push(newUser).write();
    return newUser;
  }

  generateJWT(user) {
    return jwt.sign(
      { 
        userId: user.id, 
        githubId: user.githubId,
        username: user.profile.username 
      },
      process.env.SESSION_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );
  }

  verifyJWT(token) {
    try {
      return jwt.verify(token, process.env.SESSION_SECRET || 'fallback_secret');
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  requireAuth(req, res, next) {
    // If auth is disabled, create a default user and continue
    if (!this.authEnabled) {
      req.user = {
        id: 'default-user',
        accessToken: process.env.GITHUB_ACCESS_TOKEN || '',
        profile: {
          username: 'default',
          displayName: 'Default User',
          email: 'default@example.com'
        }
      };
      return next();
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      const decoded = this.verifyJWT(token);
      const user = this.db.get('users').find({ id: decoded.userId }).value();
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  async validateGitHubToken(accessToken) {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'User-Agent': 'AWS-App-Visualizer'
        }
      });

      if (!response.ok) {
        throw new Error('Invalid GitHub token');
      }

      return await response.json();
    } catch (error) {
      throw new Error('Failed to validate GitHub token');
    }
  }
}

module.exports = AuthService;
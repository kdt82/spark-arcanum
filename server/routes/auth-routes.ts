
import type { Express, Request, Response } from "express";
import { AuthService } from "../auth/auth-service";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Middleware to validate session
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: Function) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.sessionToken;
    
    if (!sessionToken) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const user = await AuthService.validateSession(sessionToken);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

// Optional auth middleware - doesn't fail if no auth
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: Function) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.sessionToken;
    
    if (sessionToken) {
      const user = await AuthService.validateSession(sessionToken);
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue without auth
  }
};

export function registerAuthRoutes(app: Express): void {
  // Password reset routes
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const result = await AuthService.requestPasswordReset(email, baseUrl);
      
      res.json(result);
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ success: false, error: 'Token and password are required' });
      }

      const result = await AuthService.resetPassword(token, password);
      
      res.json(result);
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Register new user
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username, email, and password are required'
        });
      }

      const result = await AuthService.registerUser({ username, email, password });

      if (result.success && result.sessionToken) {
        // Set session cookie
        res.cookie('sessionToken', result.sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        return res.status(201).json({
          success: true,
          user: {
            id: result.user?.id,
            username: result.user?.username,
            email: result.user?.email,
            createdAt: result.user?.createdAt
          },
          sessionToken: result.sessionToken
        });
      }

      return res.status(400).json(result);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, error: 'Registration failed' });
    }
  });

  // Login user
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { usernameOrEmail, password } = req.body;

      if (!usernameOrEmail || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username/email and password are required'
        });
      }

      const result = await AuthService.loginUser({ usernameOrEmail, password });

      if (result.success && result.sessionToken) {
        // Set session cookie
        res.cookie('sessionToken', result.sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        return res.json({
          success: true,
          user: {
            id: result.user?.id,
            username: result.user?.username,
            email: result.user?.email,
            createdAt: result.user?.createdAt
          },
          sessionToken: result.sessionToken
        });
      }

      return res.status(401).json(result);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, error: 'Login failed' });
    }
  });

  // Logout user
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.sessionToken;

      if (sessionToken) {
        await AuthService.logoutUser(sessionToken);
      }

      res.clearCookie('sessionToken');
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ success: false, error: 'Logout failed' });
    }
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json({
        success: true,
        user: {
          id: req.user?.id,
          username: req.user?.username,
          email: req.user?.email,
          createdAt: req.user?.createdAt
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ success: false, error: 'Failed to get user info' });
    }
  });

  // Request password reset
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const result = await AuthService.requestPasswordReset(email, baseUrl);
      res.json(result);
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ success: false, error: 'Failed to process reset request' });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token and new password are required'
        });
      }

      const result = await AuthService.resetPassword(token, newPassword);
      res.json(result);
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
  });
}

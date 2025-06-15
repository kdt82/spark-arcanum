import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';

const router = express.Router();

// In a real production app, this would be stored in a database
// For this demo, we'll use a hardcoded credential
const ADMIN_USERNAME = 'admin';
// This is a hashed version of a password (you would use a secure password in production)
const ADMIN_PASSWORD_HASH = '$2b$10$OuMZPNLK.iPjwxHWWH1P4.QoDyOJBoKJ5d3H8TtUl0ixeG0KFzCbS'; // Hash for "magicrulings123"

// Endpoint for admin login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    
    // Check username
    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Check password using bcrypt
    const passwordMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // If credentials are valid, send success response
    return res.status(200).json({ 
      success: true, 
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Error during admin login:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
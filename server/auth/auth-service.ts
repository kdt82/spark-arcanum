
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../db';
import { users, userSessions, passwordResetTokens, type User, type UserSession, type InsertPasswordResetToken } from '@shared/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { emailService } from '../email-service';

interface RegisterUserData {
  username: string;
  email: string;
  password: string;
}

interface LoginData {
  usernameOrEmail: string;
  password: string;
}

interface AuthResult {
  success: boolean;
  user?: User;
  sessionToken?: string;
  error?: string;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

  static async registerUser(data: RegisterUserData): Promise<AuthResult> {
    try {
      // Validate input
      if (!data.username || data.username.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters long' };
      }

      if (!data.email || !this.isValidEmail(data.email)) {
        return { success: false, error: 'Please provide a valid email address' };
      }

      if (!data.password || data.password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long' };
      }

      // Check if username or email already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, data.username.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        return { success: false, error: 'Username already exists' };
      }

      const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email.toLowerCase()))
        .limit(1);

      if (existingEmail.length > 0) {
        return { success: false, error: 'Email already registered' };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          username: data.username.toLowerCase(),
          email: data.email.toLowerCase(),
          passwordHash,
        })
        .returning();

      // Create session
      const sessionToken = await this.createSession(newUser.id);

      return {
        success: true,
        user: newUser,
        sessionToken,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  }

  static async loginUser(data: LoginData): Promise<AuthResult> {
    try {
      // Find user by username or email
      const user = await db
        .select()
        .from(users)
        .where(eq(users.username, data.usernameOrEmail.toLowerCase()))
        .limit(1);

      let foundUser = user[0];

      if (!foundUser) {
        // Try by email
        const userByEmail = await db
          .select()
          .from(users)
          .where(eq(users.email, data.usernameOrEmail.toLowerCase()))
          .limit(1);
        
        foundUser = userByEmail[0];
      }

      if (!foundUser) {
        return { success: false, error: 'Invalid username/email or password' };
      }

      // Verify password
      const passwordValid = await bcrypt.compare(data.password, foundUser.passwordHash);
      if (!passwordValid) {
        return { success: false, error: 'Invalid username/email or password' };
      }

      // Create session
      const sessionToken = await this.createSession(foundUser.id);

      return {
        success: true,
        user: foundUser,
        sessionToken,
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  static async validateSession(sessionToken: string): Promise<User | null> {
    try {
      const session = await db
        .select({
          user: users,
          session: userSessions,
        })
        .from(userSessions)
        .innerJoin(users, eq(userSessions.userId, users.id))
        .where(
          and(
            eq(userSessions.sessionToken, sessionToken),
            gt(userSessions.expiresAt, new Date())
          )
        )
        .limit(1);

      return session[0]?.user || null;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  static async logoutUser(sessionToken: string): Promise<boolean> {
    try {
      await db
        .delete(userSessions)
        .where(eq(userSessions.sessionToken, sessionToken));
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  static async requestPasswordReset(email: string, baseUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (user.length === 0) {
        // Don't reveal that email doesn't exist
        return { success: true };
      }

      // Clean up old reset tokens for this user
      await db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, user[0].id));

      // Generate reset token
      const resetToken = emailService.generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token
      await db.insert(passwordResetTokens).values({
        userId: user[0].id,
        token: resetToken,
        expiresAt,
      });

      // Send email
      const emailSent = await emailService.sendPasswordResetEmail(email, resetToken, baseUrl);
      
      if (!emailSent) {
        console.error('Failed to send password reset email');
        return { success: false, error: 'Failed to send password reset email' };
      }

      return { success: true };
    } catch (error) {
      console.error('Password reset request error:', error);
      return { success: false, error: 'Failed to process reset request' };
    }
  }

  static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (newPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long' };
      }

      // Find valid reset token
      const resetTokenResult = await db
        .select()
        .from(passwordResetTokens)
        .innerJoin(users, eq(passwordResetTokens.userId, users.id))
        .where(
          and(
            eq(passwordResetTokens.token, token),
            gt(passwordResetTokens.expiresAt, new Date()),
            isNull(passwordResetTokens.usedAt)
          )
        )
        .limit(1);

      if (resetTokenResult.length === 0) {
        return { success: false, error: 'Invalid or expired reset token' };
      }

      const user = resetTokenResult[0].users;
      const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update password and mark token as used
      await Promise.all([
        db
          .update(users)
          .set({
            passwordHash,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id)),
        db
          .update(passwordResetTokens)
          .set({
            usedAt: new Date(),
          })
          .where(eq(passwordResetTokens.token, token))
      ]);

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Failed to reset password' };
    }
  }

  private static async createSession(userId: string): Promise<string> {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

    await db.insert(userSessions).values({
      userId,
      sessionToken,
      expiresAt,
    });

    return sessionToken;
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static async cleanupExpiredSessions(): Promise<void> {
    try {
      await db
        .delete(userSessions)
        .where(gt(new Date().toISOString(), userSessions.expiresAt));
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }
}

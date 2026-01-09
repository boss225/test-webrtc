import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
} {
  if (password.length < 8) {
    return { isValid: false, error: 'Mật khẩu phải có ít nhất 8 ký tự' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Mật khẩu phải có ít nhất 1 chữ hoa' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Mật khẩu phải có ít nhất 1 chữ thường' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Mật khẩu phải có ít nhất 1 số' };
  }
  return { isValid: true };
}

export function validateUsername(username: string): {
  isValid: boolean;
  error?: string;
} {
  if (username.length < 3) {
    return { isValid: false, error: 'Username phải có ít nhất 3 ký tự' };
  }
  if (username.length > 20) {
    return { isValid: false, error: 'Username không được quá 20 ký tự' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      isValid: false,
      error: 'Username chỉ được chứa chữ cái, số và dấu gạch dưới',
    };
  }
  return { isValid: true };
}
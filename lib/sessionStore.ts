import { supabaseAdmin, User } from './supabase';

interface Session {
  sessionId: string;
  userId: string;
  username: string;
  supabaseUserId: string;
  loginTime: Date;
}

class SessionStore {
  private sessions: Map<string, Session> = new Map();

  async createSession(
    sessionId: string,
    username: string,
    supabaseUserId: string
  ): Promise<Session> {
    const session: Session = {
      sessionId,
      userId: sessionId, // For compatibility
      username,
      supabaseUserId,
      loginTime: new Date(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);

    if (session) {
      // Update offline status
      await supabaseAdmin
        .from('users')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', session.supabaseUserId);

      return this.sessions.delete(sessionId);
    }

    return false;
  }

  async isUsernameTaken(
    username: string,
    excludeSessionId?: string
  ): Promise<boolean> {
    // Check in memory
    for (const [sessionId, session] of this.sessions) {
      if (session.username === username && sessionId !== excludeSessionId) {
        return true;
      }
    }

    // Check in database (online users)
    const { data } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .eq('is_online', true)
      .limit(1);

    return data ? data.length > 0 : false;
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
}

const sessionStore = new SessionStore();
export default sessionStore;
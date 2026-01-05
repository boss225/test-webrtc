interface Session {
    userId: string;
    username: string;
    loginTime: Date;
}

class SessionStore {
    private sessions: Map<string, Session> = new Map();

    createSession(userId: string, username: string): Session {
        const session: Session = {
            userId,
            username,
            loginTime: new Date(),
        };
        this.sessions.set(userId, session);
        return session;
    }

    getSession(userId: string): Session | undefined {
        return this.sessions.get(userId);
    }

    deleteSession(userId: string): boolean {
        return this.sessions.delete(userId);
    }

    isUsernameTaken(username: string, excludeUserId?: string): boolean {
        for (const [userId, session] of this.sessions) {
            if (session.username === username && userId !== excludeUserId) {
                return true;
            }
        }
        return false;
    }

    getAllSessions(): Session[] {
        return Array.from(this.sessions.values());
    }
}

const sessionStore = new SessionStore();
export default sessionStore;
import { Message, Participant, SignalData } from '@/types';
import sessionStore from './sessionStore';

class MessageStore {
    private messages: Message[] = [];
    private clients: Set<ReadableStreamDefaultController> = new Set();
    private participants: Map<string, Participant> = new Map();
    private signalingClients: Map<string, ReadableStreamDefaultController> = new Map();

    // Message methods
    addMessage(message: Omit<Message, 'id'>) {
        const newMessage: Message = {
            ...message,
            id: Math.random().toString(36).substr(2, 9),
        };

        this.messages.push(newMessage);

        if (this.messages.length > 100) {
            this.messages = this.messages.slice(-100);
        }

        this.broadcast(newMessage);
        return newMessage;
    }

    getMessages() {
        return this.messages;
    }

    addClient(controller: ReadableStreamDefaultController) {
        this.clients.add(controller);
    }

    removeClient(controller: ReadableStreamDefaultController) {
        this.clients.delete(controller);
    }

    broadcast(message: Message) {
        const data = `data: ${JSON.stringify(message)}\n\n`;

        this.clients.forEach(controller => {
            try {
                controller.enqueue(new TextEncoder().encode(data));
            } catch (error) {
                this.removeClient(controller);
            }
        });
    }

    // Participant methods
    addParticipant(participant: Participant) {
        // Verify session trước khi add
        const session = sessionStore.getSession(participant.id);
        if (!session) {
            throw new Error('Invalid session');
        }

        this.participants.set(participant.id, participant);
        this.broadcastSignal({
            type: 'user-joined',
            from: participant.id,
            participant
        });
    }

    removeParticipant(userId: string) {
        const participant = this.participants.get(userId);
        if (participant) {
            this.participants.delete(userId);
            this.signalingClients.delete(userId);
            this.broadcastSignal({
                type: 'user-left',
                from: userId,
                participant
            });
        }
    }

    updateParticipantMediaState(userId: string, isCameraOn: boolean, isMicOn: boolean) {
        const participant = this.participants.get(userId);
        if (participant) {
            participant.isCameraOn = isCameraOn;
            participant.isMicOn = isMicOn;
            this.broadcastSignal({
                type: 'media-state-changed',
                from: userId,
                participant
            });
        }
    }

    getParticipants() {
        return Array.from(this.participants.values());
    }

    // Signaling methods
    addSignalingClient(userId: string, controller: ReadableStreamDefaultController) {
        this.signalingClients.set(userId, controller);
    }

    removeSignalingClient(userId: string) {
        this.signalingClients.delete(userId);
    }

    sendSignal(signal: SignalData) {
        if (signal.to) {
            // Gửi đến user cụ thể
            const controller = this.signalingClients.get(signal.to);
            if (controller) {
                try {
                    const data = `data: ${JSON.stringify(signal)}\n\n`;
                    controller.enqueue(new TextEncoder().encode(data));
                } catch (error) {
                    this.removeSignalingClient(signal.to);
                }
            }
        } else {
            // Broadcast đến tất cả
            this.broadcastSignal(signal);
        }
    }

    broadcastSignal(signal: SignalData) {
        const data = `data: ${JSON.stringify(signal)}\n\n`;

        this.signalingClients.forEach((controller, userId) => {
            if (userId !== signal.from) {
                try {
                    controller.enqueue(new TextEncoder().encode(data));
                } catch (error) {
                    this.removeSignalingClient(userId);
                }
            }
        });
    }
}

const messageStore = new MessageStore();
export default messageStore;
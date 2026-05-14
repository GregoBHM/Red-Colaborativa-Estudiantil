import { API_URL } from '../config/api';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectTimeout = null;
  }

  connect(userId = null) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.userId = userId || this.userId; // Almacenar para reconexiones

    const wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws';
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket Connected');
      if (this.userId) {
        this.send({ action: 'register', user_id: this.userId });
      }
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    };

    this.ws.onmessage = (e) => {
      try {
        const message = JSON.parse(e.data);
        const { type, data } = message;
        if (this.listeners.has(type)) {
          this.listeners.get(type).forEach(callback => callback(data));
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket Disconnected. Reconnecting in 5s...');
      this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
    };

    this.ws.onerror = (e) => {
      console.error('WebSocket Error:', e ? (e.message || 'Unknown error') : 'No event data');
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  off(eventType, callback) {
    if (!this.listeners.has(eventType)) return;
    const callbacks = this.listeners.get(eventType).filter(cb => cb !== callback);
    this.listeners.set(eventType, callbacks);
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

export const wsService = new WebSocketService();

const API_BASE_URL = 'http://alda-upt.sytes.net:8300';

// Exportación directa para uso en servicios como WebSocket
export const API_URL = API_BASE_URL;

export const API = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    GOOGLE_LOGIN: `${API_BASE_URL}/api/v1/auth/google-login`,
    ME: `${API_BASE_URL}/api/v1/auth/me`,
    DOUBTS_FEED: `${API_BASE_URL}/api/v1/doubts/feed`,
    DOUBTS_CREATE: `${API_BASE_URL}/api/v1/doubts`,
    SUBJECTS: `${API_BASE_URL}/api/v1/doubts/subjects`,
    USER_PROFILE: (id) => `${API_BASE_URL}/api/v1/users/${id}`,
    USER_STATS: (id) => `${API_BASE_URL}/api/v1/users/${id}/stats`,
    DOUBT_RESOLVE: (id) => `${API_BASE_URL}/api/v1/doubts/${id}/resolve`,
  },
};

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCDJTul9i6hfeyQp9jBweaqrCJNcZszigE",
  authDomain: "movilesii-c2fe0.firebaseapp.com",
  projectId: "movilesii-c2fe0",
  storageBucket: "movilesii-c2fe0.firebasestorage.app",
  messagingSenderId: "826063210825",
  appId: "1:826063210825:web:f9ac1d3c62b3e32731b298",
};

export const GOOGLE_WEB_CLIENT_ID = "826063210825-e4kj9pupsnbqmtggqt6rh2f1ch8ahfuj.apps.googleusercontent.com";
export const GOOGLE_ANDROID_CLIENT_ID = "826063210825-kgjqr3tas8ujgcbo6mb26pf63q01rtlh.apps.googleusercontent.com";

export const ALLOWED_DOMAIN = "virtual.upt.pe";

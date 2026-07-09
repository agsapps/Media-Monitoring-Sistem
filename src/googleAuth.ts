import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const googleAuthInstance = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let cachedAccessToken: string | null = null;

export const initGoogleAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check if there is a persistent token and user in localStorage first
  const savedToken = localStorage.getItem('google_access_token');
  const savedUserStr = localStorage.getItem('google_user');
  if (savedToken && savedUserStr) {
    try {
      const savedUser = JSON.parse(savedUserStr);
      cachedAccessToken = savedToken;
      if (onAuthSuccess) {
        onAuthSuccess(savedUser, savedToken);
      }
    } catch (err) {
      console.warn('Failed to parse saved Google user from localStorage:', err);
    }
  }

  return onAuthStateChanged(googleAuthInstance, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        const savedToken = localStorage.getItem('google_access_token');
        if (savedToken) {
          cachedAccessToken = savedToken;
          if (onAuthSuccess) onAuthSuccess(user, savedToken);
        } else {
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      // If there is no active Firebase auth user in this tab session,
      // but we have a persistent token in localStorage, we keep it!
      const savedToken = localStorage.getItem('google_access_token');
      const savedUserStr = localStorage.getItem('google_user');
      if (savedToken && savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          cachedAccessToken = savedToken;
          if (onAuthSuccess) {
            onAuthSuccess(savedUser, savedToken);
          }
          return;
        } catch (e) {}
      }

      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await signInWithPopup(googleAuthInstance, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    
    // Save securely to localStorage for persistence
    localStorage.setItem('google_access_token', cachedAccessToken);
    localStorage.setItem('google_user', JSON.stringify({
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL
    }));
    localStorage.setItem('google_auth_timestamp', Date.now().toString());

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

export const getCachedAccessToken = (): string | null => {
  if (!cachedAccessToken) {
    cachedAccessToken = localStorage.getItem('google_access_token');
  }
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    localStorage.setItem('google_access_token', token);
    localStorage.setItem('google_user', JSON.stringify({
      email: 'manual-token@applet.internal',
      displayName: 'Token Manual (User)'
    }));
    localStorage.setItem('google_auth_timestamp', Date.now().toString());
  } else {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_user');
    localStorage.removeItem('google_auth_timestamp');
  }
};

export const googleSignOut = async () => {
  try {
    await googleAuthInstance.signOut();
  } catch (e) {
    console.error('Google SignOut error:', e);
  }
  cachedAccessToken = null;
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_user');
  localStorage.removeItem('google_auth_timestamp');
};

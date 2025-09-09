import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  type User as FirebaseUser 
} from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBCWsmotuEKBlJgeYMtrDxiGCBBQ06blV4",
  authDomain: "xraider-73afe.firebaseapp.com",
  projectId: "xraider-73afe",
  storageBucket: "xraider-73afe.firebasestorage.app",
  messagingSenderId: "779007553909",
  appId: "1:779007553909:web:655dafad33ab73f5d9233c",
  measurementId: "G-MQSJ82GQV4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize analytics (optional)
getAnalytics(app);
const auth = getAuth(app);

// Configure Google Provider with Drive scope
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.setCustomParameters({
  // 'consent' ensures Google re-prompts for any newly added scopes (Drive)
  prompt: 'consent select_account',
  access_type: 'offline'
});

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  emailVerified: boolean;
  // Firebase ID token (NOT Google Drive token)
  idToken?: string;
  // Google OAuth access token with Drive scopes
  driveAccessToken?: string;
  refreshToken?: string;
}

interface AuthContextType {
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  getDriveAccessToken: () => string | null;
  reconnectDrive: () => Promise<void>;
  refreshDriveAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔥 AuthProvider mounting, setting up auth listener');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('🔄 Auth state changed, firebaseUser:', firebaseUser ? 'logged in' : 'logged out');
      
      if (firebaseUser) {
        try {
          console.log('⏳ Processing Firebase user data...');
          const idTokenResult = await firebaseUser.getIdTokenResult();

          // Try to recover previously stored Google Drive access token
          const storedDriveToken = localStorage.getItem('google_access_token') || undefined;

          const userData: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || 'User')}&background=6366f1&color=fff`,
            emailVerified: firebaseUser.emailVerified,
            idToken: idTokenResult.token,
            driveAccessToken: storedDriveToken,
          };

          console.log('👤 Setting user data:', { name: userData.name, email: userData.email, hasDriveToken: !!userData.driveAccessToken });
          setUser(userData);
          localStorage.setItem('xraider_user', JSON.stringify(userData));
          
          console.log('✅ Firebase auth state changed - User logged in:', userData.name);
        } catch (error) {
          console.error('❌ Error processing user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
        localStorage.removeItem('xraider_user');
        console.log('📤 Firebase auth state changed - User logged out');
      }
      
      console.log('⏳ Setting isLoading to false');
      setIsLoading(false);
    });

    // Also set a timeout as fallback in case auth state doesn't fire
    const fallbackTimeout = setTimeout(() => {
      console.log('⚠️ Fallback: Setting isLoading to false after 3 seconds');
      setIsLoading(false);
    }, 3000);

    return () => {
      console.log('🧹 Cleaning up auth listener');
      unsubscribe();
      clearTimeout(fallbackTimeout);
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      console.log('🚀 Starting Google login...');
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Google popup login successful');
      
      // Get the Google access token for Drive API
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const driveAccessToken = credential?.accessToken;

      if (driveAccessToken) {
        localStorage.setItem('google_access_token', driveAccessToken);
        console.log('🔑 Google Drive access token stored');
      } else {
        console.warn('⚠️ No Google Drive access token returned. Check enabled scopes & consent screen.');
      }
      
      console.log('✅ Google login successful');
      console.log('🔑 Drive Access Token:', driveAccessToken ? 'Available' : 'Not available');
      console.log('📁 Ready for Google Drive integration');
      
      if (driveAccessToken) {
        try {
          const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
            headers: {
              'Authorization': `Bearer ${driveAccessToken}`,
            },
          });
          
          if (response.ok) {
            const driveData = await response.json();
            console.log('✅ Google Drive API test successful:', driveData.user.displayName);
          }
        } catch (driveError) {
          console.log('⚠️ Drive API test failed:', driveError);
        }
      }
      
      // Note: User state will be updated by onAuthStateChanged listener
      console.log('🔄 Waiting for auth state change to complete...');
      
    } catch (error: any) {
      console.error('❌ Google login error:', error);
      
      // Handle specific error cases
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('Login cancelled by user');
      } else if (error.code === 'auth/popup-blocked') {
        alert('Popup was blocked. Please allow popups for this site and try again.');
      } else {
        alert('Login failed. Please try again.');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear Google Drive access token
      localStorage.removeItem('google_access_token');
      console.log('✅ Logout successful - All tokens cleared');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getDriveAccessToken = (): string | null => {
    // Prefer stored google_access_token (raw OAuth token) over ID token
    const stored = localStorage.getItem('google_access_token');
    if (stored) return stored;
    if (user?.driveAccessToken) return user.driveAccessToken;
    return null; // Do NOT fall back to Firebase ID token
  };

  const reconnectDrive = async () => {
    console.log('🔄 Reconnecting Google Drive...');
    await loginWithGoogle();
  };

  const refreshDriveAccessToken = async (): Promise<string | null> => {
    try {
      console.log('🔄 Refreshing Google Drive access token via popup...');
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const driveAccessToken = credential?.accessToken || null;
      if (driveAccessToken) {
        localStorage.setItem('google_access_token', driveAccessToken);
        setUser(prev => prev ? { ...prev, driveAccessToken } : prev);
        console.log('✅ Drive access token refreshed');
      } else {
        console.warn('⚠️ Failed to obtain new Drive access token during refresh');
      }
      return driveAccessToken;
    } catch (err) {
      console.error('❌ Failed to refresh Drive token:', err);
      return null;
    }
  };

  return (
  <AuthContext.Provider value={{ user, loginWithGoogle, logout, isLoading, getDriveAccessToken, reconnectDrive, refreshDriveAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export Firebase auth for use in other components
export { auth };
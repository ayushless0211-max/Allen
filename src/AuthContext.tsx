import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  toggleAdminRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  updateProfile: async () => {},
  toggleAdminRole: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = undefined;
      }

      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          
          profileUnsubscribe = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              setProfile(data);
              setLoading(false);
            } else {
              // Creating fresh user profile mapping to student by default
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
                email: firebaseUser.email || '',
                photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${firebaseUser.uid}`,
                role: 'student',
                purchasedCourseIds: [],
                createdAt: new Date().toISOString(),
              };
              await setDoc(docRef, newProfile);
              setProfile(newProfile);
              setLoading(false);
            }
          }, (error) => {
            console.error("Firestore loading snapshot query failed:", error);
            setLoading(false);
          });
        } catch (error) {
          console.error("Firestore database connection failed:", error);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user || !profile) return;
    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );
      await setDoc(doc(db, 'users', user.uid), cleanData, { merge: true });
    } catch (error) {
      console.error("Error updating user profile in firestore:", error);
      throw error;
    }
  };

  const toggleAdminRole = async () => {
    if (!user || !profile) return;
    const targetRole = profile.role === 'admin' ? 'student' : 'admin';
    try {
      await setDoc(doc(db, 'users', user.uid), { role: targetRole }, { merge: true });
    } catch (error) {
      console.error("Failed to toggle user role:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, updateProfile, toggleAdminRole }}>
      {children}
    </AuthContext.Provider>
  );
};

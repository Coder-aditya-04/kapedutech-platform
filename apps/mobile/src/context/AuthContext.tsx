import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthContextType = {
  phone: string | null;
  isLoading: boolean;
  login: (phone: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  phone: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [phone, setPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restore() {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        if (token) {
          const raw = await AsyncStorage.getItem("parent");
          if (raw) {
            const parent = JSON.parse(raw);
            setPhone(parent.phone ?? null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    restore();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        phone,
        isLoading,
        login: (p) => setPhone(p),
        logout: () => { setPhone(null); AsyncStorage.multiRemove(["auth_token", "parent"]); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useContext, useState } from "react";

type AuthContextType = {
  phone: string | null;
  login: (phone: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  phone: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [phone, setPhone] = useState<string | null>(null);

  return (
    <AuthContext.Provider
      value={{
        phone,
        login: (p) => setPhone(p),
        logout: () => setPhone(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

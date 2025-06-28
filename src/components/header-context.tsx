"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface HeaderContextType {
  title: string;
  description?: string;
  headerActions?: ReactNode;
  setHeaderProps: (props: {
    title: string;
    description?: string;
    headerActions?: ReactNode;
  }) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("AI Neural Platform");
  const [description, setDescription] = useState<string | undefined>();
  const [headerActions, setHeaderActions] = useState<ReactNode>();

  const setHeaderProps = ({
    title,
    description,
    headerActions,
  }: {
    title: string;
    description?: string;
    headerActions?: ReactNode;
  }) => {
    setTitle(title);
    setDescription(description);
    setHeaderActions(headerActions);
  };

  return (
    <HeaderContext.Provider
      value={{ title, description, headerActions, setHeaderProps }}
    >
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error("useHeader must be used within a HeaderProvider");
  }
  return context;
}

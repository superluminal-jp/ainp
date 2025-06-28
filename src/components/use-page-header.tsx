"use client";

import { useEffect, ReactNode } from "react";
import { useHeader } from "@/components/header-context";

interface UsePageHeaderProps {
  title: string;
  description?: string;
  headerActions?: ReactNode;
}

export function usePageHeader({
  title,
  description,
  headerActions,
}: UsePageHeaderProps) {
  const { setHeaderProps } = useHeader();

  useEffect(() => {
    setHeaderProps({ title, description, headerActions });
  }, [title, description, headerActions, setHeaderProps]);
}

// Utility hook for simple headers without actions
export function useSimpleHeader(title: string, description?: string) {
  return usePageHeader({ title, description });
}

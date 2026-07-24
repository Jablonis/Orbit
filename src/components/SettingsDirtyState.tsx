"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SettingsDirtyStateValue = {
  dirty: boolean;
  discardVersion: number;
  discardChanges: () => void;
  setDirty: (dirty: boolean) => void;
};

const SettingsDirtyStateContext =
  createContext<SettingsDirtyStateValue | null>(null);

export function SettingsDirtyStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [dirty, setDirty] = useState(false);
  const [discardVersion, setDiscardVersion] = useState(0);
  const value = useMemo(
    () => ({
      dirty,
      discardChanges() {
        setDirty(false);
        setDiscardVersion((version) => version + 1);
      },
      discardVersion,
      setDirty,
    }),
    [dirty, discardVersion],
  );

  return (
    <SettingsDirtyStateContext.Provider value={value}>
      {children}
    </SettingsDirtyStateContext.Provider>
  );
}

export function useSettingsDirtyState() {
  const value = useContext(SettingsDirtyStateContext);
  if (!value) {
    throw new Error(
      "useSettingsDirtyState must be used inside SettingsDirtyStateProvider.",
    );
  }
  return value;
}

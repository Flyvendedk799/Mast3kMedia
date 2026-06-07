import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface PortalState {
  active: boolean;
  rect: { x: number; y: number; w: number; h: number } | null;
  gradient: string;
  projectId: string;
}

interface PortalContextValue {
  portalState: PortalState;
  triggerPortal: (projectId: string, rect: DOMRect, gradient: string) => void;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export const usePortal = () => {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be inside PortalProvider');
  return ctx;
};

export const PortalProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [portalState, setPortalState] = useState<PortalState>({
    active: false,
    rect: null,
    gradient: '',
    projectId: '',
  });

  const triggerPortal = useCallback(
    (projectId: string, rect: DOMRect, gradient: string) => {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      setPortalState({
        active: true,
        rect: { x: centerX, y: centerY, w: rect.width, h: rect.height },
        gradient,
        projectId,
      });

      // Navigate after animation
      setTimeout(() => {
        navigate(`/project/${projectId}`, { state: { gradient } });
        // Reset after navigation
        setTimeout(() => {
          setPortalState({ active: false, rect: null, gradient: '', projectId: '' });
        }, 100);
      }, 600);
    },
    [navigate]
  );

  return (
    <PortalContext.Provider value={{ portalState, triggerPortal }}>
      {children}
    </PortalContext.Provider>
  );
};

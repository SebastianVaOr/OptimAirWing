import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalItem {
  id: string;
  component: React.ReactNode;
  onClose?: () => void;
}

interface ModalContextValue {
  open: (id: string, component: React.ReactNode, onClose?: () => void) => void;
  close: (id: string) => void;
  closeAll: () => void;
}

const ModalContext = createContext<ModalContextValue>(null!);

export const useModalStack = () => useContext(ModalContext);

export const ModalStackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stack, setStack] = useState<ModalItem[]>([]);

  const open = useCallback((id: string, component: React.ReactNode, onClose?: () => void) => {
    setStack(prev => {
      if (prev.find(m => m.id === id)) return prev;
      return [...prev, { id, component, onClose }];
    });
  }, []);

  const close = useCallback((id: string) => {
    setStack(prev => {
      const item = prev.find(m => m.id === id);
      item?.onClose?.();
      return prev.filter(m => m.id !== id);
    });
  }, []);

  const closeAll = useCallback(() => {
    setStack([]);
  }, []);

  return (
    <ModalContext.Provider value={{ open, close, closeAll }}>
      {children}
      <AnimatePresence>
        {stack.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ zIndex: 50 + i }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => close(item.id)} />
            <div className="relative">{item.component}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </ModalContext.Provider>
  );
};

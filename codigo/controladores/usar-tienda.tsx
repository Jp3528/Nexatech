import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { shop } from './cliente';
import type { Snapshot } from './controlador-tienda';
import { errorMessage } from '../modelos/dominio';
interface Context {
  state: Snapshot | null;
  error: string;
  busy: boolean;
  toast: string;
  clearToast: () => void;
  refresh: () => Promise<void>;
  act: <T>(
    action: () => Promise<T>,
    message?: string,
  ) => Promise<T | undefined>;
}
const ShopContext = createContext<Context | null>(null);
export function ShopProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Snapshot | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState('');
  const lock = useRef(false);
  const refresh = useCallback(async () => {
    try {
      setState(await shop.snapshot());
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useEffect(() => {
    void refresh();
    const online = () => void refresh();
    const updated = () => void refresh();
    const storage = (event: StorageEvent) => {
      if (event.key === 'casaviva-data-version') void refresh();
    };
    const events =
      typeof EventSource !== 'undefined' ? new EventSource('/api/events') : null;
    events?.addEventListener('catalog-updated', updated);
    window.addEventListener('online', online);
    window.addEventListener('casaviva:data-updated', updated);
    window.addEventListener('storage', storage);
    return () => {
      events?.close();
      window.removeEventListener('online', online);
      window.removeEventListener('casaviva:data-updated', updated);
      window.removeEventListener('storage', storage);
    };
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  async function act<T>(
    action: () => Promise<T>,
    message?: string,
  ): Promise<T | undefined> {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await action();
      await refresh();
      if (message) setToast(message);
      return result;
    } catch (e) {
      setError(errorMessage(e));
      return undefined;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <ShopContext.Provider
      value={{
        state,
        error,
        busy,
        toast,
        clearToast: () => setToast(''),
        refresh,
        act,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}
export function useShop() {
  const c = useContext(ShopContext);
  if (!c) throw new Error('ShopProvider missing');
  return c;
}

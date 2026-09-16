import { CheckCircle2, X } from 'lucide-react';
export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  if (!message) return null;
  return (
    <output className="toast">
      <CheckCircle2 size={20} />
      <span>{message}</span>
      <a href="/carrito">Ver carrito</a>
      <button className="icon" aria-label="Cerrar aviso" onClick={onClose}>
        <X size={17} />
      </button>
    </output>
  );
}

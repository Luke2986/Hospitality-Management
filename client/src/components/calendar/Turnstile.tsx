import { useEffect, useRef, useState } from 'react';

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript() {
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        script.remove();
        reject(new Error('Turnstile script failed to load'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

interface TurnstileProps {
  siteKey: string;
  onToken: (token: string | null) => void;
  // Changing it renders a fresh challenge: tokens are single-use.
  resetKey: number;
}

export function Turnstile({ siteKey, onToken, resetKey }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;
    setLoadFailed(false);
    onTokenRef.current(null);

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          language: 'it',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, resetKey]);

  return (
    <div className="flex flex-col items-center gap-2" data-testid="turnstile">
      <div ref={containerRef} />
      {loadFailed && (
        <p className="text-sm text-red-600 text-center">
          Impossibile caricare la verifica anti-bot. Disattiva eventuali blocchi dei contenuti e ricarica la pagina.
        </p>
      )}
    </div>
  );
}

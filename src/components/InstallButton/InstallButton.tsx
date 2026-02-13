import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
  }>;
}

export default function InstallButton() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();

      setInstallEvent(e as BeforeInstallPromptEvent);
    });

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
    });
  }, []);

  async function handleInstall() {
    if (!installEvent) return;

    installEvent.prompt();

    const choice = await installEvent.userChoice;

    if (choice.outcome === 'accepted') {
      setInstalled(true);
    }

    setInstallEvent(null);
  }

  if (installed) {
    return (
      <div style={{ color: 'green', marginBottom: 10 }}>
        ✅ Додаток встановлено
      </div>
    );
  }

  if (!installEvent) return null;

  return (
    <button
      onClick={handleInstall}
      style={{
        marginBottom: 15,
        padding: '10px 16px',
        background: '#16a34a',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        fontSize: 16,
        cursor: 'pointer',
      }}
    >
      📲 Встановити додаток
    </button>
  );
}

import { useState } from 'react';

import LoginPage from './pages/LoginPage';
import VerifyCodePage from './pages/VerifyCodePage';
import ReportPage from './pages/ReportPage';

export default function App() {
  const [email, setEmail] = useState(localStorage.getItem('auth'));

  const [step, setStep] = useState<'login' | 'verify' | 'app'>(
    email ? 'app' : 'login'
  );

  if (step === 'login') {
    return (
      <LoginPage
        onCodeSent={email => {
          setEmail(email);
          setStep('verify');
        }}
      />
    );
  }

  if (step === 'verify' && email) {
    return <VerifyCodePage email={email} onSuccess={() => setStep('app')} />;
  }

  return <ReportPage />;
}

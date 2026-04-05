import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { SessionProvider } from './context/SessionContext.tsx'
import { TimerProvider } from './context/TimerContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SessionProvider>
        <TimerProvider>
          <App />
        </TimerProvider>
      </SessionProvider>
    </AuthProvider>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { ConsentProvider } from './context/ConsentContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ConsentProvider>
          <App />
        </ConsentProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)

import '@fontsource-variable/inter'
import '@fontsource-variable/montserrat'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { startCounting } from './lib/counts'
import { startRouter } from './lib/router'

startRouter()
startCounting()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

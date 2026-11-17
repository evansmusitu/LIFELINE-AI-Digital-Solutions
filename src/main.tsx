import '@fontsource-variable/inter'
import '@fontsource-variable/montserrat'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { captureBusinessName } from './lib/business-name'
import { countArrival, startCounting } from './lib/counts'
import { startRouter } from './lib/router'

startRouter()
startCounting()
countArrival()
// After the arrival is counted (it reads ?for=): the name goes into this tab's storage and out of the address.
captureBusinessName()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

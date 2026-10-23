import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { useGLTF } from '@react-three/drei'
import './styles.css'

// the Draco decoder (wasm + wrapper, copied from three/examples/jsm/libs/draco/gltf) is served from our own origin:
// drei's default pulls it from www.gstatic.com at runtime, a third-party script with no integrity check (OWASP A08)
// that the CSP would also have to allow
useGLTF.setDecoderPath('/draco/')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

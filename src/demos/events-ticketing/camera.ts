/* Camera scanning uses the browser's own BarcodeDetector (Chrome on Android, ChromeOS and macOS). No library. */

interface DetectedCode {
  rawValue: string
}

export interface Detector {
  detect(source: HTMLVideoElement): Promise<DetectedCode[]>
}

export interface DetectorClass {
  new (options?: { formats: string[] }): Detector
  getSupportedFormats?: () => Promise<string[]>
}

export function detectorClass(): DetectorClass | null {
  const ctor = (window as unknown as { BarcodeDetector?: DetectorClass }).BarcodeDetector
  return typeof ctor === 'function' ? ctor : null
}

/** Show the camera option only where it can work. getUserMedia is missing outside HTTPS. */
export function cameraScanAvailable(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window && Boolean(navigator.mediaDevices?.getUserMedia)
}

export type CameraStatus = 'starting' | 'scanning' | 'denied' | 'none' | 'busy' | 'unsupported' | 'error'

export function cameraStatusFor(error: unknown): CameraStatus {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'none'
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy'
  return 'error'
}

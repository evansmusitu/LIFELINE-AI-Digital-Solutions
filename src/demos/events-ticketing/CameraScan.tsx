import { CameraOff, LoaderCircle, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { cameraStatusFor, detectorClass, type CameraStatus as Status, type Detector } from './camera'

const MESSAGES: Record<Exclude<Status, 'starting' | 'scanning'>, string> = {
  denied: 'Camera access is blocked. Allow the camera for this site in your browser settings, or type the ticket code instead.',
  none: 'No camera was found on this device. Type the ticket code or pick a ticket from the list.',
  busy: 'Another app is using the camera. Close it and try again, or type the ticket code.',
  unsupported: 'This browser can’t read QR codes from the camera. Type the ticket code instead.',
  error: 'The camera didn’t start. Try again, or type the ticket code.',
}

/**
 * Live camera preview that reads one QR code, then stops. Mount it only while the dialog is open:
 * every exit path (a successful read, closing the dialog, unmounting) stops all camera tracks.
 */
export function CameraScan({ onRead }: { onRead: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onReadRef = useRef(onRead)
  const [status, setStatus] = useState<Status>('starting')

  useEffect(() => {
    onReadRef.current = onRead
  }, [onRead])

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null
    let timer: number | null = null
    let detecting = false

    const stop = () => {
      if (timer !== null) window.clearInterval(timer)
      timer = null
      stream?.getTracks().forEach((track) => track.stop())
      stream = null
      const video = videoRef.current
      if (video) {
        video.pause()
        video.srcObject = null
      }
    }

    const start = async () => {
      const Ctor = detectorClass()
      if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported')
        return
      }
      let formats: string[] | undefined
      try {
        formats = await Ctor.getSupportedFormats?.()
      } catch {
        // Some versions don't list formats. Try anyway.
      }
      if (cancelled) return
      if (formats && !formats.includes('qr_code')) {
        setStatus('unsupported')
        return
      }
      // Build the detector before asking for the camera, so a failure here never leaves the camera on.
      let detector: Detector
      try {
        detector = new Ctor({ formats: ['qr_code'] })
      } catch {
        setStatus('unsupported')
        return
      }
      let media: MediaStream
      try {
        media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      } catch (error) {
        if (!cancelled) setStatus(cameraStatusFor(error))
        return
      }
      // The dialog may have closed while the permission prompt was open.
      if (cancelled) {
        media.getTracks().forEach((track) => track.stop())
        return
      }
      stream = media
      const video = videoRef.current
      if (!video) {
        stop()
        return
      }
      video.srcObject = media
      try {
        await video.play()
      } catch {
        // Muted inline video normally plays. If not, frames still arrive for detection.
      }
      if (cancelled) return
      setStatus('scanning')
      timer = window.setInterval(() => {
        if (detecting || cancelled || video.readyState < 2) return
        detecting = true
        detector
          .detect(video)
          .then((codes) => {
            const text = codes.find((c) => c.rawValue)?.rawValue
            if (!text || cancelled) return
            cancelled = true
            stop()
            onReadRef.current(text)
          })
          .catch(() => {
            // A frame can fail to decode. Keep looking.
          })
          .finally(() => {
            detecting = false
          })
      }, 250)
    }

    void start()
    return () => {
      cancelled = true
      stop()
    }
  }, [])

  const failed = status !== 'starting' && status !== 'scanning'
  return (
    <div className="space-y-3">
      <div className={cn('relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-slate-900', failed && 'hidden')}>
        <video ref={videoRef} playsInline muted aria-label="Camera preview" className="size-full object-cover" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-[14%] rounded-2xl border-4 border-white/80" />
        {status === 'starting' && (
          <span className="absolute inset-0 grid place-items-center text-sm font-medium text-white">
            <span className="inline-flex items-center gap-2">
              <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
              Starting the camera…
            </span>
          </span>
        )}
      </div>
      <p role="status" className="flex items-start gap-2 text-sm text-slate-700">
        {failed ? (
          <>
            <CameraOff className="mt-0.5 size-4 shrink-0 text-red-700" aria-hidden="true" />
            {MESSAGES[status]}
          </>
        ) : status === 'scanning' ? (
          <>
            <ScanLine className="mt-0.5 size-4 shrink-0 text-(--accent)" aria-hidden="true" />
            Hold the ticket’s QR code inside the frame. It reads on its own.
          </>
        ) : (
          'Your browser may ask to use the camera. Nothing is recorded or sent anywhere.'
        )}
      </p>
    </div>
  )
}

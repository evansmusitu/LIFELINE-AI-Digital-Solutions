import { useCallback, useEffect, useRef, useState } from 'react'

/*
 * Voice for the receptionist, using the browser's own speech features. Reading replies aloud
 * runs on the visitor's device. Voice typing uses the browser's speech service (in Chrome,
 * Google's). Neither costs LIFELINE anything. Both are left out where the browser lacks them.
 */

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function'
}

/** An English voice, preferring the visitor's own region, then British, South African and US English. */
function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'))
  const wanted = [navigator.language.toLowerCase(), 'en-gb', 'en-za', 'en-us']
  for (const lang of wanted) {
    const voice = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === lang)
    if (voice) return voice
  }
  return voices[0]
}

export function speak(text: string) {
  if (!canSpeak() || !text.trim()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  }
  synth.speak(utterance)
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}

/* The Web Speech API's recognition interface isn't in TypeScript's DOM types. These are the parts used here. */
interface RecognitionResult {
  readonly isFinal: boolean
  readonly 0: { readonly transcript: string }
}
interface RecognitionEvent {
  readonly resultIndex: number
  readonly results: ArrayLike<RecognitionResult>
}
interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: { readonly error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionConstructor = new () => Recognition

function recognitionClass(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type DictationProblem = 'blocked' | 'no-speech' | 'failed'

/**
 * Voice typing. `onFinal` receives what the visitor said when they stop talking; `interim`
 * holds the words recognised so far while they speak.
 */
export function useDictation(onFinal: (text: string) => void) {
  const [supported] = useState(() => recognitionClass() !== null)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [problem, setProblem] = useState<DictationProblem | null>(null)
  const active = useRef<Recognition | null>(null)
  const finalCallback = useRef(onFinal)

  useEffect(() => {
    finalCallback.current = onFinal
  }, [onFinal])

  useEffect(() => () => active.current?.abort(), [])

  const start = useCallback(() => {
    const Klass = recognitionClass()
    if (!Klass || active.current) return
    stopSpeaking()
    const recognition = new Klass()
    recognition.lang = navigator.language || 'en-US'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.maxAlternatives = 1
    let heard = ''
    recognition.onresult = (event) => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript
      heard = text.trim()
      setInterim(heard)
    }
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') setProblem('blocked')
      else if (event.error === 'no-speech') setProblem('no-speech')
      else if (event.error !== 'aborted') setProblem('failed')
    }
    recognition.onend = () => {
      active.current = null
      setListening(false)
      setInterim('')
      if (heard) finalCallback.current(heard)
    }
    active.current = recognition
    setProblem(null)
    setListening(true)
    try {
      recognition.start()
    } catch {
      active.current = null
      setListening(false)
      setProblem('failed')
    }
  }, [])

  const stop = useCallback(() => active.current?.stop(), [])

  return { supported, listening, interim, problem, start, stop }
}

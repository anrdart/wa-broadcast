import { ref } from 'vue'

// Audio state
const isAudioEnabled = ref(true)
const audioVolume = ref(0.5)

// Audio files (using data URLs for simple notification sounds)
const AUDIO_SOUNDS = {
  message: {
    // Simple notification beep using Web Audio API
    frequency: 800,
    duration: 200,
    type: 'sine'
  },
  sent: {
    frequency: 600,
    duration: 100,
    type: 'sine'
  },
  delivered: {
    frequency: 900,
    duration: 150,
    type: 'sine'
  },
  error: {
    frequency: 400,
    duration: 300,
    type: 'sawtooth'
  }
}

// Web Audio API context
let audioContext = null

// Initialize audio context
const initAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    } catch (error) {
      console.warn('Web Audio API not supported:', error)
      return false
    }
  }
  return true
}

// Play notification sound using Web Audio API
const playNotificationSound = (soundConfig) => {
  if (!isAudioEnabled.value || !initAudioContext()) {
    return
  }

  try {
    const { frequency, duration, type } = soundConfig
    
    // Create oscillator
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Configure oscillator
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
    
    // Configure gain (volume)
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(audioVolume.value, audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration / 1000)
    
    // Play sound
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration / 1000)
    
  } catch (error) {
    console.warn('Error playing notification sound:', error)
  }
}

// Play message notification sound
const playMessageSound = () => {
  playNotificationSound(AUDIO_SOUNDS.message)
}

// Play sent message sound
const playSentSound = () => {
  playNotificationSound(AUDIO_SOUNDS.sent)
}

// Play delivered message sound
const playDeliveredSound = () => {
  playNotificationSound(AUDIO_SOUNDS.delivered)
}

// Play error sound
const playErrorSound = () => {
  playNotificationSound(AUDIO_SOUNDS.error)
}

// Toggle audio
const toggleAudio = () => {
  isAudioEnabled.value = !isAudioEnabled.value
  return isAudioEnabled.value
}

// Set volume (0.0 to 1.0)
const setVolume = (volume) => {
  audioVolume.value = Math.max(0, Math.min(1, volume))
}

// Play custom sound with frequency and duration
const playCustomSound = (frequency = 800, duration = 200, type = 'sine') => {
  playNotificationSound({ frequency, duration, type })
}

export function useAudio() {
  return {
    // State
    isAudioEnabled,
    audioVolume,
    
    // Methods
    initAudioContext,
    playMessageSound,
    playSentSound,
    playDeliveredSound,
    playErrorSound,
    playCustomSound,
    toggleAudio,
    setVolume
  }
}
import { useState, useEffect, useRef } from 'react';

const useSpeech = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const silenceTimer = useRef(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final) setTranscript((t) => t + final);

      /* reset silence timer on every result */
      clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => {
        recognition.stop();
        setListening(false);
      }, 1500); // 1.5 s silence
    };

    recognition.onend = () => {
      clearTimeout(silenceTimer.current);
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const start = () => {
    if (listening) return;
    setTranscript('');
    setListening(true);
    recognitionRef.current.start();
  };

  const stop = () => {
    clearTimeout(silenceTimer.current);
    recognitionRef.current.stop();
  };

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    speechSynthesis.speak(utter);
  };

  return { listening, transcript, start, stop, speak, isSupported };
};

export default useSpeech;
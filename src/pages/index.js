import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'peerjs';

export default function Home() {
  // === State ===
  const [myPeerId, setMyPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [inCall, setInCall] = useState(false);
  const [subtitle, setSubtitle] = useState('Your words...');
  const [translated, setTranslated] = useState('Translated...');
  const [targetLang, setTargetLang] = useState('es'); // Spanish
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // === Refs ===
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const peerRef = useRef(null);
  const recognitionRef = useRef(null);

  // --- PeerJS setup ---
  useEffect(() => {
    const peer = new Peer(undefined, {
      // PeerJS free cloud server
      host: '0.peerjs.com',
      port: 443,
      secure: true,
    });

    peer.on('open', (id) => {
      setMyPeerId(id);
    });

    peer.on('call', async (call) => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMyStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      call.answer(stream);
      call.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      });
      setInCall(true);
    });

    peerRef.current = peer;

    return () => peer.destroy();
  }, []);

  // --- Start local camera ---
  const startLocalCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setMyStream(stream);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, []);

  // --- Call a remote peer ---
  const callPeer = useCallback(async () => {
    if (!remotePeerId) return;
    const stream = await startLocalCamera();
    const call = peerRef.current.call(remotePeerId, stream);
    call.on('stream', (remoteStream) => {
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    });
    setInCall(true);
  }, [remotePeerId, startLocalCamera]);

  // --- Speech recognition & translation ---
  useEffect(() => {
    if (!inCall) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // You could change source language

    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      setSubtitle(transcript);

      // Trigger lip-sync animation (mouth open/close)
      animateMouth(true);

      // Translate
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript, source: 'en', target: targetLang }),
        });
        const data = await res.json();
        setTranslated(data.translatedText || transcript);

        // Speak the translation
        const utterance = new SpeechSynthesisUtterance(data.translatedText || transcript);
        utterance.lang = targetLang === 'es' ? 'es-ES' : targetLang;
        window.speechSynthesis.speak(utterance);

        // After a short delay, close mouth
        setTimeout(() => animateMouth(false), 500);
      } catch (err) {
        console.error(err);
        setTranslated('Translation error');
      }
    };

    recognition.start();
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [inCall, targetLang]);

  // --- Lip-sync canvas animation ---
  const animateMouth = useCallback((open) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (open) {
      // Draw open mouth (ellipse)
      ctx.fillStyle = '#ff4d4d';
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2 + 10, 30, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Draw closed mouth (line)
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 25, height / 2 + 10);
      ctx.lineTo(width / 2 + 25, height / 2 + 10);
      ctx.stroke();
    }
  }, []);

  // --- UI ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
      {!inCall ? (
        // Lobby
        <div className="text-center space-y-8">
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            PolyglotVision
          </h1>
          <p className="text-xl text-gray-400">Speak, translate, sync – live.</p>

          <div className="bg-gray-800 p-8 rounded-3xl shadow-2xl max-w-md mx-auto space-y-4">
            <p className="text-sm text-gray-400">Your Peer ID</p>
            <p className="text-2xl font-mono text-yellow-300">{myPeerId || 'Loading...'}</p>
            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-3 rounded-lg text-black"
                placeholder="Friend's Peer ID"
                value={remotePeerId}
                onChange={(e) => setRemotePeerId(e.target.value)}
              />
              <button
                onClick={callPeer}
                className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-bold"
              >
                Call
              </button>
            </div>
            <div>
              <label className="text-sm text-gray-400">Translate to:</label>
              <select
                className="ml-2 px-3 py-1 rounded bg-gray-700 text-white"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
              >
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        // In-call UI
        <div className="w-full h-screen flex flex-col">
          {/* Video boxes */}
          <div className="flex-1 flex flex-col md:flex-row gap-2 p-2">
            <div className="relative flex-1">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                className="w-full h-full object-cover rounded-xl border-2 border-blue-500"
              />
              <canvas
                ref={canvasRef}
                width={300}
                height={200}
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/3 h-1/3 pointer-events-none"
              />
            </div>
            <div className="flex-1">
              <video
                ref={remoteVideoRef}
                autoPlay
                className="w-full h-full object-cover rounded-xl border-2 border-green-500"
              />
            </div>
          </div>

          {/* Subtitles & translation */}
          <div className="flex gap-4 p-4 bg-black/80 backdrop-blur">
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-400">You said</p>
              <p className="text-lg font-semibold">{subtitle}</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-400">Translated ({targetLang})</p>
              <p className="text-lg font-semibold text-yellow-400">{translated}</p>
            </div>
          </div>

          {/* Hangup button */}
          <button
            onClick={() => window.location.reload()}
            className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
          >
            Hang up
          </button>
        </div>
      )}
    </div>
  );
}

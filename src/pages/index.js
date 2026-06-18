import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'peerjs';

export default function Home() {
  const [myPeerId, setMyPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [inCall, setInCall] = useState(false);
  const [subtitle, setSubtitle] = useState('Your words...');
  const [translated, setTranslated] = useState('Translated...');
  const [targetLang, setTargetLang] = useState('es');
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const peerRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const volumeSmoothRef = useRef(0);

  // --- Audio-driven lip-sync loop (improved) ---
  const startLipSync = useCallback((stream) => {
    if (!stream) return;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    audioContextRef.current = audioCtx;
    analyserRef.current = analyser;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      if (!canvas || !analyserRef.current) return;

      const dataArray = new Uint8Array(analyserRef.current.fftSize);
      analyserRef.current.getByteTimeDomainData(dataArray);

      // Compute RMS volume (0–1)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const rawVolume = Math.min(rms * 2, 1); // scale up a bit

      // Smooth the volume (low-pass filter)
      volumeSmoothRef.current = volumeSmoothRef.current * 0.8 + rawVolume * 0.2;
      const volume = volumeSmoothRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const centerX = w / 2;
      const centerY = h / 2 + 5; // slight offset for face position

      // Mouth width and base gap
      const mouthWidth = 60;
      const baseGap = 4;
      const maxGap = 25;
      const gap = baseGap + volume * maxGap;

      // Draw upper lip (arc from left to right, upward)
      ctx.strokeStyle = '#e53e3e';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(centerX, centerY - gap / 2, mouthWidth / 2, Math.PI, 0, true);
      ctx.stroke();

      // Draw lower lip (arc from left to right, downward)
      ctx.beginPath();
      ctx.arc(centerX, centerY + gap / 2, mouthWidth / 2, 0, Math.PI, true);
      ctx.stroke();

      // Fill mouth interior when open
      if (gap > baseGap + 5) {
        ctx.fillStyle = '#4a0000';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, mouthWidth / 2 - 3, gap / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, []);

  // --- PeerJS setup ---
  useEffect(() => {
    const peer = new Peer(undefined, {
      host: '0.peerjs.com',
      port: 443,
      secure: true,
    });

    peer.on('open', (id) => setMyPeerId(id));

    peer.on('call', async (call) => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMyStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      startLipSync(stream);
      call.answer(stream);
      call.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      });
      setInCall(true);
    });

    peerRef.current = peer;

    return () => {
      peer.destroy();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [startLipSync]);

  const startLocalCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setMyStream(stream);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    startLipSync(stream);
    return stream;
  }, [startLipSync]);

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
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      setSubtitle(transcript);

      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript, source: 'en', target: targetLang }),
        });
        const data = await res.json();
        setTranslated(data.translatedText || transcript);

        const utterance = new SpeechSynthesisUtterance(data.translatedText || transcript);
        utterance.lang = targetLang === 'es' ? 'es-ES' : targetLang;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        setTranslated('Translation error');
      }
    };

    recognition.start();
    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, [inCall, targetLang]);

  // --- UI ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
      {!inCall ? (
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
        <div className="w-full h-screen flex flex-col">
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
                width={160}
                height={120}
                className="absolute bottom-5 left-1/2 transform -translate-x-1/2 w-[30%] h-[25%]"
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

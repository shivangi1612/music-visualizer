import { useState, useRef, useEffect } from 'react';
import { FaPlay, FaPause, FaUpload } from 'react-icons/fa';
import AudioVisualizer from './components/AudioVisualizer';

function App() {
  const [audioFile, setAudioFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioData, setAudioData] = useState(new Uint8Array(128));
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    // Initialize Audio Context
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    analyserRef.current.smoothingTimeConstant = 0.8;

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioFile(url);
      setIsPlaying(false);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      }
    }
  };

  const togglePlay = async () => {
    if (!audioFile) return;

    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      if (isPlaying) {
        audioRef.current.pause();
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      } else {
        audioRef.current.play();
        
        // Connect audio nodes if not already connected
        if (!audioRef.current.connected) {
          const source = audioContextRef.current.createMediaElementSource(audioRef.current);
          source.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          audioRef.current.connected = true;
        }
        
        // Start the visualization loop
        const updateData = () => {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          setAudioData(dataArray);
          animationFrameRef.current = requestAnimationFrame(updateData);
        };
        updateData();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  };

  useEffect(() => {
    const audioElement = audioRef.current;
    
    const handleEnded = () => {
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    audioElement?.addEventListener('ended', handleEnded);
    
    return () => {
      audioElement?.removeEventListener('ended', handleEnded);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-700 via-orange-300 to-rose-800 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl bg-black/30 backdrop-blur-lg rounded-xl p-8 shadow-2xl">
        <h1 className="text-4xl font-bold text-center text-white mb-8">
          Music Visualizer <i class="ri-music-line"></i>
        </h1>

        <div className="h-[400px] mb-8 rounded-lg overflow-hidden bg-black/20">
          <AudioVisualizer audioData={audioData} isPlaying={isPlaying} />
        </div>

        <div className="flex items-center justify-center gap-4">
          <label className="bg-orange-900 text-orange-400 border border-orange-400 border-b-4 font-medium overflow-hidden relative px-4 py-2 rounded-md hover:brightness-150 hover:border-t-4 hover:border-b active:opacity-75 outline-none duration-300 group">
          <span class="bg-orange-400 shadow-orange-400 absolute -top-[150%] left-0 inline-flex w-80 h-[5px] rounded-md opacity-50 group-hover:top-[150%] duration-500 shadow-[0_0_10px_10px_rgba(0,0,0,0.3)]"></span>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <FaUpload className="text-white text-xl" />
          </label>

          <button
            onClick={togglePlay}
            disabled={!audioFile}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${
              audioFile
                ? 'bg-red-600 hover:bg-red-800'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            {isPlaying ? (
              <FaPause className="text-white text-xl" />
            ) : (
              <FaPlay className="text-white text-xl" />
            )}
          </button>
        </div>

        <audio ref={audioRef} className="hidden" />
      </div>
    </div>
  );
}

export default App;
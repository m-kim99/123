import { useCallback, useRef, useState } from 'react';

interface UseAudioPlayerProps {
  onPlaybackComplete?: () => void;
}

export function useAudioPlayer(props?: UseAudioPlayerProps) {
  const { onPlaybackComplete } = props || {};
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const onPlaybackCompleteRef = useRef(onPlaybackComplete);
  
  // 콜백 ref 업데이트
  onPlaybackCompleteRef.current = onPlaybackComplete;

  const playNext = useCallback(async () => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift()!;

      // Int16 → Float32 변환
      const float32Data = new Float32Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        float32Data[i] = audioData[i] / 32768.0;
      }

      // AudioBuffer 생성
      const audioBuffer = audioContext.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      // 재생
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    }

    isPlayingRef.current = false;
    setIsPlaying(false);
    
    // 재생 완료 콜백 호출
    if (onPlaybackCompleteRef.current) {
      onPlaybackCompleteRef.current();
    }
  }, []);

  const play = useCallback(async (audioData: Int16Array) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }

    audioQueueRef.current.push(audioData);

    // 재생 중이 아니면 재생 시작
    if (!isPlayingRef.current) {
      isPlayingRef.current = true;
      setIsPlaying(true);
      await playNext();
    }
  }, [playNext]);

  const stop = useCallback(() => {
    audioQueueRef.current = [];
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  return { isPlaying, play, stop };
}

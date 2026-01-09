import { useCallback, useEffect, useRef, useState } from 'react';

interface UseGeminiLiveProps {
  apiKey: string;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAudioData?: (audioData: Int16Array) => void;
  onError?: (error: Error) => void;
}

export function useGeminiLive({
  apiKey,
  onTranscript,
  onAudioData,
  onError,
}: UseGeminiLiveProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  // WebSocket 연결
  const connect = useCallback(async () => {
    try {
      const ws = new WebSocket(
        `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`
      );

      ws.onopen = () => {
        console.log('✅ Gemini Live API 연결됨');
        setIsConnected(true);

        // 초기 설정 메시지
        ws.send(JSON.stringify({
          setup: {
            model: 'models/gemini-2.0-flash-exp',
            generation_config: {
              response_modalities: ['AUDIO'],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: 'Aoede',
                  },
                },
              },
            },
          },
        }));
      };

      ws.onmessage = async (event) => {
        try {
          // Blob 데이터인 경우 텍스트로 변환
          let data = event.data;
          if (data instanceof Blob) {
            data = await data.text();
          }
          
          const response = JSON.parse(data);

          // 서버 응답 (텍스트 전사)
          if (response.serverContent?.modelTurn) {
            const parts = response.serverContent.modelTurn.parts || [];
            for (const part of parts) {
              if (part.text && onTranscript) {
                onTranscript(part.text, true);
              }
              if (part.inlineData?.data && onAudioData) {
                // Base64 PCM 오디오 디코딩
                const audioBytes = base64ToInt16Array(part.inlineData.data);
                onAudioData(audioBytes);
              }
            }
          }

          // 중간 전사 결과
          if (response.serverContent?.turnComplete === false && onTranscript) {
            const text = response.serverContent.modelTurn?.parts?.[0]?.text;
            if (text) onTranscript(text, false);
          }
        } catch (err) {
          console.error('메시지 파싱 오류:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket 오류:', error);
        if (onError) onError(new Error('WebSocket connection failed'));
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('🔌 연결 종료');
        setIsConnected(false);
        setIsStreaming(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('연결 실패:', error);
      if (onError) onError(error as Error);
    }
  }, [apiKey, onTranscript, onAudioData, onError]);

  // 마이크 스트리밍 시작
  const startStreaming = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket 연결되지 않음');
      return;
    }

    try {
      // 마이크 권한
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;

      // AudioContext 생성
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      // AudioWorklet으로 실시간 PCM 추출
      await audioContext.audioWorklet.addModule('/audio-processor.js');

      const source = audioContext.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(audioContext, 'audio-processor');

      worklet.port.onmessage = (event) => {
        const pcmData = event.data; // Float32Array

        // Float32 → Int16 변환
        const int16Data = float32ToInt16(pcmData);

        // Base64 인코딩
        const base64Audio = int16ToBase64(int16Data);

        // Gemini로 전송
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: 'audio/pcm',
                data: base64Audio,
              }],
            },
          }));
        }
      };

      source.connect(worklet);
      worklet.connect(audioContext.destination);
      workletNodeRef.current = worklet;

      setIsStreaming(true);
      console.log('🎤 스트리밍 시작');
    } catch (error) {
      console.error('스트리밍 시작 실패:', error);
      if (onError) onError(error as Error);
    }
  }, [onError]);

  // 스트리밍 중단
  const stopStreaming = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    setIsStreaming(false);
    console.log('⏹️ 스트리밍 중단');
  }, []);

  // 연결 종료
  const disconnect = useCallback(() => {
    stopStreaming();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, [stopStreaming]);

  // Cleanup
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isStreaming,
    connect,
    startStreaming,
    stopStreaming,
    disconnect,
  };
}

// 유틸리티 함수들
function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

function int16ToBase64(int16Array: Int16Array): string {
  const bytes = new Uint8Array(int16Array.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

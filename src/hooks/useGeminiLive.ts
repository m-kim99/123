import { useCallback, useEffect, useRef, useState } from 'react';
import { isRunningInApp, requestNativeMicrophonePermission } from '@/lib/appBridge';

interface UseGeminiLiveProps {
  apiKey: string;
  systemPrompt?: string;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onUserTranscript?: (text: string) => void;
  onAudioData?: (audioData: Int16Array) => void;
  onError?: (error: Error) => void;
}

export function useGeminiLive({
  apiKey,
  systemPrompt,
  onTranscript,
  onUserTranscript,
  onAudioData,
  onError,
}: UseGeminiLiveProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  // 연결 완료 resolve 함수를 저장할 ref
  const connectResolveRef = useRef<(() => void) | null>(null);

  // WebSocket 연결 - Promise로 setup 완료까지 대기
  const connect = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      try {
        // 이미 연결되어 있으면 바로 resolve
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          resolve();
          return;
        }

        const ws = new WebSocket(
          `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`
        );

        // setup 완료 시 resolve할 함수 저장
        connectResolveRef.current = resolve;

        ws.onopen = () => {
          console.log('✅ Gemini Live API 연결됨');
          
          // 초기 설정 메시지 - 시스템 프롬프트 포함
          const setupMessage: any = {
            setup: {
              model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
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
          };
          
          // 시스템 프롬프트가 있으면 추가
          if (systemPrompt) {
            setupMessage.setup.system_instruction = {
              parts: [{ text: systemPrompt }],
            };
          }
          
          ws.send(JSON.stringify(setupMessage));
        };

        ws.onmessage = async (event) => {
          try {
            // Blob 데이터인 경우 텍스트로 변환
            let data = event.data;
            if (data instanceof Blob) {
              data = await data.text();
            }
            
            const response = JSON.parse(data);
            
            // 디버그 로깅
            console.log('📩 Gemini 응답:', response);

            // setupComplete 응답 확인 - 이때 연결 완료
            if (response.setupComplete) {
              console.log('✅ Setup 완료');
              setIsConnected(true);
              if (connectResolveRef.current) {
                connectResolveRef.current();
                connectResolveRef.current = null;
              }
              return;
            }

            // 서버 응답 - 오디오 데이터 처리
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

            // AI 응답 전사 (outputTranscript) - 챗봇이 말한 내용
            if (response.serverContent?.outputTranscript && onTranscript) {
              console.log('🤖 AI 전사:', response.serverContent.outputTranscript);
              onTranscript(response.serverContent.outputTranscript, true);
            }
            
            // 사용자 음성 전사 (inputTranscript) - 사용자가 말한 내용
            if (response.serverContent?.inputTranscript && onUserTranscript) {
              console.log('🎤 사용자 전사:', response.serverContent.inputTranscript);
              onUserTranscript(response.serverContent.inputTranscript);
            }
          } catch (err) {
            console.error('메시지 파싱 오류:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket 오류:', error);
          if (onError) onError(new Error('WebSocket connection failed'));
          setIsConnected(false);
          reject(new Error('WebSocket connection failed'));
        };

        ws.onclose = (event) => {
          console.log('🔌 연결 종료, 코드:', event.code, '이유:', event.reason);
          setIsConnected(false);
          setIsStreaming(false);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('연결 실패:', error);
        if (onError) onError(error as Error);
        reject(error);
      }
    });
  }, [apiKey, systemPrompt, onTranscript, onUserTranscript, onAudioData, onError]);

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
                mimeType: 'audio/pcm;rate=16000',
                data: base64Audio,
              }],
            },
          }));
        }
      };
      
      console.log('🎤 오디오 컨텍스트 샘플레이트:', audioContext.sampleRate);

      source.connect(worklet);
      worklet.connect(audioContext.destination);
      workletNodeRef.current = worklet;

      setIsStreaming(true);
      console.log('🎤 스트리밍 시작');
    } catch (error) {
      console.error('스트리밍 시작 실패:', error);
      if (isRunningInApp()) {
        // 앱 환경: 네이티브 마이크 권한 요청
        requestNativeMicrophonePermission();
      }
      if (onError) onError(error as Error);
    }
  }, [onError]);

  // 스트리밍 중단 - 실제 스트리밍 중일 때만 동작
  const stopStreaming = useCallback(() => {
    const hasActiveResources = workletNodeRef.current || audioContextRef.current || mediaStreamRef.current;
    if (!hasActiveResources) return;

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

  // 연결 종료 - 실제 연결되어 있을 때만 동작
  const disconnect = useCallback(() => {
    const hasConnection = wsRef.current || workletNodeRef.current || audioContextRef.current || mediaStreamRef.current;
    if (!hasConnection) return;

    stopStreaming();
    if (wsRef.current) {
      console.log('🔌 연결 종료');
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, [stopStreaming]);

  // 텍스트를 Gemini에 보내서 음성 응답 받기
  const sendText = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    console.log('📤 텍스트 전송:', text);
    wsRef.current.send(JSON.stringify({
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text }],
        }],
        turnComplete: true,
      },
    }));
  }, []);

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
    sendText,
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

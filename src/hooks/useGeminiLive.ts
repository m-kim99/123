import { useCallback, useEffect, useRef, useState } from 'react';
import { isRunningInApp, requestNativeMicrophonePermission } from '@/lib/appBridge';
import { supabase } from '@/lib/supabase';

// apiKey는 props에서 제거 — Edge Function(get-gemini-key)을 통해 서버에서 발급받음
interface UseGeminiLiveProps {
  systemPrompt?: string;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onUserTranscript?: (text: string) => void;
  onAudioData?: (audioData: Int16Array) => void;
  onError?: (error: Error) => void;
}

export function useGeminiLive({
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

  // 연결 완료 resolve/reject 함수를 저장할 ref
  const connectResolveRef = useRef<(() => void) | null>(null);
  const connectRejectRef = useRef<((err: Error) => void) | null>(null);

  /**
   * 서버에서 Gemini API 키를 발급받는 함수
   * GEMINI_API_KEY는 Supabase Secrets에 저장되어 클라이언트 번들에 노출되지 않음
   */
  const fetchApiKey = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('get-gemini-key');
    if (error) {
      throw new Error(`Gemini 키 발급 실패: ${error.message}`);
    }
    if (!data?.apiKey) {
      throw new Error('Gemini API 키를 받지 못했습니다');
    }
    return data.apiKey as string;
  }, []);

  // WebSocket 연결 - Promise로 setup 완료까지 대기
  const connect = useCallback(() => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        // 이미 연결되어 있으면 바로 resolve
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          resolve();
          return;
        }

        // API 키를 서버에서 발급받음 (클라이언트 번들에 포함되지 않음)
        const apiKey = await fetchApiKey();

        const ws = new WebSocket(
          `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`
        );

        // setup 완료 시 resolve/reject할 함수 저장
        connectResolveRef.current = resolve;
        connectRejectRef.current = reject;

        ws.onopen = () => {
          console.log('✅ Gemini Live API 연결됨');

          // 초기 설정 메시지 - 시스템 프롬프트 포함
          const setupMessage: Record<string, unknown> = {
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
            (setupMessage.setup as Record<string, unknown>).system_instruction = {
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

            // setupComplete 응답 확인 - 이때 연결 완료
            if (response.setupComplete) {
              console.log('✅ Setup 완료');
              setIsConnected(true);
              if (connectResolveRef.current) {
                connectResolveRef.current();
                connectResolveRef.current = null;
                connectRejectRef.current = null;
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
                  const audioBytes = base64ToInt16Array(part.inlineData.data);
                  onAudioData(audioBytes);
                }
              }
            }

            // AI 응답 전사
            if (response.serverContent?.outputTranscript && onTranscript) {
              onTranscript(response.serverContent.outputTranscript, true);
            }

            // 사용자 음성 전사
            if (response.serverContent?.inputTranscript && onUserTranscript) {
              onUserTranscript(response.serverContent.inputTranscript);
            }
          } catch (err) {
            console.error('메시지 파싱 오류:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket 오류:', error);
          const err = new Error('WebSocket connection failed');
          if (onError) onError(err);
          setIsConnected(false);
          // reject 후 ref 정리
          if (connectRejectRef.current) {
            connectRejectRef.current(err);
            connectResolveRef.current = null;
            connectRejectRef.current = null;
          }
        };

        ws.onclose = (event) => {
          console.log('🔌 연결 종료, 코드:', event.code, '이유:', event.reason);
          setIsConnected(false);
          setIsStreaming(false);
          // setupComplete 전에 닫히면 reject
          if (connectRejectRef.current) {
            connectRejectRef.current(new Error('WebSocket closed before setup complete'));
            connectResolveRef.current = null;
            connectRejectRef.current = null;
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('연결 실패:', error);
        if (onError) onError(error as Error);
        reject(error);
      }
    });
  }, [fetchApiKey, systemPrompt, onTranscript, onUserTranscript, onAudioData, onError]);

  // 마이크 스트리밍 시작
  const startStreaming = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket 연결되지 않음');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      await audioContext.audioWorklet.addModule('/audio-processor.js');

      const source = audioContext.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(audioContext, 'audio-processor');

      worklet.port.onmessage = (event) => {
        const pcmData = event.data as Float32Array;
        const int16Data = float32ToInt16(pcmData);
        const base64Audio = int16ToBase64(int16Data);

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

      // worklet을 destination에 연결하지 않음 — 에코/피드백 루프 방지
      source.connect(worklet);
      workletNodeRef.current = worklet;

      setIsStreaming(true);
      console.log('🎤 스트리밍 시작');
    } catch (error) {
      console.error('스트리밍 시작 실패:', error);
      if (isRunningInApp()) {
        requestNativeMicrophonePermission();
      }
      if (onError) onError(error as Error);
    }
  }, [onError]);

  // 스트리밍 중단
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

  // 연결 종료
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

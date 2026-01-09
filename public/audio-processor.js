class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096; // 16kHz * 0.256s
    this.buffer = [];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0]; // Mono

      // 버퍼에 추가
      for (let i = 0; i < channelData.length; i++) {
        this.buffer.push(channelData[i]);
      }

      // 버퍼 크기에 도달하면 전송
      if (this.buffer.length >= this.bufferSize) {
        const chunk = new Float32Array(this.buffer.splice(0, this.bufferSize));
        this.port.postMessage(chunk);
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);

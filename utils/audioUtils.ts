
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function concatenateAudioBuffers(context: AudioContext, buffers: AudioBuffer[]): AudioBuffer {
  if (!buffers || buffers.length === 0) {
    // Return a silent, tiny buffer if there's nothing to concatenate
    return context.createBuffer(1, 1, context.sampleRate);
  }

  const totalLength = buffers.reduce((acc, buffer) => acc + buffer.length, 0);
  const numberOfChannels = buffers[0].numberOfChannels;
  const sampleRate = buffers[0].sampleRate;

  const result = context.createBuffer(numberOfChannels, totalLength, sampleRate);

  let offset = 0;
  for (const buffer of buffers) {
    if (buffer.numberOfChannels !== numberOfChannels) {
      console.warn("Mismatched channel counts in audio buffers, skipping a buffer.");
      continue;
    }
    for (let channel = 0; channel < numberOfChannels; channel++) {
      result.getChannelData(channel).set(buffer.getChannelData(channel), offset);
    }
    offset += buffer.length;
  }

  return result;
}
import { GoogleGenAI, Modality } from '@google/genai';

export const transcribeMedia = async (ai: GoogleGenAI, mediaPart: {mimeType: string, data: string}): Promise<string> => {
  const prompt = `You are an expert transcriptionist. Transcribe all spoken words from the provided video or audio. Output only the transcribed text, with no extra formatting or commentary. If there is no speech, return an empty string.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: mediaPart },
          { text: prompt }
        ]
      },
    });
    return response.text;
  } catch (error) {
    console.error('Error during transcription:', error);
    throw new Error('Transcription failed. The media format might be unsupported, the file could be corrupt, or it is too large. Please try a different file.');
  }
};

export const translateText = async (ai: GoogleGenAI, text: string, targetLanguage: string): Promise<string> => {
  if (!text.trim()) {
    return ""; // Return empty if transcription is empty
  }
  const prompt = `Translate the following text to ${targetLanguage}. Provide only the translated text, without any additional commentary or quotation marks: "${text}"`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error('Error during translation:', error);
    throw new Error('Translation failed. The AI was unable to translate the text. Please try again.');
  }
};

export const generateSpeech = async (ai: GoogleGenAI, text: string, voiceName: string): Promise<string> => {
    if (!text.trim()) {
      return ""; // Return empty if translation is empty
    }
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });

        if (response.candidates && response.candidates[0].content.parts[0].inlineData) {
            return response.candidates[0].content.parts[0].inlineData.data;
        } else {
            throw new Error("Speech generation failed: No audio data was returned. This can happen with very short text segments.");
        }
    } catch (error) {
        console.error('Error generating speech:', error);
        if (error instanceof Error && error.message.includes("No audio data")) {
            throw error; // Re-throw the specific error from above
        }
        throw new Error('Speech generation failed. The AI voice service may be temporarily unavailable or the selected voice does not support the language.');
    }
};
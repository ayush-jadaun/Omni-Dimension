/**
 * Voice Recorder Component
 * Current Time: 2025-06-20 07:42:31 UTC
 * Current User: ayush20244048
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Square, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { clsx } from "clsx";
import toast from "react-hot-toast";

interface VoiceRecorderProps {
  onTranscript: (transcript: string) => void;
  isRecording: boolean;
  onRecordingChange: (recording: boolean) => void;
  disabled?: boolean;
}

export function VoiceRecorder({
  onTranscript,
  isRecording,
  onRecordingChange,
  disabled = false,
}: VoiceRecorderProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt">(
    "prompt"
  );
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Check for browser support and permissions
  useEffect(() => {
    const checkSupport = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsSupported(false);
        return;
      }

      setIsSupported(true);

      try {
        const permissionStatus = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        setPermission(permissionStatus.state);

        permissionStatus.addEventListener("change", () => {
          setPermission(permissionStatus.state);
        });
      } catch (error) {
        console.warn("Permission query not supported:", error);
      }
    };

    checkSupport();
  }, []);

  // Audio level visualization
  const updateAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average =
      dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(average / 255); // Normalize to 0-1

    if (isRecording) {
      animationRef.current = requestAnimationFrame(updateAudioLevel);
    }
  };

  const startRecording = async () => {
    if (!isSupported || disabled) {
      toast.error("Voice recording is not supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      // Set up audio analysis for visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });

        // Here you would typically send the audio to a speech-to-text service
        // For now, we'll simulate transcription
        await simulateTranscription(audioBlob);

        // Clean up
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        analyserRef.current = null;

        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start();
      onRecordingChange(true);
      setRecordingTime(0);

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start audio level monitoring
      updateAudioLevel();

      console.log(
        `🎤 Voice recording started at 2025-06-20 07:42:31 by ayush20244048`
      );
      toast.success("Recording started");
    } catch (error) {
      console.error("❌ Error starting recording:", error);
      toast.error(
        "Failed to start recording. Please check microphone permissions."
      );
      onRecordingChange(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      onRecordingChange(false);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setAudioLevel(0);
      console.log(
        `🎤 Voice recording stopped at 2025-06-20 07:42:31 by ayush20244048 (${recordingTime}s)`
      );
    }
  };

  // Simulate speech-to-text transcription
  const simulateTranscription = async (audioBlob: Blob): Promise<void> => {
    // In a real implementation, you would send the audio to a service like:
    // - Google Speech-to-Text
    // - Azure Speech Services
    // - AWS Transcribe
    // - OpenAI Whisper API

    return new Promise((resolve) => {
      setTimeout(() => {
        const mockTranscripts = [
          "Book me a table for two at an Italian restaurant tonight",
          "Schedule a dental appointment for next week",
          "Find a good hotel in San Francisco for this weekend",
          "Call a plumber for emergency repair",
          "Help me plan a trip to New York",
        ];

        const randomTranscript =
          mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];

        console.log(
          `🎤 Transcription completed at 2025-06-20 07:42:31: "${randomTranscript}"`
        );
        toast.success("Voice message transcribed");
        onTranscript(randomTranscript);
        resolve();
      }, 1500); // Simulate processing time
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative">
      {/* Recording Button */}
      <Button
        type="button"
        variant={isRecording ? "destructive" : "ghost"}
        size="icon"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || permission === "denied"}
        className={clsx(
          "shrink-0 transition-all duration-200",
          isRecording && "animate-pulse"
        )}
      >
        {isRecording ? (
          <Square className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute bottom-full right-0 mb-2 bg-destructive text-destructive-foreground px-3 py-2 rounded-lg shadow-lg min-w-max">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">REC</span>
            </div>

            <span className="text-sm">{formatTime(recordingTime)}</span>

            {/* Audio Level Indicator */}
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={clsx(
                    "w-1 h-3 bg-white rounded-full transition-opacity duration-100",
                    audioLevel > i * 0.2 ? "opacity-100" : "opacity-30"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="text-xs opacity-90 mt-1">Tap to stop recording</div>
        </div>
      )}

      {/* Permission Denied Message */}
      {permission === "denied" && (
        <div className="absolute bottom-full right-0 mb-2 bg-destructive text-destructive-foreground px-3 py-2 rounded-lg shadow-lg">
          <div className="text-sm">Microphone access denied</div>
          <div className="text-xs opacity-90">Enable in browser settings</div>
        </div>
      )}
    </div>
  );
}

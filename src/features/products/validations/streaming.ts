import { ValidationError } from "./validators";

export type ValidationStream = {
  id: string;
  status: 'pending' | 'validating' | 'completed' | 'error';
  progress: number;
  currentField?: string;
  errors: ValidationError[];
  data?: any;
};

export type StreamValidationOptions = {
  debounceMs?: number;
  fields?: string[];
  onProgress?: (stream: ValidationStream) => void;
  onComplete?: (stream: ValidationStream) => void;
  onError?: (stream: ValidationStream) => void;
};

class ValidationStreamer {
  private streams = new Map<string, ValidationStream>();
  private timers = new Map<string, NodeJS.Timeout>();

  createStream(id: string, options: StreamValidationOptions = {}): ValidationStream {
    const stream: ValidationStream = {
      id,
      status: 'pending',
      progress: 0,
      errors: [],
    };

    this.streams.set(id, stream);
    return stream;
  }

  async streamValidation(
    id: string,
    data: Record<string, any>,
    validator: (data: any) => Promise<{ success: boolean; errors: ValidationError[] }>,
    options: StreamValidationOptions = {}
  ): Promise<void> {
    const { debounceMs = 300, fields, onProgress, onComplete, onError } = options;

    // Clear existing timer
    const existingTimer = this.timers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Debounce validation
    const timer = setTimeout(async () => {
      const stream = this.streams.get(id);
      if (!stream) return;

      try {
        stream.status = 'validating';
        stream.progress = 0;
        onProgress?.(stream);

        // Validate fields incrementally if specified
        if (fields) {
          const totalFields = fields.length;
          const fieldErrors: ValidationError[] = [];

          for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            stream.currentField = field;
            stream.progress = ((i + 1) / totalFields) * 100;
            
            // Validate individual field
            const fieldData = { [field]: data[field] };
            const result = await validator(fieldData);
            
            if (!result.success) {
              fieldErrors.push(...result.errors);
            }

            onProgress?.(stream);
            
            // Small delay to show progress
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          stream.errors = fieldErrors;
          stream.status = fieldErrors.length > 0 ? 'error' : 'completed';
        } else {
          // Validate entire object
          const result = await validator(data);
          stream.errors = result.success ? [] : result.errors;
          stream.status = result.success ? 'completed' : 'error';
          stream.progress = 100;
        }

        stream.data = data;
        stream.currentField = undefined;

        if (stream.status === 'completed') {
          onComplete?.(stream);
        } else {
          onError?.(stream);
        }

      } catch (error) {
        stream.status = 'error';
        stream.errors = [{
          field: 'stream',
          message: error instanceof Error ? error.message : 'Stream validation failed',
          code: 'stream_error'
        }];
        onError?.(stream);
      }

      this.timers.delete(id);
    }, debounceMs);

    this.timers.set(id, timer);
  }

  getStream(id: string): ValidationStream | undefined {
    return this.streams.get(id);
  }

  cancelStream(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    const stream = this.streams.get(id);
    if (stream) {
      stream.status = 'error';
      stream.errors = [{
        field: 'stream',
        message: 'Validation cancelled',
        code: 'cancelled'
      }];
    }
  }

  cleanup(id: string): void {
    this.cancelStream(id);
    this.streams.delete(id);
  }

  getAllStreams(): ValidationStream[] {
    return Array.from(this.streams.values());
  }
}

export const validationStreamer = new ValidationStreamer();

// React hook for streaming validation
export function useStreamValidation(
  id: string,
  options: StreamValidationOptions = {}
) {
  const stream = validationStreamer.getStream(id) || validationStreamer.createStream(id, options);

  const startValidation = async (
    data: Record<string, any>,
    validator: (data: any) => Promise<{ success: boolean; errors: ValidationError[] }>
  ) => {
    await validationStreamer.streamValidation(id, data, validator, options);
  };

  const cancelValidation = () => {
    validationStreamer.cancelStream(id);
  };

  const cleanup = () => {
    validationStreamer.cleanup(id);
  };

  return {
    stream,
    startValidation,
    cancelValidation,
    cleanup
  };
}

// Server-Sent Events for real-time validation updates
export function createValidationSSE(streamId: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      const sendUpdate = (stream: ValidationStream) => {
        const data = `data: ${JSON.stringify(stream)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      // Send initial state
      const stream = validationStreamer.getStream(streamId);
      if (stream) {
        sendUpdate(stream);
      }

      // Set up listeners
      const options: StreamValidationOptions = {
        onProgress: sendUpdate,
        onComplete: (stream) => {
          sendUpdate(stream);
          controller.close();
        },
        onError: (stream) => {
          sendUpdate(stream);
          controller.close();
        }
      };

      // Store options for this stream
      if (stream) {
        Object.assign(stream, options);
      }
    },

    cancel() {
      validationStreamer.cancelStream(streamId);
    }
  });
}
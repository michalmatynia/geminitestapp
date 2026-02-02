import { ValidationError } from "./validators";

export type ValidationStream = {
  id: string;
  status: 'pending' | 'validating' | 'completed' | 'error';
  progress: number;
  currentField?: string | undefined;
  errors: ValidationError[];
  data?: unknown;
};

export type StreamValidationOptions = {
  debounceMs?: number | undefined;
  fields?: string[] | undefined;
  onProgress?: ((stream: ValidationStream) => void) | undefined;
  onComplete?: ((stream: ValidationStream) => void) | undefined;
  onError?: ((stream: ValidationStream) => void) | undefined;
};

class ValidationStreamer {
  private streams: Map<string, ValidationStream> = new Map<string, ValidationStream>();
  private timers: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>();

  createStream(id: string, _options: StreamValidationOptions = {}): ValidationStream {
    const stream: ValidationStream = {
      id,
      status: 'pending',
      progress: 0,
      errors: [],
    };

    this.streams.set(id, stream);
    return stream;
  }

  streamValidation(
    id: string,
    data: Record<string, unknown>,
    validator: (data: unknown) => Promise<{ success: boolean; errors: ValidationError[] }>,
    options: StreamValidationOptions = {}
  ): void {
    const { debounceMs = 300, fields, onProgress, onComplete, onError } = options;

    // Clear existing timer
    const existingTimer = this.timers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Debounce validation
    const timer = setTimeout((): void => {
      void (async (): Promise<void> => {
        const stream: ValidationStream | undefined = this.streams.get(id);
        if (!stream) return;

        try {
          stream.status = 'validating';
          stream.progress = 0;
          onProgress?.(stream);

          // Validate fields incrementally if specified
          if (fields) {
            const totalFields: number = fields.length;
            const fieldErrors: ValidationError[] = [];

            for (let i: number = 0; i < fields.length; i++) {
              const field: string | undefined = fields[i];
              if (field === undefined) continue;
              
              stream.currentField = field;
              stream.progress = ((i + 1) / totalFields) * 100;
              
              // Validate individual field
              const fieldData: Record<string, unknown> = { [field]: data[field] };
              const result = await validator(fieldData);
              
              if (!result.success) {
                fieldErrors.push(...result.errors);
              }

              onProgress?.(stream);
              
              // Small delay to show progress
              await new Promise((resolve: (value: void) => void) => setTimeout(resolve, 10));
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

        } catch (error: unknown) {
          stream.status = 'error';
          stream.errors = [{
            field: 'stream',
            message: error instanceof Error ? error.message : 'Stream validation failed',
            code: 'stream_error',
            severity: 'high'
          }];
          onError?.(stream);
        }

        this.timers.delete(id);
      })();
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
        code: 'cancelled',
        severity: 'low'
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
): {
  stream: ValidationStream;
  startValidation: (data: Record<string, unknown>, validator: (data: unknown) => Promise<{ success: boolean; errors: ValidationError[] }>) => Promise<void>;
  cancelValidation: () => void;
  cleanup: () => void;
} {
  const stream: ValidationStream = validationStreamer.getStream(id) || validationStreamer.createStream(id, options);

  const startValidation = (
    data: Record<string, unknown>,
    validator: (data: unknown) => Promise<{ success: boolean; errors: ValidationError[] }>
  ): Promise<void> => {
    validationStreamer.streamValidation(id, data, validator, options);
    return Promise.resolve();
  };

  const cancelValidation = (): void => {
    validationStreamer.cancelStream(id);
  };

  const cleanup = (): void => {
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
    start(controller: ReadableStreamDefaultController): void {
      const encoder: TextEncoder = new TextEncoder();
      
      const sendUpdate = (stream: ValidationStream): void => {
        const data: string = `data: ${JSON.stringify(stream)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      // Send initial state
      const stream: ValidationStream | undefined = validationStreamer.getStream(streamId);
      if (stream) {
        sendUpdate(stream);
      }

      // Set up listeners
      const options: StreamValidationOptions = {
        onProgress: sendUpdate,
        onComplete: (stream: ValidationStream): void => {
          sendUpdate(stream);
          controller.close();
        },
        onError: (stream: ValidationStream): void => {
          sendUpdate(stream);
          controller.close();
        }
      };

      // Store options for this stream
      if (stream) {
        Object.assign(stream, options);
      }
    },

    cancel(): void {
      validationStreamer.cancelStream(streamId);
    }
  });
}

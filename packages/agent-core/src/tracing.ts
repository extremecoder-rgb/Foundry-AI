import { trace, Tracer, Span, SpanStatusCode } from '@opentelemetry/api';

const TRACER_NAME = 'foundry-ai-agent-tracer';

export class AgentTracer {
  private static tracer: Tracer = trace.getTracer(TRACER_NAME);

  static getTracer(): Tracer {
    return this.tracer;
  }

  static startSpan(name: string, parentSpan?: Span): Span {
    if (parentSpan) {
      const context = trace.setSpan(trace.getActiveSpan() || (null as any), parentSpan);
      return this.tracer.startSpan(name, undefined, context);
    }
    return this.tracer.startSpan(name);
  }

  static async traceCall<T>(
    name: string,
    attributes: Record<string, any>,
    fn: (span: Span) => Promise<T>
  ): Promise<T> {
    const span = this.tracer.startSpan(name, { attributes });
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
}

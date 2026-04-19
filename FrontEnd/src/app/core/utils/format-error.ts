import { HttpErrorResponse } from '@angular/common/http';

/**
 * Formata erros vindos do backend FastAPI em uma string legivel.
 *
 * - `detail` como string (HTTPException): retorna a string.
 * - `detail` como array (validacao Pydantic): concatena os `msg` com caminho do campo.
 * - Fallbacks para network errors e fallback generico.
 */
export function formatApiError(err: unknown, fallback = 'Erro inesperado'): string {
  if (!(err instanceof HttpErrorResponse)) {
    return fallback;
  }
  if (err.status === 0) {
    return 'Nao foi possivel conectar ao servidor. O backend esta rodando?';
  }

  const body = err.error as { detail?: unknown } | null;
  const detail = body?.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: unknown[]; msg?: string }) => {
        const field = Array.isArray(d.loc) ? d.loc.slice(1).join('.') : '';
        return field ? `${field}: ${d.msg}` : (d.msg ?? String(d));
      })
      .join('; ');
  }

  return err.message || fallback;
}

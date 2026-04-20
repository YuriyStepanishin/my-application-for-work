import { API_URL } from './config';
import type {
  MessageApiResponse,
  MessageFeedbackPayload,
  MessageItem,
  SendMessagePayload,
} from '../types/message';

const MESSAGES_ACTION = 'getMessages';
const SEND_MESSAGE_ACTION = 'sendMessage';
const SEND_FEEDBACK_ACTION = 'sendFeedback';
const MARK_READ_ACTION = 'markMessagesRead';

interface RawMessage {
  id?: unknown;
  title?: unknown;
  body?: unknown;
  senderEmail?: unknown;
  senderName?: unknown;
  recipients?: unknown;
  audience?: unknown;
  createdAt?: unknown;
  replyToId?: unknown;
  requiresFeedback?: unknown;
  feedbackCount?: unknown;
  isRead?: unknown;
}

interface RawMessageListResponse {
  data?: RawMessage[];
}

function buildQuery(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `${API_URL}?${search.toString()}`;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error('Не вдалося виконати запит до сервера повідомлень');
  }

  return response.json() as Promise<T>;
}

function normalizeMessage(raw: RawMessage): MessageItem {
  const recipients = Array.isArray(raw.recipients)
    ? raw.recipients.filter(
        (recipient): recipient is string => typeof recipient === 'string'
      )
    : typeof raw.recipients === 'string'
      ? raw.recipients
          .split(',')
          .map((recipient: string) => recipient.trim())
          .filter(Boolean)
      : [];

  return {
    id: String(raw.id ?? raw.createdAt ?? crypto.randomUUID()),
    title: String(raw.title ?? 'Без теми'),
    body: String(raw.body ?? ''),
    senderEmail: String(raw.senderEmail ?? ''),
    senderName: typeof raw.senderName === 'string' ? raw.senderName : undefined,
    recipients,
    audience:
      raw.audience === 'feedback' || raw.audience === 'direct'
        ? raw.audience
        : 'all',
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    replyToId: typeof raw.replyToId === 'string' ? raw.replyToId : undefined,
    requiresFeedback: Boolean(raw.requiresFeedback),
    feedbackCount:
      typeof raw.feedbackCount === 'number' ? raw.feedbackCount : undefined,
    isRead: Boolean(raw.isRead),
  };
}

export async function fetchMessages(userEmail: string): Promise<MessageItem[]> {
  if (!userEmail) return [];

  const response = await fetch(
    buildQuery({ action: MESSAGES_ACTION, userEmail })
  );
  const json = await parseJsonResponse<RawMessageListResponse>(response);

  return (json.data ?? []).map(item => normalizeMessage(item));
}

async function postMessageAction<TPayload>(
  action: string,
  payload: TPayload
): Promise<MessageApiResponse> {
  const formData = new FormData();

  formData.append(
    'data',
    JSON.stringify({
      action,
      ...payload,
    })
  );

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
    });

    return parseJsonResponse<MessageApiResponse>(response);
  } catch (error) {
    console.error(`${action} error:`, error);
    return {
      success: false,
      error: 'Network error',
    };
  }
}

export function sendMessage(payload: SendMessagePayload) {
  return postMessageAction(SEND_MESSAGE_ACTION, payload);
}

export function sendFeedback(payload: MessageFeedbackPayload) {
  return postMessageAction(SEND_FEEDBACK_ACTION, payload);
}

export function markMessagesRead(messageIds: string[], userEmail: string) {
  return postMessageAction(MARK_READ_ACTION, {
    messageIds,
    userEmail,
  });
}

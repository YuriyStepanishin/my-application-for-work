import { useMemo } from 'react';
import styles from './InfoBoardPage.module.css';
import { getUserRole } from '../../config/userRoles';
import { useMessagesCenter } from '../../hooks/useMessagesCenter';

import type {
  MessageItem,
  SendMessagePayload,
  MessageFeedbackPayload,
} from '../../types/message';
import type { Attachment } from '../../types/photo';

interface Props {
  userEmail: string;
  onBack: () => void;
  messagesCenter?: ReturnType<typeof useMessagesCenter>;
}

// --- InfoBoardComposePanel ---
type InfoBoardComposePanelProps = {
  userEmail: string;
  sendMessage: (
    payload: SendMessagePayload & { attachments?: Attachment[] }
  ) => Promise<{ success: boolean; error?: string }>;
  isSending: boolean;
};
function InfoBoardComposePanel(props: InfoBoardComposePanelProps) {
  // TODO: реалізувати форму додавання оголошення
  return (
    <div className={styles.composePanel}>
      <button className={styles.addButton} disabled={props.isSending}>
        + Додати оголошення
      </button>
      {/* TODO: форма додавання/редагування */}
    </div>
  );
}

// --- AgentFeedbackBox ---
type AgentFeedbackBoxProps = {
  messageId: string;
  userEmail: string;
  sendFeedback: (
    payload: MessageFeedbackPayload
  ) => Promise<{ success: boolean; error?: string }>;
  isSending: boolean;
};
function AgentFeedbackBox(props: AgentFeedbackBoxProps) {
  // TODO: реалізувати форму коментаря
  return (
    <div className={styles.feedbackBox}>
      <textarea placeholder="Ваш коментар..." disabled={props.isSending} />
      <button className={styles.sendButton} disabled={props.isSending}>
        Надіслати
      </button>
      {/* TODO: реалізувати відправку коментаря */}
    </div>
  );
}

export default function InfoBoardPage({
  userEmail,
  onBack,
  messagesCenter,
}: Props) {
  const localCenter = useMessagesCenter(userEmail);
  const center = messagesCenter ?? localCenter;
  const userRole = useMemo(() => getUserRole(userEmail), [userEmail]);
  const isAdmin = userRole === 'admin';
  const isSupervisor = userRole === 'supervisor';
  const isManager = isAdmin || isSupervisor;
  const isAgent = userRole === 'agent';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          ← Назад
        </button>
        <h1 className={styles.title}>Дошка інформації</h1>
      </div>

      {/* Додавання оголошення — лише для керівника/супервайзера */}
      {isManager && (
        <InfoBoardComposePanel
          userEmail={userEmail}
          sendMessage={center.sendMessage}
          isSending={center.isSendingMessage}
        />
      )}

      {/* Список оголошень */}
      <div className={styles.inboxPanel}>
        {center.isLoading ? (
          <div>Завантаження...</div>
        ) : center.messages.length === 0 ? (
          <div>Немає оголошень</div>
        ) : (
          (center.messages as MessageItem[]).map(msg => (
            <div key={msg.id} className={styles.messageCard}>
              <div className={styles.messageHeader}>
                <b>{msg.title}</b>
                <span className={styles.messageMeta}>
                  {msg.senderName || msg.senderEmail} |{' '}
                  {new Date(msg.createdAt).toLocaleString('uk-UA')}
                </span>
              </div>
              <div className={styles.messageBody}>{msg.body}</div>

              {/* Відображення прикріплених файлів */}
              {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                <div className={styles.attachmentsBox}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Файли:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(msg.attachments as Attachment[]).map((file, idx) => {
                      if (!file.url) return null;
                      const type = file.type || '';
                      if (type.startsWith('image/')) {
                        return (
                          <img
                            key={idx}
                            src={file.url}
                            alt={file.name}
                            style={{
                              maxWidth: 120,
                              maxHeight: 120,
                              borderRadius: 8,
                            }}
                          />
                        );
                      }
                      if (type === 'application/pdf') {
                        return (
                          <embed
                            key={idx}
                            src={file.url}
                            type="application/pdf"
                            width="120"
                            height="120"
                            style={{ borderRadius: 8 }}
                          />
                        );
                      }
                      if (
                        type.includes('excel') ||
                        (file.name || '').endsWith('.xls') ||
                        (file.name || '').endsWith('.xlsx')
                      ) {
                        return (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block' }}
                          >
                            {file.name}
                          </a>
                        );
                      }
                      if (
                        type.includes('word') ||
                        (file.name || '').endsWith('.doc') ||
                        (file.name || '').endsWith('.docx')
                      ) {
                        return (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block' }}
                          >
                            {file.name}
                          </a>
                        );
                      }
                      return (
                        <a
                          key={idx}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'block' }}
                        >
                          {file.name || 'Файл'}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Для агентів — поле для коментаря */}
              {isAgent && (
                <AgentFeedbackBox
                  messageId={msg.id}
                  userEmail={userEmail}
                  sendFeedback={center.sendFeedback}
                  isSending={center.isSendingFeedback}
                />
              )}

              {/* Для керівника/супервайзера — кнопки редагування/видалення */}
              {isManager && (
                <div className={styles.messageActions}>
                  <button className={styles.editButton} disabled>
                    Редагувати
                  </button>
                  <button className={styles.deleteButton} disabled>
                    Видалити
                  </button>
                  {/* TODO: реалізувати редагування/видалення */}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

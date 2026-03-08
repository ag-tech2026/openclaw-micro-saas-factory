import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatbotConfig {
  /** Custom system prompt based on your product */
  systemPrompt?: string;
  /** Email address for fallback support */
  supportEmail?: string;
  /** Placeholder text for the input field */
  inputPlaceholder?: string;
  /** Title shown in the chat header */
  title?: string;
  /** Initial welcome message */
  welcomeMessage?: string;
  /** Confidence threshold (0-1) below which to trigger email fallback */
  confidenceThreshold?: number;
}

interface ChatbotProps extends ChatbotConfig {
  className?: string;
}

/**
 * Generate a unique ID for messages
 */
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if the AI response indicates uncertainty
 */
function isUncertain(response: string): boolean {
  const uncertainty indicators = [
    "i don't know",
    "i'm not sure",
    "i cannot",
    "unable to",
    "don't have enough information",
    "cannot answer",
    "not certain",
    "might be",
    "possibly",
    "perhaps",
    "i'm sorry",
    "apologize",
    "don't have access",
    "outside my knowledge",
    "beyond my training",
    "i'm not familiar",
    "i don't have information",
    "unable to provide",
    "cannot help with",
    "not able to assist",
  ];

  const lowerResponse = response.toLowerCase();
  return uncertaintyIndicators.some((indicator) => lowerResponse.includes(indicator));
}

/**
 * Custom hook for chatbot API interactions
 */
export function useChatbot(config: ChatbotConfig = {}) {
  const {
    systemPrompt = "You are a helpful customer support assistant. Answer questions concisely and accurately. If you're unsure, indicate that you'll escalate to email support.",
    supportEmail = "support@example.com",
    confidenceThreshold = 0.7,
  } = config;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useEmailFallback, setUseEmailFallback] = useState(false);

  // Initialize with welcome message if configured
  useEffect(() => {
    if (config.welcomeMessage && messages.length === 0) {
      setMessages([
        {
          id: generateId(),
          role: 'assistant',
          content: config.welcomeMessage!,
          timestamp: new Date(),
        },
      ]);
    }
  }, [config.welcomeMessage]);

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      if (!content.trim()) return;

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);
      setUseEmailFallback(false);

      try {
        const response = await fetch('/api/chatbot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            history: messages.map(({ role, content }) => ({ role, content })),
            systemPrompt,
            confidenceThreshold,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to get response');
        }

        const data = await response.json();

        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Check if we should use email fallback
        if (data.useEmailFallback || isUncertain(data.message)) {
          setUseEmailFallback(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setUseEmailFallback(true);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, systemPrompt, confidenceThreshold]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setUseEmailFallback(false);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    useEmailFallback,
    sendMessage,
    clearHistory,
  };
}

/**
 * Chatbot Component - Floating AI customer support chatbot
 */
export function Chatbot({
  className,
  systemPrompt,
  supportEmail = "support@example.com",
  inputPlaceholder = "Type your message...",
  title = "Support Chat",
  welcomeMessage,
  confidenceThreshold,
}: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isLoading,
    error,
    useEmailFallback,
    sendMessage,
    clearHistory,
  } = useChatbot({
    systemPrompt,
    supportEmail,
    welcomeMessage,
    confidenceThreshold,
  });

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    await sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={cn('fixed bottom-4 right-4 z-50', className)}>
      {/* Chat Window */}
      {isOpen && (
        <Card className="mb-4 w-80 sm:w-96 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <h3 className="font-semibold">{title}</h3>
              {useEmailFallback && (
                <p className="text-xs text-muted-foreground">
                  We&apos;ll respond via email
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </Button>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                <p>Start a conversation...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex flex-col',
                      message.role === 'user' ? 'items-end' : 'items-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      )}
                    >
                      {message.content}
                    </div>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-current" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:0.2s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:0.4s]" />
                  </div>
                )}
                {error && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </CardContent>
          {useEmailFallback && (
            <CardFooter className="border-t pt-3">
              <p className="text-xs text-muted-foreground">
                Can&apos;t help right now? Email us at{' '}
                <a
                  href={`mailto:${supportEmail}`}
                  className="font-medium text-primary underline"
                >
                  {supportEmail}
                </a>
              </p>
            </CardFooter>
          )}
          <form onSubmit={handleSubmit} className="border-t p-3">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={inputPlaceholder}
                disabled={isLoading}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button type="submit" size="sm" disabled={isLoading || !input.trim()}>
                {isLoading ? '...' : 'Send'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Floating Toggle Button */}
      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </Button>
    </div>
  );
}

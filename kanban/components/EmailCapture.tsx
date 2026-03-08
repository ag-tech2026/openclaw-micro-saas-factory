'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const subscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type SubscribeForm = z.infer<typeof subscribeSchema>;

interface EmailCaptureProps {
  source?: string;
  onSuccess?: () => void;
  className?: string;
}

export default function EmailCapture({
  source = 'website',
  onSuccess,
  className = '',
}: EmailCaptureProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SubscribeForm>({
    resolver: zodResolver(subscribeSchema),
  });

  const onSubmit = async (data: SubscribeForm) => {
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          source,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStatus('success');
        setMessage('Thank you for subscribing! Check your inbox for a welcome email.');
        reset();
        onSuccess?.();
      } else {
        setStatus('error');
        setMessage(result.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <input
            type="email"
            placeholder="Enter your email"
            {...register('email')}
            className={`
              w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.email ? 'border-red-500' : 'border-gray-300'}
              ${status === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            disabled={status === 'loading'}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className={`
            w-full py-3 px-4 rounded-lg font-medium transition-colors
            bg-blue-600 hover:bg-blue-700 text-white
            ${status === 'loading' ? 'opacity-70 cursor-wait' : ''}
          `}
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Subscribing...
            </span>
          ) : (
            'Subscribe'
          )}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
            status === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : status === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : ''
          }`}
        >
          {status === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          {status === 'error' && <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          <p className="text-sm">{message}</p>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500 text-center">
        We respect your privacy. Unsubscribe anytime.
      </p>
    </div>
  );
}

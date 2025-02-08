import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Send } from 'lucide-react';

interface FeedbackFormProps {
  runId: string;
}

export function FeedbackForm({ runId }: FeedbackFormProps) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);

  const submitFeedback = async () => {
    if (selectedScore === null) return;

    try {
      const response = await fetch('https://vgkmpoc.fly.dev/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          run_id: runId,
          score: selectedScore,
          comment: comment,
          key: 'user-feedback'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setSubmitted(true);
      setError(null);
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div className="mt-4 text-center py-3 bg-green-50 text-green-700 rounded-lg">
        Thank you for your feedback!
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="space-y-4">
        <div className="flex flex-col items-center">
          <p className="text-sm text-gray-600 mb-3">Was this answer helpful?</p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setSelectedScore(1.0);
                submitFeedback();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
                selectedScore === 1.0
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
              }`}
            >
              <ThumbsUp className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-700">Yes</span>
            </button>
            <button
              onClick={() => {
                setSelectedScore(0.0);
                setShowComment(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
                selectedScore === 0.0
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
              }`}
            >
              <ThumbsDown className="w-4 h-4 text-red-600" />
              <span className="text-sm text-gray-700">No</span>
            </button>
          </div>
        </div>

        {showComment && (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-full max-w-md">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us how we can improve..."
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                rows={3}
              />
            </div>
            
            <button
              onClick={submitFeedback}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Submit Feedback</span>
            </button>
          </div>
        )}

        {error && (
          <div className="text-center text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
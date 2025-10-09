// app/components/ui/RatingModal.tsx
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { StarRating } from './StarRating';
import styles from './RatingModal.module.css';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  tailorId: string;
  onSuccess?: (rating: number) => void;
}

export function RatingModal({ isOpen, onClose, orderId, tailorId, onSuccess }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setError('You must be logged in to submit a rating');
        return;
      }

      // Insert the rating
      const { error: insertError } = await supabase
        .from('ratings')
        .insert({
          user_id: userData.user.id,
          tailor_id: tailorId,
          order_id: orderId,
          rating,
          comment: comment.trim() || null
        });

      if (insertError) {
        console.error('Error submitting rating:', insertError);
        setError('Failed to submit rating. Please try again.');
        return;
      }

      // Update the tailor's aggregate rating in tailor_details
      const { error: updateError } = await supabase.rpc('update_tailor_rating', {
        tailor_id_param: tailorId,
        rating_param: rating
      });

      if (updateError) {
        console.error('Error updating tailor rating:', updateError);
      }

      // Success!
      if (onSuccess) onSuccess(rating);
      onClose();
    } catch (e) {
      console.error('Error in rating submission:', e);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Rate Your Experience</h2>
        <p className={styles.subtitle}>Let us know how satisfied you were with this tailor's service</p>
        
        <div className={styles.ratingContainer}>
          <StarRating onChange={setRating} initialRating={rating} />
        </div>
        
        <div className={styles.commentContainer}>
          <label htmlFor="comment" className={styles.label}>Add a comment (optional)</label>
          <textarea
            id="comment"
            className={styles.commentInput}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this tailor..."
            rows={4}
          />
        </div>
        
        {error && <p className={styles.error}>{error}</p>}
        
        <div className={styles.actions}>
          <button 
            onClick={onClose} 
            className={styles.cancelButton}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
}
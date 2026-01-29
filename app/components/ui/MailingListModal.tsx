// app/components/ui/MailingListModal.tsx
import { useState } from 'react';
import styles from './MailingListModal.module.css';

interface MailingListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MailingListModal({ isOpen, onClose }: MailingListModalProps) {
  const [email, setEmail] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    // Validate email
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/mailing-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          firstname: firstname.trim() || null,
          lastname: lastname.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      // Success!
      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset form after closing
        setTimeout(() => {
          setEmail('');
          setFirstname('');
          setLastname('');
          setSuccess(false);
        }, 300);
      }, 2000);
    } catch (e) {
      console.error('Error subscribing to mailing list:', e);
      setError(e instanceof Error ? e.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
    // Reset form after closing animation
    setTimeout(() => {
      setEmail('');
      setFirstname('');
      setLastname('');
      setError('');
      setSuccess(false);
    }, 300);
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {success ? (
          <div className={styles.successContainer}>
            <div className={styles.successIcon}>✓</div>
            <h2 className={styles.successTitle}>Thank You!</h2>
            <p className={styles.successMessage}>
              You're all set! We'll notify you when our women's collection launches.
            </p>
          </div>
        ) : (
          <>
            <h2 className={styles.title}>Join Our Mailing List</h2>
            <p className={styles.subtitle}>
              Be the first to know when our women's collection is available
            </p>
            
            <div className={styles.formContainer}>
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email Address <span className={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div className={styles.nameRow}>
                <div className={styles.inputGroup}>
                  <label htmlFor="firstname" className={styles.label}>
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstname"
                    className={styles.input}
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    placeholder="First name"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="lastname" className={styles.label}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastname"
                    className={styles.input}
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
            </div>
            
            {error && <p className={styles.error}>{error}</p>}
            
            <div className={styles.actions}>
              <button 
                onClick={handleClose} 
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
                {isSubmitting ? 'Subscribing...' : 'Notify Me'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

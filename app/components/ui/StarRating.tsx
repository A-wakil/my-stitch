import { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import styles from './StarRating.module.css';

interface StarRatingProps {
  initialRating?: number;
  onChange: (rating: number) => void;
  readOnly?: boolean;
}

export function StarRating({ initialRating = 0, onChange, readOnly = false }: StarRatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);

  const handleClick = (value: number) => {
    if (readOnly) return;
    setRating(value);
    onChange(value);
  };

  return (
    <div className={styles.starContainer}>
      {[...Array(5)].map((_, index) => {
        const value = index + 1;
        return (
          <FaStar
            key={index}
            className={`${styles.star} ${value <= (hover || rating) ? styles.filled : styles.empty}`}
            size={24}
            onClick={() => handleClick(value)}
            onMouseEnter={() => !readOnly && setHover(value)}
            onMouseLeave={() => !readOnly && setHover(0)}
            style={{ cursor: readOnly ? 'default' : 'pointer' }}
          />
        );
      })}
    </div>
  );
}

/**
 * Calculate the next interval, ease factor, and review date based on the SM-2 algorithm.
 * 
 * @param {number} quality - Rating from 0 to 5 (0: complete blackout, 5: perfect recall)
 * @param {number} interval - Previous interval in days
 * @param {number} easeFactor - Previous ease factor
 * @returns {Object} { interval, easeFactor, nextReviewDate, status }
 */
exports.calculateSRS = (quality, interval, easeFactor) => {
  let newInterval;
  let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  if (quality < 3) {
    // If forgotten, reset interval
    newInterval = 1;
  } else {
    // If remembered, increase interval
    if (interval === 0) {
      newInterval = 1;
    } else if (interval === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  let status = 'LEARNING';
  if (quality >= 3) {
    if (newInterval >= 21) status = 'MASTERED';
    else status = 'REVIEW';
  } else {
    status = 'LEARNING';
  }

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    nextReviewDate,
    status
  };
};

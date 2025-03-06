import React from 'react';
import { cn } from '../lib/utils';

/**
 * Network Quality Indicator component
 * Displays a visual representation of network quality
 * 
 * @param {Object} props - Component properties
 * @param {number} props.quality - Network quality score (0-100)
 * @param {string} props.className - Additional CSS classes
 */
const NetworkQualityIndicator = ({ quality = 100, className }) => {
  // Determine quality level
  const getQualityLevel = () => {
    if (quality >= 80) return 'excellent';
    if (quality >= 60) return 'good';
    if (quality >= 40) return 'fair';
    if (quality >= 20) return 'poor';
    return 'critical';
  };
  
  const qualityLevel = getQualityLevel();
  
  // Determine how many bars to fill based on quality
  const getFilledBars = () => {
    if (quality >= 80) return 4;
    if (quality >= 60) return 3;
    if (quality >= 40) return 2;
    if (quality >= 20) return 1;
    return 0;
  };
  
  const filledBars = getFilledBars();
  
  // Generate bars
  const bars = Array.from({ length: 4 }, (_, i) => {
    const isFilled = i < filledBars;
    const barHeight = `${(i + 1) * 3}px`;
    
    return (
      <div 
        key={i}
        className={cn(
          "w-1 rounded-sm mx-[1px] transition-colors duration-300",
          isFilled ? {
            'bg-green-500': qualityLevel === 'excellent',
            'bg-green-400': qualityLevel === 'good',
            'bg-yellow-400': qualityLevel === 'fair',
            'bg-orange-400': qualityLevel === 'poor',
            'bg-red-500': qualityLevel === 'critical',
          } : 'bg-gray-300 dark:bg-gray-700'
        )}
        style={{ height: barHeight }}
      />
    );
  });
  
  return (
    <div className={cn("flex items-end h-4", className)} title={`Network Quality: ${quality}%`}>
      {bars}
    </div>
  );
};

export default NetworkQualityIndicator;

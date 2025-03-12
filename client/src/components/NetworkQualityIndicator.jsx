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
            'bg-[#4ADE80]': qualityLevel === 'excellent',
            'bg-[#4A72F5]': qualityLevel === 'good',
            'bg-[#F59E0B]': qualityLevel === 'fair',
            'bg-[#FB923C]': qualityLevel === 'poor',
            'bg-[#D15052]': qualityLevel === 'critical',
          } : 'bg-gray-600'
        )}
        style={{ height: barHeight }}
      />
    );
  });
  
  return (
    <div className={cn("flex items-end h-4 p-1 rounded-md bg-gray-800/50", className)} title={`Network Quality: ${quality}%`}>
      {bars}
    </div>
  );
};

export default NetworkQualityIndicator;

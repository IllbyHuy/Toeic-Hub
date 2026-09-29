import React from 'react';

const StrokeText = ({ 
  text, 
  className = "", 
  strokeColor = "#000",
  strokeWidth = "1px",
  fillColor = "transparent"
}) => {
  return (
    <span 
      className={`font-black ${className}`}
      style={{
        WebkitTextStroke: `${strokeWidth} ${strokeColor}`,
        color: fillColor
      }}
    >
      {text}
    </span>
  );
};

export default StrokeText;

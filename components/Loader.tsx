import React, { useEffect, useState } from 'react';

interface LoaderProps {
  title?: string;
  stages?: string[];
}

const defaultStages = ["Analyzing Mask", "Generating Draft", "Refining Result", "Harmonizing", "Finalizing"];
const defaultTitle = "AI is creating...";

export const Loader: React.FC<LoaderProps> = ({ title = defaultTitle, stages = defaultStages }) => {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    setCurrentStage(0);
    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev + 1) % stages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [stages]);

  return (
    <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-50 backdrop-blur-md transition-opacity duration-300">
        <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-transparent border-t-pink-500 rounded-full animate-spin" style={{ animationDuration: '1.2s' }}></div>
            <div className="absolute inset-2 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
            <div className="absolute inset-4 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin" style={{ animationDuration: '1.8s' }}></div>
        </div>
        <div className="w-full max-w-md text-center">
            <h3 className="text-xl font-semibold text-slate-100 mb-2 animate-fadeIn" style={{ animationDelay: '0.1s', textShadow: 'var(--shadow-text)' }}>{title}</h3>
            <p className="text-slate-300 transition-opacity duration-500 animate-fadeIn" style={{ animationDelay: '0.2s', textShadow: 'var(--shadow-text)' }}>{stages[currentStage]}</p>
        </div>
    </div>
  );
};
import React, { useState, useEffect, useMemo } from 'react';

const QUESTIONS = [
  {
    id: 'q1',
    section: 'Section 1 - Visual Condition',
    question: 'Any physical damage?',
    options: [
      { label: 'None', points: 4 },
      { label: 'Minor scratches', points: 3 },
      { label: 'Cracks or dents', points: 2 },
      { label: 'Severely damaged', points: 1 }
    ]
  },
  {
    id: 'q2',
    section: 'Section 1 - Visual Condition',
    question: 'Are all ports and connectors intact?',
    options: [
      { label: 'All intact', points: 4 },
      { label: 'Minor wear', points: 3 },
      { label: 'Some missing or broken', points: 2 },
      { label: 'Mostly broken', points: 1 }
    ]
  },
  {
    id: 'q3',
    section: 'Section 2 - Functionality',
    question: 'Does the part power on or function?',
    options: [
      { label: 'Fully functional', points: 4 },
      { label: 'Works with minor issues', points: 3 },
      { label: 'Partially functional', points: 2 },
      { label: 'Does not work', points: 1 }
    ]
  },
  {
    id: 'q4',
    section: 'Section 2 - Functionality',
    question: 'Any known defects?',
    options: [
      { label: 'None', points: 4 },
      { label: 'Minor', points: 3 },
      { label: 'Moderate', points: 2 },
      { label: 'Severe', points: 1 }
    ]
  },
  {
    id: 'q5',
    section: 'Section 3 - Age and Usage',
    question: 'How old is the part?',
    options: [
      { label: 'Less than 1 year', points: 4 },
      { label: '1-2 years', points: 3 },
      { label: '2-4 years', points: 2 },
      { label: 'More than 4 years', points: 1 }
    ]
  },
  {
    id: 'q6',
    section: 'Section 3 - Age and Usage',
    question: 'Estimated usage level?',
    options: [
      { label: 'Light', points: 4 },
      { label: 'Moderate', points: 3 },
      { label: 'Heavy', points: 2 },
      { label: 'Very heavy', points: 1 }
    ]
  }
];

const getGradeInfo = (score) => {
  if (score >= 20) return { grade: 'A', text: 'Grade A - Excellent', color: 'bg-green-500/20 text-green-400 border-green-500/50' };
  if (score >= 14) return { grade: 'B', text: 'Grade B - Good', color: 'bg-amber-500/20 text-amber-400 border-amber-500/50' };
  if (score >= 8) return { grade: 'C', text: 'Grade C - Fair', color: 'bg-orange-500/20 text-orange-400 border-orange-500/50' };
  return { grade: 'D', text: 'Grade D - Poor', color: 'bg-red-500/20 text-red-400 border-red-500/50' };
};

const GradingSection = ({ onChange }) => {
  const [answers, setAnswers] = useState({});

  const isComplete = Object.keys(answers).length === QUESTIONS.length;

  const totalScore = useMemo(() => {
    return Object.values(answers).reduce((sum, points) => sum + points, 0);
  }, [answers]);

  useEffect(() => {
    if (isComplete) {
      const { grade } = getGradeInfo(totalScore);
      onChange?.(grade);
    } else {
      onChange?.(null);
    }
  }, [isComplete, totalScore, onChange]);

  const handleSelect = (questionId, points) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: points
    }));
  };

  const currentGradeInfo = isComplete ? getGradeInfo(totalScore) : null;

  // Group questions by section
  const sections = QUESTIONS.reduce((acc, q) => {
    if (!acc[q.section]) acc[q.section] = [];
    acc[q.section].push(q);
    return acc;
  }, {});

  return (
    <div className="space-y-8 bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
      <div className="flex justify-between items-center bg-white/5 pb-4 border-b border-white/10 p-4 rounded-t-xl -mt-6 -mx-6 mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <span className="text-green-500">❖</span> Condition Assessment
        </h3>
        {currentGradeInfo && (
          <div className={`px-4 py-2 rounded-full border ${currentGradeInfo.color} font-medium flex items-center gap-2 animate-in fade-in zoom-in duration-300`}>
            {currentGradeInfo.text}
          </div>
        )}
      </div>

      <div className="space-y-8">
        {Object.entries(sections).map(([sectionName, questions]) => (
          <div key={sectionName} className="space-y-4">
            <h4 className="text-green-400 font-medium text-sm tracking-wider uppercase border-b border-white/5 pb-2">
              {sectionName}
            </h4>
            
            {questions.map((q) => (
              <div key={q.id} className="space-y-3">
                <p className="text-gray-200">{q.question}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {q.options.map((opt) => {
                    const isSelected = answers[q.id] === opt.points;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => handleSelect(q.id, opt.points)}
                        className={`py-2 px-3 rounded-xl text-sm transition-all duration-300 border font-medium ${
                          isSelected 
                            ? 'bg-green-600/90 text-white border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] transform scale-[1.02]' 
                            : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {!isComplete && (
        <div className="mt-6 text-sm text-amber-400/80 italic text-center">
          Please answer all {QUESTIONS.length} questions to calculate the part's grade.
          ({Object.keys(answers).length}/{QUESTIONS.length} completed)
        </div>
      )}
    </div>
  );
};

export default GradingSection;

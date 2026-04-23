import React, { useState, useEffect, useMemo, useRef } from 'react';

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

const GradingSection = ({ onChange, onVideoRecorded }) => {
  const [answers, setAnswers] = useState({});
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [stream, setStream] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [videoConfirmed, setVideoConfirmed] = useState(false);
  const videoRef = useRef(null);

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

  // Cleanup media streams on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Set stream to video element when recording starts
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleSelect = (questionId, points) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: points
    }));
  };

  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setStream(mediaStream);
      setRecording(true);
      setCountdown(45);

      const recorder = new MediaRecorder(mediaStream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        setRecording(false);
        setCountdown(null);
        mediaStream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
    }
  };

  const reRecord = () => {
    setRecordedBlob(null);
    setPreviewUrl(null);
    setVideoConfirmed(false);
  };

  const confirmVideo = () => {
    if (recordedBlob) {
      onVideoRecorded?.(recordedBlob);
      setVideoConfirmed(true);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    let timer;
    if (recording && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0 && recording) {
      stopRecording();
    }
    return () => clearTimeout(timer);
  }, [countdown, recording]);

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

      {isComplete && (
        <div className="mt-8 space-y-4 bg-black/60 rounded-2xl p-6 border border-white/10">
          {videoConfirmed ? (
            <div className="text-center space-y-3">
              <p className="text-green-400 font-medium">Video recorded successfully. Your listing is ready to submit.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-start">
                <h4 className="text-green-400 font-semibold text-lg mb-2">Part Verification Video</h4>
                <p className="text-gray-400 text-sm">Record a short video of the part so buyers can verify its condition. Required to publish listing.</p>
              </div>

              {!recording && !recordedBlob && (
                <button
                  onClick={startRecording}
                  className="w-full py-3 px-4 bg-green-600/90 hover:bg-green-600 text-white rounded-xl font-medium transition-all duration-300 border border-green-500/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                >
                  Start Recording
                </button>
              )}

              {recording && (
                <div className="space-y-4">
                  <div className="relative w-full aspect-video bg-black/80 rounded-xl overflow-hidden border border-white/10">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-green-400 font-medium">Recording... {countdown}s remaining</p>
                    <button
                      onClick={stopRecording}
                      className="py-2 px-6 bg-red-600/80 hover:bg-red-600 text-white rounded-xl font-medium transition-all duration-300 border border-red-500/50"
                    >
                      Stop Recording
                    </button>
                  </div>
                </div>
              )}

              {recordedBlob && !recording && (
                <div className="space-y-4">
                  <div className="relative w-full aspect-video bg-black/80 rounded-xl overflow-hidden border border-white/10">
                    <video
                      src={previewUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={reRecord}
                      className="flex-1 py-2 px-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-all duration-300 border border-white/10"
                    >
                      Re-record
                    </button>
                    <button
                      onClick={confirmVideo}
                      className="flex-1 py-2 px-4 bg-green-600/90 hover:bg-green-600 text-white rounded-xl font-medium transition-all duration-300 border border-green-500/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                    >
                      Use this video
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GradingSection;

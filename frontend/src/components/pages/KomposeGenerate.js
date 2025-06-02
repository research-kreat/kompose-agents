'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';
import { useChatStore } from '@/store/chatStore';
import { api } from '@/lib/api';
import Message from '@/components/ui/Message';
import TypingIndicator from '@/components/ui/TypingIndicator';
import { getKomposeTasks, formatTaskResult } from '@/lib/blockUtils';

export default function KomposeGenerateNext() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [nextStep, setNextStep] = useState(1);
  const [userPrompt, setUserPrompt] = useState('');
  const [generationId, setGenerationId] = useState(null);
  const [error, setError] = useState(null);
  const [allCompleted, setAllCompleted] = useState(false);
  
  // Get all tasks
  const allTasks = getKomposeTasks();
  
  // Extract state from the store
  const userId = useChatStore(state => state.userId);
  const addLog = useChatStore(state => state.addLog);
  const initializeUser = useChatStore(state => state.initializeUser);
  const resetStore = useChatStore(state => state.resetStore);
  const messageHistory = useChatStore(state => state.messageHistory);
  const setMessageHistory = useChatStore(state => state.setMessageHistory);
  const setBlockInfo = useChatStore(state => state.setBlockInfo);
  const currentBlockId = useChatStore(state => state.currentBlockId);
  const addMessage = useChatStore(state => state.addMessage);
  const setCurrentBlockId = useChatStore(state => state.setCurrentBlockId);
  
  // Initialize user on component mount
  useEffect(() => {
    initializeUser();
    resetStore();
    
    // Set a welcome message
    setMessageHistory([
      {
        role: 'system',
        content: 'Welcome to Step-by-Step Business Generation! Enter a business concept prompt below and click "Start" to generate a complete business idea task by task.',
        timestamp: new Date().toISOString()
      }
    ]);
    
    return () => {
      // Cleanup if needed
    };
  }, []);
  
  // Start generating the first task
  const startGeneration = async () => {
    if (isGenerating) return;
    
    // Reset states
    setResults([]);
    setCurrentStep(0);
    setNextStep(1);
    setError(null);
    setAllCompleted(false);
    setIsGenerating(true);
    
    try {
      // Add a message showing generation is starting
      setMessageHistory([
        ...messageHistory,
        {
          role: 'user',
          content: userPrompt || 'Generate a complete business idea step by step',
          timestamp: new Date().toISOString()
        }
      ]);
      
      addLog({
        type: 'info',
        message: 'Starting Kompose business idea generation (task by task)'
      });
      
      // Call the API to initialize the generation process
      const response = await api.generateKomposeIdea({
        userId,
        userPrompt: userPrompt || undefined
      });
      
      if (response.success) {
        // Store the block ID for future task generations
        setGenerationId(response.block_id);
        setCurrentBlockId(response.block_id);
        
        // Set block info
        setBlockInfo({
          created: new Date().toISOString(),
          blockId: response.block_id
        });
        
        addMessage({
          role: 'system',
          content: 'Ready to generate tasks one by one. Click "Generate Next Task" to continue.',
          timestamp: new Date().toISOString()
        });
        
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Error starting generation:', error);
      setError(error.message);
      setIsGenerating(false);
      
      addMessage({
        role: 'system',
        content: `Error starting business idea generation: ${error.message}. Please try again.`,
        timestamp: new Date().toISOString(),
        error: true
      });
      
      addLog({
        type: 'error',
        message: `Error starting business idea generation: ${error.message}`
      });
    }
  };
  
  // Generate the next task
  const generateNextTask = async () => {
    if (isGenerating || !generationId) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Call the API to generate the next task
      const response = await api.generateKomposeIdea({
        userId,
        blockId: generationId,
        userPrompt: userPrompt || undefined
      });
      
      if (response.success) {
        // Update the current step
        setCurrentStep(response.task_number);
        
        // Check if all tasks are completed
        if (response.completed) {
          setAllCompleted(true);
          
          addMessage({
            role: 'system',
            content: 'All tasks have been completed successfully!',
            timestamp: new Date().toISOString()
          });
          
          addLog({
            type: 'success',
            message: 'Generated all Kompose business idea tasks'
          });
        } else {
          // Update the next step
          setNextStep(response.next_task);
          
          // Format the task result for display
          const taskResult = formatTaskResult({
            task_number: response.task_number,
            task_title: response.task_title,
            ...response.task_result
          });
          
          // Add to results state
          setResults(prevResults => {
            // Replace if task already exists, otherwise add
            const existingIndex = prevResults.findIndex(r => 
              r.taskInfo && r.taskInfo.id === response.task_number
            );
            
            if (existingIndex >= 0) {
              const newResults = [...prevResults];
              newResults[existingIndex] = taskResult;
              return newResults;
            } else {
              return [...prevResults, taskResult];
            }
          });
          
          // Add message to history
          addMessage({
            role: 'assistant',
            content: `Task ${response.task_number}: ${response.task_title}`,
            timestamp: new Date().toISOString(),
            fullResponse: {
              task_number: response.task_number,
              task_title: response.task_title,
              ...response.task_result
            }
          });
          
          addLog({
            type: 'success',
            message: `Completed task ${response.task_number}: ${response.task_title}`
          });
        }
      } else {
        // Handle error
        setError(response.error);
        
        addMessage({
          role: 'system',
          content: `Error generating task: ${response.error}`,
          timestamp: new Date().toISOString(),
          error: true
        });
        
        addLog({
          type: 'error',
          message: `Error generating task: ${response.error}`
        });
      }
    } catch (error) {
      console.error('Error generating next task:', error);
      setError(error.message);
      
      addMessage({
        role: 'system',
        content: `Error generating task: ${error.message}`,
        timestamp: new Date().toISOString(),
        error: true
      });
      
      addLog({
        type: 'error',
        message: `Error generating task: ${error.message}`
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle user prompt change
  const handlePromptChange = (e) => {
    setUserPrompt(e.target.value);
  };
  
  // View the block
  const viewBlock = () => {
    if (generationId) {
      router.push(`/blocks/${generationId}`);
    }
  };
  
  // Restart the generation
  const restartGeneration = () => {
    setGenerationId(null);
    setResults([]);
    setCurrentStep(0);
    setNextStep(1);
    setError(null);
    setAllCompleted(false);
    
    // Reset message history to just the welcome message
    setMessageHistory([
      {
        role: 'system',
        content: 'Welcome to Step-by-Step Business Generation! Enter a business concept prompt below and click "Start" to generate a complete business idea task by task.',
        timestamp: new Date().toISOString()
      }
    ]);
    
    addLog({
      type: 'info',
      message: 'Reset generation process'
    });
  };

  return (
    <main className="min-h-screen flex flex-col bg-gray-100">
      <Header 
        blockId={generationId}
        handleNewChat={restartGeneration}
      />
      
      <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center">
        <motion.div
          className="max-w-4xl w-full bg-white rounded-lg shadow-md p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <i className="fas fa-lightbulb text-primary text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Step-by-Step Business Analysis Generator</h2>
              <p className="text-gray-600">Generate a complete business idea one task at a time</p>
            </div>
          </div>
          
          {!generationId ? (
            <div className="mb-4">
              <label htmlFor="userPrompt" className="block text-sm font-medium text-gray-700 mb-1">
                Business Concept Prompt
              </label>
              <textarea
                id="userPrompt"
                value={userPrompt}
                onChange={handlePromptChange}
                placeholder="e.g., A sustainable fashion marketplace for recycled clothing, Zepto for Fashion, or an AI-powered health monitoring app for seniors..."
                disabled={isGenerating}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none h-20 focus:ring-primary focus:border-primary"
                required={true}
              />
              
              <div className="flex justify-center mt-4">
                <button
                  onClick={startGeneration}
                  disabled={isGenerating}
                  className={`px-6 py-3 rounded-lg text-black font-medium flex items-center gap-2 border border-black cursor-pointer bg-primary hover:bg-primary-dark ${
                    isGenerating ? 'opacity-75 cursor-wait' : ''
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin"></i>
                      Initializing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-play"></i>
                      Start Generation
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">Generation Progress</h3>
                <span className="text-sm text-gray-600">
                  {currentStep} of {allTasks.length} tasks completed
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / allTasks.length) * 100}%` }}
                ></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allTasks.map((task, index) => (
                  <div 
                    key={task.id}
                    className={`p-3 border rounded-lg flex items-center gap-2 ${
                      index < currentStep 
                        ? 'bg-green-50 border-green-200' 
                        : index === currentStep 
                          ? 'bg-blue-50 border-blue-200 animate-pulse' 
                          : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index < currentStep 
                        ? 'bg-green-500 text-black' 
                        : index === currentStep 
                          ? 'bg-blue-500 text-black' 
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {index < currentStep ? (
                        <i className="fas fa-check"></i>
                      ) : (
                        <i className={`fas ${task.icon}`}></i>
                      )}
                    </div>
                    <div className="text-sm font-medium truncate">
                      {task.title}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center gap-4 mt-6">
                {!allCompleted ? (
                  <button
                    onClick={generateNextTask}
                    disabled={isGenerating}
                    className={`px-6 py-3 rounded-lg text-black font-medium flex items-center gap-2 border border-black cursor-pointer bg-primary hover:bg-primary-dark ${
                      isGenerating ? 'opacity-75 cursor-wait' : ''
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <i className="fas fa-circle-notch fa-spin"></i>
                        Generating Task {nextStep}...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-arrow-right"></i>
                        Generate Next Task
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={viewBlock}
                    className="px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <i className="fas fa-check-circle"></i>
                    All Tasks Completed - View Results
                  </button>
                )}
                
                <button
                  onClick={restartGeneration}
                  disabled={isGenerating}
                  className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium flex items-center gap-2 hover:bg-gray-100"
                >
                  <i className="fas fa-redo"></i>
                  Start Over
                </button>
              </div>
            </div>
          )}
          
          {error && (
            <div className="p-4 mt-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <i className="fas fa-exclamation-circle"></i>
                <h3 className="font-medium">Generation Error</h3>
              </div>
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </motion.div>
        
        <div className="max-w-4xl w-full">
          {/* Message history, including results */}
          <AnimatePresence>
            {messageHistory.map((message, index) => (
              <Message 
                key={`${message.role}-${index}`}
                message={message}
                isLast={index === messageHistory.length - 1}
              />
            ))}
          </AnimatePresence>
          
          {/* Typing indicator */}
          {isGenerating && <TypingIndicator />}
        </div>
      </div>
    </main>
  );
}
'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';
import { useChatStore } from '@/store/chatStore';
import { api } from '@/lib/api';
import Message from '@/components/ui/Message';
import ChatInput from '@/components/ui/ChatInput';
import TypingIndicator from '@/components/ui/TypingIndicator';
import { getKomposeTasks, formatTaskResult } from '@/lib/blockUtils';

export default function KomposeGenerate() {
  const router = useRouter();
  const chatContainerRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [nextStep, setNextStep] = useState(1);
  const [generationId, setGenerationId] = useState(null);
  const [error, setError] = useState(null);
  const [allCompleted, setAllCompleted] = useState(false);
  const [initialPromptSent, setInitialPromptSent] = useState(false);
  
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
        content: 'Welcome to Business Idea Generator! Enter your business concept prompt below to start generating a complete business analysis.',
        timestamp: new Date().toISOString()
      }
    ]);
    
    return () => {
      // Cleanup if needed
    };
  }, []);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messageHistory, isGenerating]);
  
  // Start generating the first task
  const startGeneration = async (userPrompt) => {
    if (isGenerating) return;
    
    // Reset states if starting fresh
    if (!initialPromptSent) {
      setResults([]);
      setCurrentStep(0);
      setNextStep(1);
      setError(null);
      setAllCompleted(false);
      setInitialPromptSent(true);
    }
    
    setIsGenerating(true);
    
    try {
      addLog({
        type: 'info',
        message: 'Starting Kompose business idea generation (task by task)'
      });
      
      // Call the API to initialize the generation process
      const response = await api.generateKomposeIdea({
        userId,
        blockId: generationId || undefined,
        userPrompt: !generationId ? userPrompt : undefined
      });
      
      if (response.success) {
        // Store the block ID for future task generations
        if (!generationId) {
          setGenerationId(response.block_id);
          setCurrentBlockId(response.block_id);
          
          // Set block info
          setBlockInfo({
            created: new Date().toISOString(),
            blockId: response.block_id
          });
          
          addMessage({
            role: 'assistant',
            content: 'Great! I\'ll analyze your business idea step by step. Click "Generate Next Task" to continue with the first analysis.',
            timestamp: new Date().toISOString()
          });
        } else if (response.task_result) {
          // Update the current step
          setCurrentStep(response.task_number);
          
          // Check if all tasks are completed
          if (response.completed) {
            setAllCompleted(true);
            
            addMessage({
              role: 'system',
              content: 'All analysis tasks have been completed! You can now view the complete business plan or start a new one.',
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
            
            // Add a follow-up message prompting for next task
            if (!response.completed) {
              setTimeout(() => {
                addMessage({
                  role: 'assistant',
                  content: `Ready for the next step? Click "Generate Next Task" to continue with task ${response.next_task}.`,
                  timestamp: new Date().toISOString()
                });
              }, 500);
            }
            
            addLog({
              type: 'success',
              message: `Completed task ${response.task_number}: ${response.task_title}`
            });
          }
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
      console.error('Error in generation process:', error);
      setError(error.message);
      
      addMessage({
        role: 'system',
        content: `Error: ${error.message}. Please try again.`,
        timestamp: new Date().toISOString(),
        error: true
      });
      
      addLog({
        type: 'error',
        message: `Error in generation process: ${error.message}`
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle sending message (initial prompt)
  const handleSendMessage = (content) => {
    // Add user message to chat
    addMessage({
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    });
    
    // Start generation with the user prompt
    startGeneration(content);
  };
  
  // Handle "Generate Next Task" button click
  const handleNextTask = () => {
    if (generationId && !isGenerating && !allCompleted) {
      // Call the same function but now with existing generationId
      startGeneration();
    }
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
    setInitialPromptSent(false);
    
    // Reset message history to just the welcome message
    setMessageHistory([
      {
        role: 'system',
        content: 'Welcome to Business Idea Generator! Enter your business concept prompt below to start generating a complete business analysis.',
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
      <Header blockId={generationId} />
      
      <div className="flex-1 flex flex-col h-[calc(100vh-72px)]">
        {/* Progress bar at the top */}
        {initialPromptSent && (
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700">Analysis Progress</h3>
                <span className="text-xs text-gray-600">
                  {currentStep} of {allTasks.length} tasks completed
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / allTasks.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Chat container */}
        <div 
          ref={chatContainerRef}
          className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-gray-50"
        >
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
          
          {/* Next task or view results button */}
          {initialPromptSent && !isGenerating && (
            <div className="self-center my-4">
              {!allCompleted ? (
                <button
                  onClick={handleNextTask}
                  disabled={isGenerating}
                  className={`px-6 py-3 rounded-lg text-black font-medium flex items-center gap-2 border border-black cursor-pointer bg-primary hover:bg-primary-dark ${
                    isGenerating ? 'opacity-75 cursor-wait' : ''
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin"></i>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-arrow-right"></i>
                      Generate Next Task
                    </>
                  )}
                </button>
              ) : (
                <div className="flex gap-4">
                  <button
                    onClick={viewBlock}
                    className="px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <i className="fas fa-check-circle"></i>
                    View Complete Analysis
                  </button>
                  
                  <button
                    onClick={restartGeneration}
                    className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium flex items-center gap-2 hover:bg-gray-100"
                  >
                    <i className="fas fa-plus"></i>
                    New Business Idea
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Chat input */}
        <ChatInput 
          onSendMessage={handleSendMessage}
          disabled={initialPromptSent || isGenerating}
        />
      </div>
    </main>
  );
}
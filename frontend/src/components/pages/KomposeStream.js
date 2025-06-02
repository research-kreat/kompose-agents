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

export default function KomposeStream() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [userPrompt, setUserPrompt] = useState('');
  const [generationId, setGenerationId] = useState(null);
  const [streamError, setStreamError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Get all tasks
  const allTasks = getKomposeTasks();
  
  // Extract state from the store
  const userId = useChatStore(state => state.userId);
  const addLog = useChatStore(state => state.addLog);
  const initializeUser = useChatStore(state => state.initializeUser);
  const resetStore = useChatStore(state => state.resetStore);
  const createNewBlock = useChatStore(state => state.createNewBlock);
  const messageHistory = useChatStore(state => state.messageHistory);
  const setMessageHistory = useChatStore(state => state.setMessageHistory);
  const setBlockInfo = useChatStore(state => state.setBlockInfo);
  const currentBlockId = useChatStore(state => state.currentBlockId);
  const addMessage = useChatStore(state => state.addMessage);
  
  // Initialize user on component mount
  useEffect(() => {
    initializeUser();
    resetStore();
    
    // Set a welcome message
    setMessageHistory([
      {
        role: 'system',
        content: 'Welcome to One-Click Business Generation! Enter a business concept prompt below to generate a complete business idea with all 18 analytical tasks.',
        timestamp: new Date().toISOString()
      }
    ]);
    
    // Create a new block for this session
    const blockId = createNewBlock('Kompose One-Click Business Generator');
    
    // Set block info
    setBlockInfo({
      created: new Date().toISOString(),
      blockId: blockId
    });
    
    return () => {
      // Cleanup any active streams
      if (isStreaming) {
        cleanupStream();
      }
    };
  }, []);
  
  // Reference to the current reader
  const readerRef = useRef(null);
  const streamControllerRef = useRef(null);
  
  // Cleanup stream
  const cleanupStream = () => {
    if (readerRef.current) {
      try {
        readerRef.current.cancel();
      } catch (e) {
        console.error("Error cancelling stream:", e);
      }
      readerRef.current = null;
    }
    
    if (streamControllerRef.current) {
      try {
        streamControllerRef.current.abort();
      } catch (e) {
        console.error("Error aborting stream:", e);
      }
      streamControllerRef.current = null;
    }
    
    setIsStreaming(false);
  };
  
  // Function to process streaming response
  const processStreamingResponse = async (stream) => {
    try {
      // Create an abort controller for the stream
      const controller = new AbortController();
      streamControllerRef.current = controller;
      
      // Get the reader from the stream
      const reader = stream.getReader();
      readerRef.current = reader;
      
      // Create a TextDecoder to decode the chunks
      const decoder = new TextDecoder();
      
      setIsStreaming(true);
      
      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Decode the chunk and split by newlines
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        // Process each line as a separate JSON message
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            // Handle different message types
            switch (data.type) {
              case 'init':
                // Set the generation ID
                setGenerationId(data.block_id);
                
                // Add system message
                addMessage({
                  role: 'system',
                  content: data.message,
                  timestamp: new Date().toISOString()
                });
                
                addLog({
                  type: 'info',
                  message: data.message
                });
                break;
                
              case 'task_result':
                // Update current step
                setCurrentStep(data.task_number);
                
                // Format the task result for display
                const taskResult = formatTaskResult({
                  task_number: data.task_number,
                  task_title: data.task_title,
                  ...data.task_results
                });
                
                // Add to results state
                setResults(prevResults => {
                  // Replace if task already exists, otherwise add
                  const existingIndex = prevResults.findIndex(r => 
                    r.taskInfo && r.taskInfo.id === data.task_number
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
                  content: `Task ${data.task_number}: ${data.task_title}`,
                  timestamp: new Date().toISOString(),
                  fullResponse: {
                    task_number: data.task_number,
                    task_title: data.task_title,
                    ...data.task_results
                  }
                });
                
                addLog({
                  type: 'success',
                  message: `Completed task ${data.task_number}: ${data.task_title}`
                });
                break;
                
              case 'task_error':
                // Update current step anyway to show progress
                setCurrentStep(data.task_number);
                
                // Add error message
                addMessage({
                  role: 'system',
                  content: `Error in Task ${data.task_number}: ${data.error}`,
                  timestamp: new Date().toISOString(),
                  error: true
                });
                
                addLog({
                  type: 'error',
                  message: `Error in task ${data.task_number}: ${data.error}`
                });
                break;
                
              case 'complete':
                // All tasks completed successfully
                setIsGenerating(false);
                setIsStreaming(false);
                
                addMessage({
                  role: 'system',
                  content: 'Business idea generation completed successfully!',
                  timestamp: new Date().toISOString()
                });
                
                addLog({
                  type: 'success',
                  message: 'Generated Kompose business idea with all tasks'
                });
                break;
                
              case 'error':
                // Error occurred during generation
                setStreamError(data.error);
                setIsGenerating(false);
                setIsStreaming(false);
                
                addMessage({
                  role: 'system',
                  content: `Error generating business idea: ${data.error}`,
                  timestamp: new Date().toISOString(),
                  error: true
                });
                
                addLog({
                  type: 'error',
                  message: `Error generating business idea: ${data.error}`
                });
                break;
            }
          } catch (err) {
            console.error('Error parsing streaming response:', err, line);
          }
        }
      }
    } catch (error) {
      console.error('Error processing streaming response:', error);
      
      // Set error state and update UI
      setStreamError(error.message);
      setIsGenerating(false);
      setIsStreaming(false);
      
      addMessage({
        role: 'system',
        content: `Error processing results: ${error.message}`,
        timestamp: new Date().toISOString(),
        error: true
      });
      
      addLog({
        type: 'error',
        message: `Error processing results: ${error.message}`
      });
    } finally {
      setIsStreaming(false);
      readerRef.current = null;
      streamControllerRef.current = null;
    }
  };

  // Generate a business idea using streaming
  const generateIdea = async () => {
    if (isGenerating || isStreaming) return;
    
    // Reset previous results
    setResults([]);
    setCurrentStep(0);
    setStreamError(null);
    setIsGenerating(true);
    
    try {
      // Add a message showing generation is starting
      setMessageHistory([
        ...messageHistory,
        {
          role: 'user',
          content: userPrompt || 'Generate a complete business idea',
          timestamp: new Date().toISOString()
        }
      ]);
      
      addLog({
        type: 'info',
        message: 'Starting Kompose business idea generation with streaming'
      });
      
      // Call the API to generate the idea with streaming
      const stream = await api.streamKomposeIdea({
        userId,
        userPrompt: userPrompt || undefined
      });
      
      // Process the streaming response
      await processStreamingResponse(stream);
    } catch (error) {
      console.error('Error initiating streaming generation:', error);
      
      // Set error state and update UI
      setStreamError(error.message);
      setIsGenerating(false);
      
      // Add error message
      addMessage({
        role: 'system',
        content: `Error generating business idea: ${error.message}. Please try again.`,
        timestamp: new Date().toISOString(),
        error: true
      });
      
      addLog({
        type: 'error',
        message: `Error generating business idea: ${error.message}`
      });
    }
  };
  
  // View a block
  const viewBlock = () => {
    if (currentBlockId) {
      router.push(`/blocks/${currentBlockId}`);
    }
  };
  
  // Handle user prompt change
  const handlePromptChange = (e) => {
    setUserPrompt(e.target.value);
  };
  
  // Cancel generation
  const cancelGeneration = () => {
    if (isStreaming || isGenerating) {
      cleanupStream();
      setIsGenerating(false);
      
      addMessage({
        role: 'system',
        content: 'Business idea generation cancelled.',
        timestamp: new Date().toISOString()
      });
      
      addLog({
        type: 'warning',
        message: 'Business idea generation cancelled by user'
      });
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-gray-100">
      <Header 
        blockId={currentBlockId}
        handleNewChat={() => router.push('/kompose/generate')}
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
              <h2 className="text-xl font-semibold text-gray-800">One-Click Business Analysis Matrix Generator</h2>
              <p className="text-gray-600">Generate a complete business idea with all 18 analytical matrix tasks</p>
            </div>
          </div>
          
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
          </div>
          
          <div className="flex justify-center mb-6">
            {!isGenerating ? (
              <button
                onClick={generateIdea}
                className="px-6 py-3 rounded-lg text-black font-medium flex items-center gap-2 border border-black cursor-pointer bg-primary hover:bg-primary-dark"
              >
                <i className="fas fa-rocket"></i>
                Generate Business Analysis
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={cancelGeneration}
                  className="px-6 py-3 rounded-lg bg-red-500 text-white font-medium flex items-center gap-2 hover:bg-red-600"
                >
                  <i className="fas fa-stop"></i>
                  Cancel Generation
                </button>
                
                {currentBlockId && results.length > 0 && (
                  <button
                    onClick={viewBlock}
                    className="px-6 py-3 rounded-lg border border-primary text-primary hover:bg-primary/5 font-medium flex items-center gap-2"
                  >
                    <i className="fas fa-eye"></i>
                    View Results
                  </button>
                )}
              </div>
            )}
          </div>
          
          {isGenerating && (
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
            </div>
          )}
          
          {streamError && (
            <div className="p-4 mt-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <i className="fas fa-exclamation-circle"></i>
                <h3 className="font-medium">Generation Error</h3>
              </div>
              <p className="text-red-700">{streamError}</p>
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
          {isGenerating && isStreaming && currentStep < allTasks.length && <TypingIndicator />}
          
        </div>
      </div>
    </main>
  );
}
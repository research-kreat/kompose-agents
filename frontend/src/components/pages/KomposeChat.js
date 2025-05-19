'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/ui/Header';
import Message from '@/components/ui/Message';
import ChatInput from '@/components/ui/ChatInput';
import TypingIndicator from '@/components/ui/TypingIndicator';
import BlockSidebar from '@/components/ui/BlockSidebar';
import { useChatStore } from '@/store/chatStore';
import { api } from '@/lib/api';
import InfoPanel from '@/components/ui/InfoPanel';

export default function KomposeChat() {
  const [isClient, setIsClient] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  
  // Extract necessary state from the store
  const userId = useChatStore(state => state.userId);
  const messageHistory = useChatStore(state => state.messageHistory);
  const isTyping = useChatStore(state => state.isTyping);
  const currentBlockId = useChatStore(state => state.currentBlockId);
  const addMessage = useChatStore(state => state.addMessage);
  const addLog = useChatStore(state => state.addLog);
  const setIsTyping = useChatStore(state => state.setIsTyping);
  const setMessageHistory = useChatStore(state => state.setMessageHistory);
  const initializeUser = useChatStore(state => state.initializeUser);
  const resetStore = useChatStore(state => state.resetStore);
  const createNewBlock = useChatStore(state => state.createNewBlock);
  const setCurrentBlockId = useChatStore(state => state.setCurrentBlockId);
  
  // Handle block selection from sidebar
  const handleBlockSelect = (blockId) => {
    // Will be handled by the router, as BlockSidebar navigates to the block route
  };

  // Prevent hydration issues
  useEffect(() => {
    setIsClient(true);
    
    // Initialize user if needed
    initializeUser();
    
    // If there's no current block, create a new one
    if (!currentBlockId) {
      // Reset message history for new chat
      setMessageHistory([
        {
          role: 'system',
          content: 'Welcome to Kompose Interactive Mode. I can help you develop innovative business ideas through conversation. How would you like to start?',
          timestamp: new Date().toISOString()
        }
      ]);
      
      // Create a new block
      const newBlockId = createNewBlock('kompose', 'Kompose Chat');
      setCurrentBlockId(newBlockId);
    }
    
    // Cleanup on unmount
    return () => {
      // No need to reset store on unmount, as we want to persist state
    };
  }, []);

  // Handle sending a message
  const handleSendMessage = async (content) => {
    if (!content.trim()) return;
  
    // Add user message to chat
    const userMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    addMessage(userMessage);
  
    // Set typing indicator
    setIsTyping(true);
  
    try {
      // Call the API to get response
      const data = await api.analyzeBlock({
        message: content,
        userId,
        blockId: currentBlockId
      });
      
      // Extract response content
      let responseContent = '';
      let fullResponseData = {};
      
      if (data.response && typeof data.response === 'object') {
        // Store the full response data
        fullResponseData = data.response;
        
        if (data.response.suggestion) {
          responseContent = data.response.suggestion;
          
          // Display classification message if available
          if (data.response.classification_message) {
            addMessage({
              role: 'assistant',
              content: data.response.classification_message,
              timestamp: new Date().toISOString()
            });
          }
        } else if (data.response.analysis) {
          responseContent = `${data.response.analysis}\n\n${data.response.suggestion}`;
        } else {
          responseContent = JSON.stringify(data.response, null, 2);
        }
      } else if (data.response && typeof data.response === 'string') {
        responseContent = data.response;
        fullResponseData = { suggestion: data.response };
      } else {
        responseContent = "I'm not sure how to respond. Can you provide more details?";
        fullResponseData = { suggestion: responseContent };
      }
      
      // Add assistant's response to chat
      addMessage({
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toISOString(),
        fullResponse: fullResponseData
      });
      
      addLog({
        type: 'info',
        message: 'Received response from assistant'
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      addMessage({
        role: 'system',
        content: `Error: ${error.message}. Please try again.`,
        timestamp: new Date().toISOString(),
        error: true
      });
      
      addLog({
        type: 'error',
        message: `Error sending message: ${error.message}`
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Handle clearing the chat
  const handleClearChat = async () => {
    if (messageHistory.length > 1) {
      if (!confirm('Are you sure you want to clear this chat? This cannot be undone.')) {
        return;
      }
    }

    try {
      // Call API to clear the chat
      if (currentBlockId) {
        await api.clearBlock({ blockId: currentBlockId, userId });
      }
      
      // Reset message history
      setMessageHistory([
        {
          role: 'system',
          content: 'Chat cleared. What business idea would you like to explore?',
          timestamp: new Date().toISOString()
        }
      ]);
      
      addLog({
        type: 'system',
        message: 'Chat cleared'
      });
    } catch (error) {
      console.error('Error clearing chat:', error);
      
      addLog({
        type: 'error',
        message: `Error clearing chat: ${error.message}`
      });
    }
  };
  
  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };
  
  // Toggle info panel visibility
  const toggleInfoPanel = () => {
    setShowInfoPanel(!showInfoPanel);
  };

  if (!isClient) {
    return null; // Prevent hydration errors
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-100">
      <Header title="Kompose Interactive Mode" />
      
      <div className="flex-1 flex h-[calc(100vh-72px)]">
        {/* Sidebar with blocks */}
        {showSidebar && (
          <div className="w-64 flex-shrink-0">
            <BlockSidebar 
              onBlockSelect={handleBlockSelect} 
              blockType="kompose" 
            />
          </div>
        )}
        
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
              >
                <i className={`fas fa-${showSidebar ? 'times' : 'bars'}`}></i>
              </button>
              
              <i className="fas fa-comment text-xl text-primary"></i>
              <h2 className="text-lg font-medium text-gray-800">Interactive Business Ideation</h2>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={toggleInfoPanel}
                className="p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                title={showInfoPanel ? "Hide Info Panel" : "Show Info Panel"}
              >
                <i className="fas fa-info-circle"></i>
              </button>
              
              <button
                onClick={handleClearChat}
                disabled={messageHistory.length <= 1}
                className="p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                title="Clear Chat"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex">
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-gray-50">
              {/* Message history */}
              {messageHistory.map((message, index) => (
                <Message 
                  key={`${message.role}-${index}`}
                  message={message}
                  isLast={index === messageHistory.length - 1}
                />
              ))}
              
              {/* Typing indicator */}
              {isTyping && <TypingIndicator />}
            </div>
            
            {/* Info panel */}
            {showInfoPanel && (
              <div className="w-64 flex-shrink-0">
                <InfoPanel />
              </div>
            )}
          </div>
          
          <ChatInput 
            onSendMessage={handleSendMessage}
            disabled={isTyping || !currentBlockId}
          />
        </div>
      </div>
    </main>
  );
}
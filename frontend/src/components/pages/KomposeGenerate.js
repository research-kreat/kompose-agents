'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/ui/Header';
import Message from '@/components/ui/Message';
import ChatInput from '@/components/ui/ChatInput';
import TypingIndicator from '@/components/ui/TypingIndicator';
import { useChatStore } from '@/store/chatStore';
import { api } from '@/lib/api';

export default function KomposeChat() {
  const [isClient, setIsClient] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Extract necessary state from the store
  const userId = useChatStore(state => state.userId);
  const messageHistory = useChatStore(state => state.messageHistory);
  const isTyping = useChatStore(state => state.isTyping);
  const addMessage = useChatStore(state => state.addMessage);
  const addLog = useChatStore(state => state.addLog);
  const setIsTyping = useChatStore(state => state.setIsTyping);
  const setMessageHistory = useChatStore(state => state.setMessageHistory);
  const initializeUser = useChatStore(state => state.initializeUser);
  const resetStore = useChatStore(state => state.resetStore);

  // Prevent hydration issues
  useEffect(() => {
    setIsClient(true);
    // Initialize user if needed
    initializeUser();
    
    // Reset message history for new chat
    setMessageHistory([
      {
        role: 'system',
        content: 'Welcome to Kompose Interactive Mode. I can help you develop innovative business ideas through conversation. How would you like to start?',
        timestamp: new Date().toISOString()
      }
    ]);
    
    // Cleanup on unmount
    return () => {
      resetStore();
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messageHistory, isTyping]);

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
        userId
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
  const handleClearChat = () => {
    if (messageHistory.length > 1) {
      if (!confirm('Are you sure you want to clear this chat? This cannot be undone.')) {
        return;
      }
    }

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
  };

  if (!isClient) {
    return null; // Prevent hydration errors
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-100">
      <Header title="Kompose Interactive Mode" />
      
      <div className="flex-1 flex flex-col h-[calc(100vh-72px)]">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <i className="fas fa-comment text-xl text-primary"></i>
            <h2 className="text-lg font-medium text-gray-800">Interactive Business Ideation</h2>
          </div>
          
          <div className="flex gap-2">
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
          
          {/* Invisible element for scrolling */}
          <div ref={messagesEndRef} />
        </div>
        
        <ChatInput 
          onSendMessage={handleSendMessage}
          disabled={isTyping}
        />
      </div>
    </main>
  );
}
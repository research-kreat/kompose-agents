'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/ui/Header';
import BlockSidebar from '@/components/ui/BlockSidebar';
import BlockChatInterface from '@/components/ui/BlockChatInterface';
import InfoPanel from '@/components/ui/InfoPanel';
import { useChatStore } from '@/store/chatStore';

export default function BlockPage({ params }) {
  const { blockId } = params;
  const [showSidebar, setShowSidebar] = useState(true);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  
  // Access state from store
  const resetStore = useChatStore(state => state.resetStore);
  const setCurrentBlockId = useChatStore(state => state.setCurrentBlockId);
  const blockInfo = useChatStore(state => state.blockInfo);
  
  // Set current block on mount
  useEffect(() => {
    // Reset store to start fresh
    resetStore();
    
    // Set current block ID
    if (blockId) {
      setCurrentBlockId(blockId);
    }
    
    // Cleanup on unmount
    return () => {
      // No cleanup needed
    };
  }, [blockId]);
  
  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };
  
  // Toggle info panel visibility
  const toggleInfoPanel = () => {
    setShowInfoPanel(!showInfoPanel);
  };

  return (
    <main className="min-h-screen flex flex-col bg-gray-100">
      <Header 
        blockId={blockId}
        blockType={blockInfo?.type || 'kompose'}
      />
      
      <div className="flex-1 flex h-[calc(100vh-72px)]">
        {/* Sidebar with blocks */}
        {showSidebar && (
          <div className="w-64 flex-shrink-0">
            <BlockSidebar blockType="kompose" />
          </div>
        )}
        
        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-white flex justify-between">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
              >
                <i className={`fas fa-${showSidebar ? 'times' : 'bars'}`}></i>
              </button>
              
              <button
                onClick={toggleInfoPanel}
                className="p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                title={showInfoPanel ? "Hide Info Panel" : "Show Info Panel"}
              >
                <i className="fas fa-info-circle"></i>
              </button>
            </div>
            
            <div className="flex-1 flex">
              <div className="flex-1">
                <BlockChatInterface blockId={blockId} blockType={blockInfo?.type || 'kompose'} />
              </div>
              
              {/* Info panel */}
              {showInfoPanel && (
                <div className="w-64 flex-shrink-0">
                  <InfoPanel />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
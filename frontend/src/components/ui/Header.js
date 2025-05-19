'use client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { getBlockTypeInfo } from '@/lib/blockUtils';
import { useChatStore } from '@/store/chatStore';

export default function Header({ 
  blockId = null, 
  blockType = 'kompose'
}) {
  const router = useRouter();
  const [creatingBlock, setCreatingBlock] = useState(false);
  
  // Get store actions for creating blocks
  const createNewBlock = useChatStore(state => state.createNewBlock);
  const addLog = useChatStore(state => state.addLog);
  
  // Get block info using the utility function
  const blockInfo = getBlockTypeInfo(blockType);
  
  // Get page title based on type
  const getPageTitle = () => {
    return blockInfo ? blockInfo.title : 'Kompose';
  };
  
  // Get icon based on page type
  const getIcon = () => {
    return blockInfo ? blockInfo.icon : 'fa-lightbulb';
  };
  
  // Handle creating a new block
  const handleNewChat = async () => {
    try {
      setCreatingBlock(true);
      
      // Create a new block
      const newBlockId = await createNewBlock(blockType, `New ${getPageTitle()}`);
      
      // Add a slight delay to ensure the block is created properly before navigating
      setTimeout(() => {
        // Navigate to the new block
        router.push(`/blocks/${newBlockId}`);
        
        // Reset creation state
        setCreatingBlock(false);
      }, 300);
      
      addLog({
        type: 'success',
        message: `Created new ${blockType} block`
      });
    } catch (error) {
      console.error('Error creating new block:', error);
      
      addLog({
        type: 'error',
        message: `Error creating new block: ${error.message}`
      });
      
      setCreatingBlock(false);
    }
  };
  
  return (
    <header className="bg-white shadow-md py-4 px-6 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <motion.i 
          className={`fas ${getIcon()} text-2xl text-primary`}
          initial={{ rotate: -30 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.5 }}
        />
        <h1 className="text-xl font-semibold text-gray-800">Kompose</h1>
        <span className="text-sm text-gray-600 ml-2 border-l pl-3 border-gray-300">
          {getPageTitle()}
        </span>
      </div>
      
      <nav className="flex items-center">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-3 py-2 bg-transparent border border-gray-300 rounded-md text-gray-700 hover:bg-gray-200 transition duration-300"
        >
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </button>
        
        {blockId && (
          <div className="ml-4 flex items-center">
            <span className="text-gray-600 text-sm mr-3">
              Block: {blockId.substring(0, 8)}...
            </span>
            <button
              onClick={handleNewChat}
              disabled={creatingBlock}
              className={`px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm flex items-center gap-1 hover:bg-gray-300 transition duration-300 ${
                creatingBlock ? 'opacity-70 cursor-wait' : ''
              }`}
            >
              {creatingBlock ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i> Creating...
                </>
              ) : (
                <>
                  <i className="fas fa-plus"></i> New {getPageTitle()}
                </>
              )}
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
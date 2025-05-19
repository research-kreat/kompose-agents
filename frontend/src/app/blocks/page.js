'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/ui/Header';
import { useChatStore } from '@/store/chatStore';
import { api } from '@/lib/api';
import { getBlockTypeInfo } from '@/lib/blockUtils';

export default function BlocksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingBlock, setCreatingBlock] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  
  // Get user ID from store
  const userId = useChatStore(state => state.userId);
  const addLog = useChatStore(state => state.addLog);
  const resetStore = useChatStore(state => state.resetStore);
  const initializeUser = useChatStore(state => state.initializeUser);
  const createNewBlock = useChatStore(state => state.createNewBlock);
  
  // Initialize and load data
  useEffect(() => {
    // Reset store to start fresh
    resetStore();
    
    // Initialize user if needed
    const currentUserId = initializeUser();
    
    // Get blockType from query params
    const typeParam = searchParams?.get('type') || 'all';
    
    // Set the selected type
    setSelectedType(typeParam);
    
    // Ensure userId is available before fetching
    if (currentUserId) {
      // Load blocks
      fetchBlocks(typeParam);
    }
  }, [searchParams]);
  
  // Secondary effect to handle user ID initialization 
  // This ensures blocks are loaded even if user ID wasn't ready in the first useEffect
  useEffect(() => {
    if (userId && loading) {
      fetchBlocks(selectedType);
    }
  }, [userId]);
  
  // Fetch blocks from API
  const fetchBlocks = async (type = 'all') => {
    if (!userId) return;
    
    setLoading(true);
    
    try {
      console.log(`Fetching blocks of type: ${type}`);
      const data = await api.getBlocks({ 
        userId, 
        blockType: type,
        limit: 50 
      });
      
      setBlocks(data.blocks || []);
      
      addLog({
        type: 'info',
        message: `Loaded ${data.blocks?.length || 0} blocks`
      });
    } catch (error) {
      console.error('Error loading blocks:', error);
      
      addLog({
        type: 'error',
        message: `Error loading blocks: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle block deletion
  const handleDeleteBlock = async (e, blockId) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!confirm('Are you sure you want to delete this block? This cannot be undone.')) {
      return;
    }
    
    try {
      await api.deleteBlock({ blockId, userId });
      
      // Update blocks list
      setBlocks(blocks.filter(block => block.block_id !== blockId));
      
      addLog({
        type: 'info',
        message: `Deleted block: ${blockId.substring(0, 8)}`
      });
    } catch (error) {
      console.error('Error deleting block:', error);
      
      addLog({
        type: 'error',
        message: `Error deleting block: ${error.message}`
      });
    }
  };
  
  // Handle block click
  const handleBlockClick = (blockId) => {
    router.push(`/blocks/${blockId}`);
  };
  
  // Handle new block creation with automatic navigation
  const handleNewBlock = async () => {
    try {
      setCreatingBlock(true);
      
      // Create a new block - now an async operation
      const blockId = await createNewBlock('kompose', 'New Kompose Chat');
      router.push(`/blocks/${blockId}`);

      setCreatingBlock(false);
    } catch (error) {
      console.error('Error creating new block:', error);
      
      addLog({
        type: 'error',
        message: `Error creating new block: ${error.message}`
      });
      
      setCreatingBlock(false);
    }
  };
  
  // Handle filter change
  const handleFilterChange = (type) => {
    setSelectedType(type);
    router.push(`/blocks?type=${type}`);
  };
  
  // Force reload blocks when needed
  const handleRefreshBlocks = () => {
    if (userId) {
      fetchBlocks(selectedType);
    }
  };
  
  return (
    <main className="min-h-screen flex flex-col bg-gray-100">
      <Header title="Kompose Blocks" />
      
      <div className="p-6 flex-1">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Your Kompose Blocks</h1>
            
            <div className="flex gap-4">
              <div className="flex rounded-md overflow-hidden border border-gray-300">
                <button
                  className={`px-4 py-2 ${selectedType === 'all' ? 'bg-primary text-black' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                  onClick={() => handleFilterChange('all')}
                >
                  All
                </button>
                <button
                  className={`px-4 py-2 ${selectedType === 'kompose' ? 'bg-primary text-black' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                  onClick={() => handleFilterChange('kompose')}
                >
                  Kompose
                </button>
              </div>
              
              <button
                onClick={handleRefreshBlocks}
                className="px-4 py-2 bg-white text-gray-700 rounded-md hover:bg-gray-100 border border-gray-300 flex items-center gap-2"
                title="Refresh blocks"
              >
                <i className="fas fa-sync"></i>
              </button>
              
              <button
                onClick={handleNewBlock}
                disabled={creatingBlock}
                className={`px-4 py-2 bg-primary text-black rounded-md hover:bg-primary-dark flex items-center gap-2 ${
                  creatingBlock ? 'opacity-75 cursor-wait' : ''
                }`}
              >
                {creatingBlock ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin"></i>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus"></i>
                    New Block
                  </>
                )}
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-t-2 border-r-2 border-primary rounded-full animate-spin"></div>
            </div>
          ) : blocks.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
                <i className="fas fa-cube text-3xl text-gray-400"></i>
              </div>
              <h2 className="text-xl font-medium text-gray-700 mb-2">No blocks found</h2>
              <p className="text-gray-600 mb-6">Get started by creating a new Kompose block</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleNewBlock}
                  disabled={creatingBlock}
                  className={`px-6 py-3 bg-primary text-black rounded-md hover:bg-primary-dark flex items-center gap-2 ${
                    creatingBlock ? 'opacity-75 cursor-wait' : ''
                  }`}
                >
                  {creatingBlock ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin"></i>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plus"></i>
                      Create New Block
                    </>
                  )}
                </button>
                <button
                  onClick={handleRefreshBlocks}
                  className="px-6 py-3 bg-white text-gray-700 rounded-md hover:bg-gray-100 border border-gray-300"
                >
                  <i className="fas fa-sync mr-2"></i>
                  Refresh
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {blocks.map(block => {
                  const blockTypeInfo = getBlockTypeInfo(block.type);
                  const formattedDate = new Date(block.created_at).toLocaleString();
                  const displayName = block.name || `${block.type.charAt(0).toUpperCase() + block.type.slice(1)} ${block.block_id.substring(0, 8)}`;
                  
                  return (
                    <motion.div
                      key={block.block_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.3 }}
                      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleBlockClick(block.block_id)}
                    >
                      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full bg-${blockTypeInfo.color.replace('text-', '')}/10 flex items-center justify-center`}>
                            <i className={`fas ${blockTypeInfo.icon} ${blockTypeInfo.color}`}></i>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-800">{displayName}</h3>
                            <span className="text-xs text-gray-500">{block.type}</span>
                          </div>
                        </div>
                        <button
                          className="text-red-500 hover:text-red-700 p-2"
                          onClick={(e) => handleDeleteBlock(e, block.block_id)}
                          title="Delete Block"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Created</span>
                          <span>{formattedDate}</span>
                        </div>
                        <div className="text-xs bg-gray-100 rounded-md p-2 font-mono">
                          {block.block_id}
                        </div>
                        {block.is_local && (
                          <div className="mt-2 text-xs py-1 px-2 bg-yellow-100 text-yellow-800 rounded-md inline-flex items-center">
                            <i className="fas fa-exclamation-triangle mr-1"></i>
                            Local only
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
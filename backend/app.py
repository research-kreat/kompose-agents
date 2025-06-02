from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from datetime import datetime
import uuid
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import logging
import json, re
from helpers.global_helper import sanitize_response

# Import our block handler
from block_agents.kompose_block import KomposeBlockHandler

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# MongoDB configuration
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "KomposeAgentic")
client = MongoClient(MONGO_URI)
db = client[MONGO_DB_NAME]

# Collections
flow_collection = db.flow_status
history_collection = db.conversation_history
blocks_collection = db.blocks
one_click_collection = db.one_click_generations

# AI ENDPOINTS
@app.route('/api/stream-kompose-idea', methods=['POST'])
def stream_kompose_idea():
    """
    Stream a complete Kompose business idea with tasks as they complete
    """
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    # Create a new block ID
    block_id = str(uuid.uuid4())
    
    # Get user prompt if available
    user_prompt = data.get('user_prompt')
    
    # Initialize database records
    flow_status = {
        "user_id": user_id,
        "block_id": block_id,
        "initial_input": user_prompt,
        "flow_status": {},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    flow_collection.insert_one(flow_status)
    
    # Store user message in history
    history_collection.insert_one({
        "user_id": user_id,
        "block_id": block_id,
        "role": "user",
        "message": user_prompt,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    # Store block in blocks collection
    blocks_collection.insert_one({
        "block_id": block_id,
        "user_id": user_id,
        "name": "Kompose Business Idea",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    # Initialize one-click generation record
    one_click_collection.insert_one({
        "user_id": user_id,
        "block_id": block_id,
        "user_prompt": user_prompt,
        "status": "in_progress",
        "tasks_completed": 0,
        "tasks_total": 18,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    # Create a generator function to stream results
    def generate_results():
        # Initial response with block ID
        yield json.dumps({
            "type": "init",
            "block_id": block_id,
            "message": "Starting Kompose business idea generation"
        }) + '\n'
        
        # Initialize handler
        handler = KomposeBlockHandler(db, block_id, user_id)
        
        # Stream each task result individually
        try:
            # Get all tasks from handler
            tasks = handler.get_kompose_tasks(user_prompt)
            
            for i, task in enumerate(tasks):
                try:
                    # Execute individual task and measure time
                    start_time = datetime.utcnow()
                    
                    # Update status to show which task is being processed
                    one_click_collection.update_one(
                        {"block_id": block_id},
                        {
                            "$set": {
                                "current_task": i + 1,
                                "updated_at": start_time
                            }
                        }
                    )
                    
                    # Execute the task
                    result = handler.stream_kompose_task(i + 1, task, user_prompt)
                    
                    # Calculate processing time
                    end_time = datetime.utcnow()
                    processing_time = (end_time - start_time).total_seconds()
                    
                    # Try to parse JSON from the result
                    json_match = re.search(r'({.*})', result, re.DOTALL)
                    if json_match:
                        try:
                            result_data = json.loads(json_match.group(1))
                            # Add task number and title
                            result_data["task_number"] = i + 1
                            result_data["task_title"] = handler._get_task_title(i + 1)
                            result_data["processing_time"] = processing_time
                            
                            # Store each task result as a separate message
                            history_collection.insert_one({
                                "user_id": user_id,
                                "block_id": block_id,
                                "role": "assistant",
                                "message": f"Task {i+1}: {handler._get_task_title(i + 1)}",
                                "result": result_data,
                                "task_number": i + 1,
                                "created_at": datetime.utcnow(),
                                "updated_at": datetime.utcnow()
                            })
                            
                            # Update one_click_collection record with progress
                            one_click_collection.update_one(
                                {"block_id": block_id},
                                {
                                    "$set": {
                                        "tasks_completed": i + 1,
                                        "updated_at": datetime.utcnow()
                                    }
                                }
                            )
                            
                            # Stream the result
                            yield json.dumps({
                                "type": "task_result",
                                "task_number": i + 1,
                                "task_title": handler._get_task_title(i + 1),
                                "processing_time": processing_time,
                                "result": result_data
                            }) + '\n'
                            
                        except json.JSONDecodeError:
                            logger.error(f"Failed to parse JSON for task {i+1}: {result}")
                            # Stream error for this task
                            yield json.dumps({
                                "type": "task_error",
                                "task_number": i + 1,
                                "task_title": handler._get_task_title(i + 1),
                                "error": "Failed to parse result",
                                "raw_result": result
                            }) + '\n'
                    else:
                        logger.error(f"No JSON found in result for task {i+1}")
                        # Stream error for this task
                        yield json.dumps({
                            "type": "task_error",
                            "task_number": i + 1,
                            "task_title": handler._get_task_title(i + 1),
                            "error": "No JSON found in result",
                            "raw_result": result
                        }) + '\n'
                        
                except Exception as e:
                    logger.error(f"Error executing task {i+1}: {str(e)}")
                    # Stream error for this task
                    yield json.dumps({
                        "type": "task_error",
                        "task_number": i + 1,
                        "task_title": handler._get_task_title(i + 1),
                        "error": f"Error executing task: {str(e)}"
                    }) + '\n'
            
            # Update status to complete
            one_click_collection.update_one(
                {"block_id": block_id},
                {
                    "$set": {
                        "status": "complete",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Final completion message
            yield json.dumps({
                "type": "complete",
                "block_id": block_id,
                "message": "Kompose business idea generated successfully",
                "timestamp": datetime.utcnow().isoformat()
            }) + '\n'
            
        except Exception as e:
            logger.error(f"Error generating Kompose idea: {str(e)}")
            
            # Update status to failed
            one_click_collection.update_one(
                {"block_id": block_id},
                {
                    "$set": {
                        "status": "failed",
                        "error": str(e),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Stream error message
            yield json.dumps({
                "type": "error",
                "block_id": block_id,
                "error": str(e),
                "message": "Error generating Kompose idea"
            }) + '\n'
    
    # Return a streaming response
    return Response(generate_results(), mimetype='text/event-stream')

@app.route('/api/generate-kompose-idea', methods=['POST'])
def generate_kompose_idea():
    """
    Generate Kompose business idea tasks one at a time with a chat-like interface
    """
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    # Check if block_id is provided for continuing an existing generation
    block_id = data.get('block_id')
    user_prompt = data.get('user_prompt')
    
    # Initialize handler
    handler = KomposeBlockHandler(db, block_id, user_id)
    
    # If no block_id, create a new block
    if not block_id:
        # Create a new block ID
        block_id = str(uuid.uuid4())
        
        # Initialize flow status
        flow_status = {
            "user_id": user_id,
            "block_id": block_id,
            "initial_input": user_prompt,
            "flow_status": {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Store in MongoDB
        flow_collection.insert_one(flow_status)
        
        # Store user message in history
        if user_prompt:
            history_collection.insert_one({
                "user_id": user_id,
                "block_id": block_id,
                "role": "user",
                "message": user_prompt,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
        
        # Store block in blocks collection
        blocks_collection.insert_one({
            "block_id": block_id,
            "user_id": user_id,
            "name": "Kompose Business Idea",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        # Initialize one-click generation record
        one_click_record = {
            "user_id": user_id,
            "block_id": block_id,
            "user_prompt": user_prompt,
            "status": "in_progress",
            "tasks_completed": 0,
            "tasks_total": 18,
            "current_task": 1,  # Start with task 1
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        one_click_collection.insert_one(one_click_record)
        
        # Return new block information for the first task
        return jsonify({
            "block_id": block_id,
            "next_task": 1,
            "tasks_total": 18,
            "success": True,
            "message": "Ready to generate first task"
        })
    
    # Block ID exists, find the current state
    one_click_record = one_click_collection.find_one(
        {"block_id": block_id, "user_id": user_id},
        {'_id': 0}  # Exclude MongoDB _id
    )
    
    if not one_click_record:
        return jsonify({'error': 'Generation record not found'}), 404
    
    # Get the next task to generate
    tasks_completed = one_click_record.get('tasks_completed', 0)
    current_task = one_click_record.get('current_task', tasks_completed + 1)
    
    # Check if all tasks are completed
    if tasks_completed >= 18:
        return jsonify({
            "block_id": block_id,
            "success": True,
            "message": "All tasks have been completed",
            "completed": True
        })
    
    try:
        # Get all tasks (but we'll only execute one)
        all_tasks = handler.get_kompose_tasks(user_prompt)
        
        # Get just the current task to execute
        task_index = current_task - 1  # 0-based index
        if task_index < 0 or task_index >= len(all_tasks):
            return jsonify({'error': f'Invalid task index: {task_index}'}), 400
        
        current_task_def = all_tasks[task_index]
        
        # Start time
        start_time = datetime.utcnow()
        
        # Update status to show which task is being processed
        one_click_collection.update_one(
            {"block_id": block_id},
            {
                "$set": {
                    "current_task": current_task,
                    "updated_at": start_time,
                    "status": "in_progress"
                }
            }
        )
        
        # Execute the single task
        result = handler.stream_kompose_task(current_task, current_task_def, user_prompt)
        
        # Calculate processing time
        end_time = datetime.utcnow()
        processing_time = (end_time - start_time).total_seconds()
        
        # Try to parse JSON from the result
        json_match = re.search(r'({.*})', result, re.DOTALL)
        if json_match:
            try:
                result_data = json.loads(json_match.group(1))
                # Add task number and title
                result_data["task_number"] = current_task
                result_data["task_title"] = handler._get_task_title(current_task)
                result_data["processing_time"] = processing_time
                
                # Store task result as a message
                history_collection.insert_one({
                    "user_id": user_id,
                    "block_id": block_id,
                    "role": "assistant",
                    "message": f"Task {current_task}: {handler._get_task_title(current_task)}",
                    "result": result_data,
                    "task_number": current_task,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                })
                
                # Update one_click_collection record with progress
                one_click_collection.update_one(
                    {"block_id": block_id},
                    {
                        "$set": {
                            "tasks_completed": tasks_completed + 1,
                            "current_task": current_task + 1,  # Prepare for next task
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                # Check if all tasks are now completed
                is_complete = (tasks_completed + 1) >= 18
                if is_complete:
                    one_click_collection.update_one(
                        {"block_id": block_id},
                        {
                            "$set": {
                                "status": "complete",
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )
                
                return jsonify({
                    "block_id": block_id,
                    "task_number": current_task,
                    "task_title": handler._get_task_title(current_task),
                    "processing_time": processing_time,
                    "task_result": result_data,
                    "next_task": current_task + 1 if not is_complete else None,
                    "completed": is_complete,
                    "success": True
                })
                
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON for task {current_task}: {result}")
                error_message = "Failed to parse result"
                
                # Store error in history
                history_collection.insert_one({
                    "user_id": user_id,
                    "block_id": block_id,
                    "role": "assistant",
                    "message": f"Error in Task {current_task}: {error_message}",
                    "error": error_message,
                    "task_number": current_task,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                })
                
                return jsonify({
                    "block_id": block_id,
                    "task_number": current_task,
                    "task_title": handler._get_task_title(current_task),
                    "error": error_message,
                    "raw_result": result,
                    "success": False
                }), 500
        else:
            logger.error(f"No JSON found in result for task {current_task}")
            error_message = "No JSON found in result"
            
            # Store error in history
            history_collection.insert_one({
                "user_id": user_id,
                "block_id": block_id,
                "role": "assistant",
                "message": f"Error in Task {current_task}: {error_message}",
                "error": error_message,
                "task_number": current_task,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            
            return jsonify({
                "block_id": block_id,
                "task_number": current_task,
                "task_title": handler._get_task_title(current_task),
                "error": error_message,
                "raw_result": result,
                "success": False
            }), 500
            
    except Exception as e:
        logger.error(f"Error generating task {current_task}: {str(e)}")
        
        # Store error in history
        history_collection.insert_one({
            "user_id": user_id,
            "block_id": block_id,
            "role": "assistant",
            "message": f"Error in Task {current_task}: {str(e)}",
            "error": str(e),
            "task_number": current_task,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        return jsonify({
            "block_id": block_id,
            "task_number": current_task,
            "task_title": handler._get_task_title(current_task),
            "error": str(e),
            "success": False
        }), 500
      
# DATABASE ENDPOINTS
@app.route('/api/blocks', methods=['GET'])
def get_blocks():
    """
    Get blocks for a user
    """
    user_id = request.args.get('user_id')
    limit = int(request.args.get('limit', 10))
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    # Query to find blocks for the user
    query = {"user_id": user_id}
    
    # Find blocks in MongoDB
    blocks = list(blocks_collection.find(
        query,
        {'_id': 0}  # Exclude MongoDB _id
    ).sort("created_at", -1).limit(limit))
    
    return jsonify({
        "blocks": blocks
    })

@app.route('/api/blocks/<block_id>', methods=['GET'])
def get_block(block_id):
    """
    Get a specific block and its messages
    """
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    # Find block in MongoDB
    block = blocks_collection.find_one(
        {"block_id": block_id, "user_id": user_id},
        {'_id': 0}  # Exclude MongoDB _id
    )
    
    if not block:
        return jsonify({'error': 'Block not found'}), 404
    
    # Find messages for the block
    messages = list(history_collection.find(
        {"block_id": block_id, "user_id": user_id},
        {'_id': 0}  # Exclude MongoDB _id
    ).sort("created_at", 1))
    
    return jsonify({
        "block": block,
        "messages": messages
    })

@app.route('/api/blocks/<block_id>', methods=['DELETE'])
def delete_block(block_id):
    """
    Delete a block and its messages
    """
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    # Delete block from MongoDB
    block_result = blocks_collection.delete_one({"block_id": block_id, "user_id": user_id})
    
    if block_result.deleted_count == 0:
        return jsonify({'error': 'Block not found'}), 404
    
    # Delete messages for the block
    history_collection.delete_many({"block_id": block_id, "user_id": user_id})
    
    # Delete flow status for the block
    flow_collection.delete_many({"block_id": block_id, "user_id": user_id})
    
    # Delete one-click generation record if exists
    one_click_collection.delete_many({"block_id": block_id, "user_id": user_id})
    
    return jsonify({
        "success": True,
        "message": "Block and associated data deleted successfully"
    })

@app.route('/api/blocks/<block_id>/clear', methods=['POST'])
def clear_block(block_id):
    """
    Clear messages for a block
    """
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    # Check if block exists
    block = blocks_collection.find_one({"block_id": block_id, "user_id": user_id})
    
    if not block:
        return jsonify({'error': 'Block not found'}), 404
    
    # Delete messages for the block
    history_collection.delete_many({"block_id": block_id, "user_id": user_id})
    
    # Update flow status to empty
    flow_collection.update_one(
        {"block_id": block_id, "user_id": user_id},
        {
            "$set": {
                "flow_status": {},
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return jsonify({
        "success": True,
        "message": "Messages cleared successfully"
    })

@app.route('/api/blocks/new', methods=['POST'])
def create_block():
    """
    Create a new block
    """
    data = request.json
    user_id = data.get('user_id')
    name = data.get('name', 'New Kompose Block')
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    # Create a new block ID
    block_id = str(uuid.uuid4())
    
    # Create block in MongoDB
    block = {
        "block_id": block_id,
        "user_id": user_id,
        "name": name,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    blocks_collection.insert_one(block)
    
    # Initialize flow status
    flow_status = {
        "user_id": user_id,
        "block_id": block_id,
        "initial_input": "",
        "flow_status": {},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    flow_collection.insert_one(flow_status)
    
    # Set _id to None for response
    block["_id"] = None
    
    return jsonify({
        "success": True,
        "message": "Block created successfully",
        "block": block
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001)
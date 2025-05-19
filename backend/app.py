from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import uuid
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import logging
import json
from helpers.global_helper import sanitize_response

# Import our block handlers
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

@app.route('/api/analyze', methods=['POST'])
def analyze_message():
    """
    Endpoint for analyzing a new message and creating a new block
    """
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    # Get user input
    user_input = data.get('message', '')
    
    # Create a new block ID
    block_id = str(uuid.uuid4())
    
    # Initialize flow status
    flow_status = {
        "user_id": user_id,
        "block_id": block_id,
        "block_type": "kompose",
        "initial_input": user_input,
        "flow_status": {},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Store in MongoDB
    flow_collection.insert_one(flow_status)
    
    # Store user message in history
    history_collection.insert_one({
        "user_id": user_id,
        "block_id": block_id,
        "role": "user",
        "message": user_input,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    # Store block in blocks collection
    blocks_collection.insert_one({
        "block_id": block_id,
        "user_id": user_id,
        "type": "kompose",
        "name": "Kompose Chat",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    # Initialize handler
    handler = KomposeBlockHandler(db, block_id, user_id)
    
    # Initialize the block with user input
    response = handler.initialize_block(user_input)
    
    # Sanitize response to ensure plain text
    response = sanitize_response(response)
    
    # Store assistant response in history
    history_collection.insert_one({
        "user_id": user_id,
        "block_id": block_id,
        "role": "assistant",
        "message": response.get("suggestion", ""),
        "result": response,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    return jsonify({
        "block_id": block_id,
        "block_type": "kompose",
        "response": response
    })

@app.route('/api/analyze_block', methods=['POST'])
def analyze_block():
    """
    Endpoint for continuing conversation with an existing block
    """
    data = request.json
    user_id = data.get('user_id')
    block_id = data.get('block_id')
    
    if not user_id or not block_id:
        return jsonify({'error': 'user_id and block_id are required'}), 400
    
    # Get user input
    user_input = data.get('message', '')
    
    # Fetch flow status
    flow_data = flow_collection.find_one({"block_id": block_id, "user_id": user_id})
    
    if not flow_data:
        return jsonify({'error': 'Block not found'}), 404
    
    # Store user message in history
    history_collection.insert_one({
        "user_id": user_id,
        "block_id": block_id,
        "role": "user",
        "message": user_input,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    # Get handler
    handler = KomposeBlockHandler(db, block_id, user_id)
    
    # Process the message with improved history utilization
    response = handler.process_message(user_input, flow_data.get("flow_status", {}))
    
    # Sanitize response to ensure plain text
    response = sanitize_response(response)
    
    # If it's identified as a greeting, handle it appropriately
    if response.get("identified_as") == "greeting":
        greeting_message = response.get("greeting_response")
        
        # Store assistant response in history
        history_collection.insert_one({
            "user_id": user_id,
            "block_id": block_id,
            "role": "assistant",
            "message": greeting_message,
            "result": response,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        return jsonify({
            "block_id": block_id,
            "block_type": "kompose",
            "response": {
                "suggestion": greeting_message
            }
        })
    else:
        # Get the suggestion for the message content
        suggestion = response.get("suggestion", "")
        
        # Store assistant response in history with full context
        history_collection.insert_one({
            "user_id": user_id,
            "block_id": block_id,
            "role": "assistant",
            "message": suggestion,
            "result": response,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        # Return a JSON-compatible response
        return jsonify({
            "block_id": block_id,
            "block_type": "kompose",
            "response": response
        })

@app.route('/api/generate-kompose-idea', methods=['POST'])
def generate_kompose_idea():
    """
    Generate a complete Kompose business idea with 18 tasks
    """
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    # Create a new block ID
    block_id = str(uuid.uuid4())
    
    # Get user prompt if available
    user_prompt = data.get('user_prompt')
    
    # Initialize flow status
    flow_status = {
        "user_id": user_id,
        "block_id": block_id,
        "block_type": "kompose",
        "initial_input": user_prompt,
        "flow_status": {},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Store in MongoDB
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
        "type": "kompose",
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
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    one_click_collection.insert_one(one_click_record)
    
    # Initialize handler
    handler = KomposeBlockHandler(db, block_id, user_id)
    
    # Generate the Kompose idea
    try:
        results = handler.generate_kompose_idea(user_prompt)
        
        # Store the results in history
        for i, result in enumerate(results):
            # Store each task result as a separate message
            history_collection.insert_one({
                "user_id": user_id,
                "block_id": block_id,
                "role": "assistant",
                "message": f"Task {i+1}: {result.get('task_title', 'Task')}",
                "result": result,
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
        
        return jsonify({
            "block_id": block_id,
            "block_type": "kompose",
            "results": results,
            "success": True,
            "message": "Kompose business idea generated successfully"
        })
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
        
        # Store error message in history
        history_collection.insert_one({
            "user_id": user_id,
            "block_id": block_id,
            "role": "assistant",
            "message": f"Error generating Kompose idea: {str(e)}",
            "error": str(e),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        return jsonify({
            "block_id": block_id,
            "block_type": "kompose",
            "error": str(e),
            "success": False,
            "message": "Error generating Kompose idea"
        }), 500

@app.route('/api/get-generation-status', methods=['GET'])
def get_generation_status():
    """
    Get the status of a one-click generation
    """
    block_id = request.args.get('block_id')
    user_id = request.args.get('user_id')
    
    if not block_id or not user_id:
        return jsonify({'error': 'block_id and user_id are required'}), 400
    
    # Find the generation status
    status = one_click_collection.find_one({"block_id": block_id, "user_id": user_id})
    
    if not status:
        return jsonify({'error': 'Generation not found'}), 404
    
    # Format the response
    response = {
        "block_id": status["block_id"],
        "user_id": status["user_id"],
        "status": status["status"],
        "tasks_completed": status["tasks_completed"],
        "tasks_total": status["tasks_total"],
        "created_at": status["created_at"],
        "updated_at": status["updated_at"]
    }
    
    # Add error if available
    if "error" in status:
        response["error"] = status["error"]
    
    return jsonify(response)

@app.route('/api/blocks', methods=['GET'])
def get_blocks():
    """
    Get blocks for a user
    """
    user_id = request.args.get('user_id')
    block_type = request.args.get('type', 'all')
    limit = int(request.args.get('limit', 10))
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    # Query to find blocks for the user
    query = {"user_id": user_id}
    
    # Add type filter if specified
    if block_type != 'all':
        query["type"] = block_type
    
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
    block_type = data.get('type', 'kompose')
    name = data.get('name', f'New {block_type.capitalize()} Block')
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    # Create a new block ID
    block_id = str(uuid.uuid4())
    
    # Create block in MongoDB
    block = {
        "block_id": block_id,
        "user_id": user_id,
        "type": block_type,
        "name": name,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    blocks_collection.insert_one(block)
    
    # Initialize flow status
    flow_status = {
        "user_id": user_id,
        "block_id": block_id,
        "block_type": block_type,
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
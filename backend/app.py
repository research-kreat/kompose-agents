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

# Block handler mapping
block_handlers = {
    "kompose": KomposeBlockHandler
}

# Standard flow steps for all block types in the correct order
STANDARD_FLOW_STEPS = [
]

@app.route('/api/analyze', methods=['POST'])
def analyze_general_chat():
    """
    Endpoint for general chat that creates a new block
    """
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    # Get user input
    user_input = data.get('message', '')
    
    # Create a new block ID
    block_id = str(uuid.uuid4())
    
    # Initialize flow status with standard steps in the correct order
    flow_status = {
        "user_id": user_id,
        "block_id": block_id,
        "block_type": "kompose",
        "initial_input": user_input,
        "flow_status": {step: False for step in STANDARD_FLOW_STEPS},
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
        "name": "New Kompose Block",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    # Initialize kompose handler
    handler = KomposeBlockHandler(db, block_id, user_id)
    
    # Get initial response
    response = handler.initialize_block(user_input)
    
    # Sanitize response to ensure plain text
    response = sanitize_response(response)
    
    # If it's identified as a greeting, we need to handle it differently
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
        # For non-greeting messages, use the classification and suggestion directly
        classification_msg = response.get("classification_message", "")
        suggestion = response.get("suggestion", "")
        
        # Store assistant response in history
        history_collection.insert_one({
            "user_id": user_id,
            "block_id": block_id,
            "role": "assistant",
            "message": f"{classification_msg}\n\n{suggestion}",
            "result": response,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        # Return the response
        return jsonify({
            "block_id": block_id,
            "block_type": "kompose",
            "response": {
                "suggestion": suggestion,
                "classification_message": classification_msg
            }
        })
    
@app.route('/api/analysis_of_block', methods=['POST'])
def analyze_existing_block():
    """
    Enhanced endpoint for continuing conversation with an existing block
    Uses improved history retention and context awareness
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
    response = handler.process_message(user_input, flow_data["flow_status"])
    
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
    
    # Initialize flow status
    flow_status = {
        "user_id": user_id,
        "block_id": block_id,
        "block_type": "kompose",
        "initial_input": "Kompose Business Idea Generation",
        "flow_status": {step: False for step in STANDARD_FLOW_STEPS},
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
        "message": "Generate a Kompose business idea",
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
    
    # Initialize handler
    handler = KomposeBlockHandler(db, block_id, user_id)
    
    # Process any uploaded data from the client
    uploaded_data = data.get('uploaded_data')
    
    # Generate the Kompose idea
    try:
        results = handler.generate_kompose_idea(uploaded_data)
        
        # Store the results in history
        for i, result in enumerate(results):
            # Store each task result as a separate message
            history_collection.insert_one({
                "user_id": user_id,
                "block_id": block_id,
                "role": "assistant",
                "message": f"Task {i+1}: {json.dumps(result, indent=2)}",
                "result": result,
                "task_number": i + 1,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
        
        return jsonify({
            "block_id": block_id,
            "block_type": "kompose",
            "results": results,
            "success": True,
            "message": "Kompose business idea generated successfully"
        })
    except Exception as e:
        logger.error(f"Error generating Kompose idea: {str(e)}")
        
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
    
    # Build query
    query = {"user_id": user_id}
    if block_type != 'all':
        query["type"] = block_type
    
    # Fetch blocks from database
    blocks = list(blocks_collection.find(
        query,
        {'_id': 0}
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
    
    # Fetch block from database
    block = blocks_collection.find_one(
        {"block_id": block_id, "user_id": user_id},
        {'_id': 0}
    )
    
    if not block:
        return jsonify({'error': 'Block not found'}), 404
    
    # Fetch messages for this block
    messages = list(history_collection.find(
        {"block_id": block_id, "user_id": user_id},
        {'_id': 0, 'user_id': 0, 'block_id': 0}
    ).sort("created_at", 1))  # Sort chronologically (oldest first)
    
    # Sanitize message content to ensure plain text
    for message in messages:
        if 'message' in message:
            message['message'] = sanitize_response(message['message'])
    
    return jsonify({
        "block": block,
        "messages": messages
    })

@app.route('/api/blocks/<block_id>', methods=['DELETE'])
def delete_block(block_id):
    """
    Delete a block and all its messages
    """
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    # Delete block
    blocks_collection.delete_one({"block_id": block_id, "user_id": user_id})
    
    # Delete flow status
    flow_collection.delete_one({"block_id": block_id, "user_id": user_id})
    
    # Delete messages
    history_collection.delete_many({"block_id": block_id, "user_id": user_id})
    
    return jsonify({
        "success": True,
        "message": "Block deleted successfully"
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
    
    # Delete messages
    history_collection.delete_many({"block_id": block_id, "user_id": user_id})
    
    # Reset flow status to match standard flow
    flow_collection.update_one(
        {"block_id": block_id, "user_id": user_id},
        {"$set": {
            "flow_status": {step: False for step in STANDARD_FLOW_STEPS},
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Add system message
    history_collection.insert_one({
        "user_id": user_id,
        "block_id": block_id,
        "role": "system",
        "message": "Chat cleared. What's on your mind?",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    return jsonify({
        "success": True,
        "message": "Block cleared successfully"
    })

@app.route('/api/blocks/new', methods=['POST'])
def create_new_block():
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
    
    # Initialize flow status with standard steps in the correct order
    flow_status = {
        "user_id": user_id,
        "block_id": block_id,
        "block_type": "kompose",
        "initial_input": "",
        "flow_status": {step: False for step in STANDARD_FLOW_STEPS},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Store in MongoDB
    flow_collection.insert_one(flow_status)
    
    # Store block in blocks collection
    blocks_collection.insert_one({
        "block_id": block_id,
        "user_id": user_id,
        "type": "kompose",
        "name": name,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    # Add welcome message
    welcome_msg = "Welcome! I can help you generate innovative startup ideas and actionable business plans. How would you like to start?"
    
    history_collection.insert_one({
        "user_id": user_id,
        "block_id": block_id,
        "role": "system",
        "message": welcome_msg,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    return jsonify({
        "block_id": block_id,
        "block_type": "kompose",
        "name": name,
        "created_at": datetime.utcnow().isoformat()
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001)
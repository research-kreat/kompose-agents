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

@app.route('/api/analysis_of_block', methods=['POST'])
def analyze_existing_block():
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
    
    # Initialize flow status
    flow_status = {
        "user_id": user_id,
        "block_id": block_id,
        "block_type": "kompose",
        "initial_input": "Kompose Business Idea Generation",
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
    
    # Generate the Kompose idea
    try:
        results = handler.generate_kompose_idea()
        
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

if __name__ == '__main__':
    app.run(debug=True, port=5001)
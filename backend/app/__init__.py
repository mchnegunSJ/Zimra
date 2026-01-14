from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# Define db globally to prevent circular imports
db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')
    
    # Enable CORS for all domains
    CORS(app)
    
    # Connect Database
    db.init_app(app)
    
    with app.app_context():
        # Import parts of our application
        from .routes import api_bp
        from . import models
        
        # --- THE FIX: Register routes with '/api' prefix ---
        app.register_blueprint(api_bp, url_prefix='/api')
        
        # Create Tables
        db.create_all()
        
    return app
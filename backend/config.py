import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-lithi-trust'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///fiscal.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # --- CHANGE THIS URL ---
    # Old: "https://fdmsapitest.zimra.co.zw/Device/v1"
    # New: Your Local Mock Server
    ZIMRA_API_URL = "http://localhost:4000/Device/v1"
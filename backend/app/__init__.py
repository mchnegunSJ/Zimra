from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from .models import db
from .routes import api_bp


def create_app(config_object: str = 'config.Config') -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_object)

    # Ensure instance folder exists (for fiscal.db)
    from pathlib import Path
    Path(app.instance_path).mkdir(parents=True, exist_ok=True)

    # Extensions
    db.init_app(app)
    CORS(app)

    # Blueprints
    app.register_blueprint(api_bp, url_prefix='/api')

    @app.get('/health')
    def health() -> dict:
        return {'status': 'ok'}

    return app

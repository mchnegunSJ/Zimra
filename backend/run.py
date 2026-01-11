from app import create_app, db
from app.models import DeviceConfig, Receipt


app = create_app()


@app.before_first_request
def create_tables() -> None:
    db.create_all()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

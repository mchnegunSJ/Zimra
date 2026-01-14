from app import create_app

app = create_app()

if __name__ == '__main__':
    # The application factory in __init__.py already handles db.create_all()
    app.run(debug=True, port=5000)
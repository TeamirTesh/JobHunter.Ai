from backend.app import create_app

# Expose a callable for Flask CLI / Flask-Migrate
app = create_app()

# Allow running the app directly
if __name__ == "__main__":
    app.run(debug=True)

from app.core.database import engine
from app.models.commute import Commute


def main() -> None:
    Commute.metadata.create_all(bind=engine)
    print("Database tables are ready.")


if __name__ == "__main__":
    main()

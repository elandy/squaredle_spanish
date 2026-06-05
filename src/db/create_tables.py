from src.db.database import Base, engine

import src.db.models

print(Base.metadata.tables.keys())

Base.metadata.create_all(bind=engine)

print("done")
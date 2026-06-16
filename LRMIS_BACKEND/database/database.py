import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient as MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

if not MONGO_URI or not DB_NAME:
    raise Exception("Missing MONGO_URI or DB_NAME in .env")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

def get_database():
    return db
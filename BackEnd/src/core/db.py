from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from src.core.config import get_settings


class MongoState:
    client: AsyncIOMotorClient | None = None
    database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    settings = get_settings()
    MongoState.client = AsyncIOMotorClient(settings.mongodb_uri)
    MongoState.database = MongoState.client[settings.mongodb_db_name]
    await _ensure_indexes()


async def close_mongo_connection() -> None:
    if MongoState.client is not None:
        MongoState.client.close()
        MongoState.client = None
        MongoState.database = None


def get_database() -> AsyncIOMotorDatabase:
    if MongoState.database is None:
        raise RuntimeError("Mongo nao foi inicializado. Chame connect_to_mongo no startup.")
    return MongoState.database


async def _ensure_indexes() -> None:
    db = get_database()
    await db["users"].create_index("email", unique=True)
    await db["linked_accounts"].create_index(
        [("user_id", 1), ("provider", 1)], unique=True
    )
    await db["transfers"].create_index([("user_id", 1), ("created_at", -1)])

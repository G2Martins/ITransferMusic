from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.models.review import ReviewDocument


class ReviewService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._collection = db["reviews"]
        self._users = db["users"]

    async def create(
        self, user_id: str, rating: int, comment: str | None
    ) -> ReviewDocument:
        user = await self._users.find_one({"_id": ObjectId(user_id)})
        name = (user or {}).get("name", "Usuario")
        doc = ReviewDocument(
            user_id=ObjectId(user_id),
            user_name=name,
            rating=rating,
            comment=comment,
        )
        # Upsert: cada user tem 1 review (atualiza se ja existe)
        await self._collection.update_one(
            {"user_id": ObjectId(user_id)},
            {"$set": doc.to_mongo()},
            upsert=True,
        )
        saved = await self._collection.find_one({"user_id": ObjectId(user_id)})
        return ReviewDocument.model_validate(saved)

    async def list_latest(self, limit: int = 30) -> list[ReviewDocument]:
        cursor = self._collection.find().sort("created_at", -1).limit(limit)
        return [ReviewDocument.model_validate(d) async for d in cursor]

    async def get_mine(self, user_id: str) -> ReviewDocument | None:
        doc = await self._collection.find_one({"user_id": ObjectId(user_id)})
        if not doc:
            return None
        return ReviewDocument.model_validate(doc)

    async def stats(self) -> tuple[int, float, dict[int, int]]:
        cursor = self._collection.find({}, {"rating": 1})
        total = 0
        sum_rating = 0
        distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        async for d in cursor:
            r = int(d.get("rating", 0))
            if 1 <= r <= 5:
                total += 1
                sum_rating += r
                distribution[r] = distribution.get(r, 0) + 1
        avg = round(sum_rating / total, 2) if total else 0.0
        return total, avg, distribution
